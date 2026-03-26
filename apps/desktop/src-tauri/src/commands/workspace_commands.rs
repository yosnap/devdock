use crate::models::{CreateWorkspacePayload, UpdateWorkspacePayload, Workspace};
use crate::services::db_service::DbState;
use crate::sync::sync_queue;
use chrono::Utc;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

/// List all workspaces ordered by sort_order
#[tauri::command]
pub async fn list_workspaces(db: State<'_, DbState>) -> Result<Vec<Workspace>, String> {
    let rows = sqlx::query(
        "SELECT id, name, color, icon, avatar, sort_order, created_at FROM workspaces ORDER BY sort_order ASC"
    )
    .fetch_all(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(rows
        .iter()
        .map(|row| Workspace {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            icon: row.get("icon"),
            avatar: row.get("avatar"),
            sort_order: row.get("sort_order"),
            created_at: row.get("created_at"),
        })
        .collect())
}

/// Create a new workspace
#[tauri::command]
pub async fn create_workspace(
    payload: CreateWorkspacePayload,
    db: State<'_, DbState>,
) -> Result<Workspace, String> {
    let pool = &db.0;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let sort_order: i32 =
        sqlx::query_scalar("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM workspaces")
            .fetch_one(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?;

    sqlx::query(
        "INSERT INTO workspaces (id, name, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&payload.color)
    .bind(&payload.icon)
    .bind(sort_order)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create workspace: {e}"))?;

    // Enqueue for cloud sync
    {
        let pool_clone = pool.clone();
        let id_clone = id.clone();
        let name_for_sync = payload.name.clone();
        let color_for_sync = payload.color.clone();
        let icon_for_sync = payload.icon.clone();
        let now_for_sync = now.clone();
        tokio::spawn(async move {
            let user_id: String = sqlx::query_scalar(
                "SELECT COALESCE((SELECT value FROM app_preferences WHERE key='user_id'),'')"
            )
            .fetch_one(&pool_clone)
            .await
            .unwrap_or_default();

            let ws_json = serde_json::json!({
                "id": &id_clone, "user_id": user_id,
                "name": name_for_sync, "color": color_for_sync,
                "icon": icon_for_sync, "sort_order": sort_order, "created_at": now_for_sync,
            });
            let _ = sync_queue::enqueue(
                &pool_clone, "workspaces", &id_clone,
                "INSERT", Some(ws_json.to_string()),
            ).await;
        });
    }

    Ok(Workspace {
        id,
        name: payload.name,
        color: payload.color,
        icon: payload.icon,
        avatar: None,
        sort_order,
        created_at: now,
    })
}

/// Update a workspace
#[tauri::command]
pub async fn update_workspace(
    payload: UpdateWorkspacePayload,
    db: State<'_, DbState>,
) -> Result<Workspace, String> {
    let pool = &db.0;

    sqlx::query(
        r#"UPDATE workspaces SET
           name = COALESCE(?, name),
           color = COALESCE(?, color),
           icon = COALESCE(?, icon),
           sort_order = COALESCE(?, sort_order)
           WHERE id = ?"#,
    )
    .bind(&payload.name)
    .bind(&payload.color)
    .bind(&payload.icon)
    .bind(payload.sort_order)
    .bind(&payload.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update workspace: {e}"))?;

    let row = sqlx::query(
        "SELECT id, name, color, icon, avatar, sort_order, created_at FROM workspaces WHERE id = ?"
    )
    .bind(&payload.id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    let ws = Workspace {
        id: row.get("id"),
        name: row.get("name"),
        color: row.get("color"),
        icon: row.get("icon"),
        avatar: row.get("avatar"),
        sort_order: row.get("sort_order"),
        created_at: row.get("created_at"),
    };

    // Enqueue for cloud sync
    {
        let pool_clone = pool.clone();
        let record_id = ws.id.clone();
        let ws_name = ws.name.clone();
        let ws_color = ws.color.clone();
        let ws_icon = ws.icon.clone();
        let ws_sort_order = ws.sort_order;
        let ws_created_at = ws.created_at.clone();
        tokio::spawn(async move {
            let user_id: String = sqlx::query_scalar(
                "SELECT COALESCE((SELECT value FROM app_preferences WHERE key='user_id'),'')"
            )
            .fetch_one(&pool_clone)
            .await
            .unwrap_or_default();

            let ws_json = serde_json::json!({
                "id": &record_id, "user_id": user_id,
                "name": ws_name, "color": ws_color,
                "icon": ws_icon, "sort_order": ws_sort_order,
                "created_at": ws_created_at,
            });
            let _ = sync_queue::enqueue(
                &pool_clone, "workspaces", &record_id,
                "UPDATE", Some(ws_json.to_string()),
            ).await;
        });
    }

    Ok(ws)
}

/// Delete a workspace (projects become workspace-less)
#[tauri::command]
pub async fn delete_workspace(id: String, db: State<'_, DbState>) -> Result<(), String> {
    sqlx::query("DELETE FROM workspaces WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| format!("Failed to delete workspace: {e}"))?;

    // Enqueue soft-delete
    {
        let pool_clone = db.0.clone();
        let record_id = id.clone();
        tokio::spawn(async move {
            let _ = sync_queue::enqueue(
                &pool_clone, "workspaces", &record_id,
                "DELETE", Some(record_id.clone()),
            ).await;
        });
    }

    Ok(())
}

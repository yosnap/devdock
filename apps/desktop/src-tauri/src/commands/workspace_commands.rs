use crate::models::{CreateWorkspacePayload, UpdateWorkspacePayload, Workspace};
use crate::services::db_service::DbState;
use chrono::Utc;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

/// List all workspaces ordered by sort_order
#[tauri::command]
pub async fn list_workspaces(db: State<'_, DbState>) -> Result<Vec<Workspace>, String> {
    let rows = sqlx::query(
        "SELECT id, name, color, icon, sort_order, created_at FROM workspaces ORDER BY sort_order ASC"
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

    Ok(Workspace {
        id,
        name: payload.name,
        color: payload.color,
        icon: payload.icon,
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
        "SELECT id, name, color, icon, sort_order, created_at FROM workspaces WHERE id = ?"
    )
    .bind(&payload.id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(Workspace {
        id: row.get("id"),
        name: row.get("name"),
        color: row.get("color"),
        icon: row.get("icon"),
        sort_order: row.get("sort_order"),
        created_at: row.get("created_at"),
    })
}

/// Delete a workspace (projects become workspace-less)
#[tauri::command]
pub async fn delete_workspace(id: String, db: State<'_, DbState>) -> Result<(), String> {
    sqlx::query("DELETE FROM workspaces WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| format!("Failed to delete workspace: {e}"))?;
    Ok(())
}

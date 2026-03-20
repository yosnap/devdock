use crate::models::{CreateIdePayload, IdeConfig, UpdateIdePayload};
use crate::services::db_service::DbState;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

/// List all IDE configurations
#[tauri::command]
pub async fn list_ides(db: State<'_, DbState>) -> Result<Vec<IdeConfig>, String> {
    let rows = sqlx::query(
        "SELECT id, name, command, args, icon, is_default, sort_order FROM ide_configs ORDER BY sort_order ASC"
    )
    .fetch_all(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(rows
        .iter()
        .map(|row| IdeConfig {
            id: row.get("id"),
            name: row.get("name"),
            command: row.get("command"),
            args: row.get::<Option<String>, _>("args").unwrap_or_else(|| "{path}".to_string()),
            icon: row.get("icon"),
            is_default: row.get::<i64, _>("is_default") != 0,
            sort_order: row.get("sort_order"),
        })
        .collect())
}

/// Create a new IDE configuration
#[tauri::command]
pub async fn create_ide(
    payload: CreateIdePayload,
    db: State<'_, DbState>,
) -> Result<IdeConfig, String> {
    let pool = &db.0;
    let id = Uuid::new_v4().to_string();
    let is_default = payload.is_default.unwrap_or(false);
    let args = payload.args.unwrap_or_else(|| "{path}".to_string());

    // Get next sort_order
    let sort_order: i32 = sqlx::query_scalar("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM ide_configs")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?;

    // If new IDE is default, unset others
    if is_default {
        sqlx::query("UPDATE ide_configs SET is_default = 0")
            .execute(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?;
    }

    sqlx::query(
        "INSERT INTO ide_configs (id, name, command, args, icon, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&payload.command)
    .bind(&args)
    .bind(&payload.icon)
    .bind(if is_default { 1i64 } else { 0i64 })
    .bind(sort_order)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert IDE: {e}"))?;

    Ok(IdeConfig {
        id,
        name: payload.name,
        command: payload.command,
        args,
        icon: payload.icon,
        is_default,
        sort_order,
    })
}

/// Update an IDE configuration
#[tauri::command]
pub async fn update_ide(
    payload: UpdateIdePayload,
    db: State<'_, DbState>,
) -> Result<IdeConfig, String> {
    let pool = &db.0;

    // If setting as default, unset others first
    if payload.is_default == Some(true) {
        sqlx::query("UPDATE ide_configs SET is_default = 0")
            .execute(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?;
    }

    sqlx::query(
        r#"UPDATE ide_configs SET
           name = COALESCE(?, name),
           command = COALESCE(?, command),
           args = COALESCE(?, args),
           icon = COALESCE(?, icon),
           is_default = COALESCE(?, is_default),
           sort_order = COALESCE(?, sort_order)
           WHERE id = ?"#,
    )
    .bind(&payload.name)
    .bind(&payload.command)
    .bind(&payload.args)
    .bind(&payload.icon)
    .bind(payload.is_default.map(|d| if d { 1i64 } else { 0i64 }))
    .bind(payload.sort_order)
    .bind(&payload.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update IDE: {e}"))?;

    // Fetch updated record
    let row = sqlx::query(
        "SELECT id, name, command, args, icon, is_default, sort_order FROM ide_configs WHERE id = ?"
    )
    .bind(&payload.id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(IdeConfig {
        id: row.get("id"),
        name: row.get("name"),
        command: row.get("command"),
        args: row.get::<Option<String>, _>("args").unwrap_or_else(|| "{path}".to_string()),
        icon: row.get("icon"),
        is_default: row.get::<i64, _>("is_default") != 0,
        sort_order: row.get("sort_order"),
    })
}

/// Delete an IDE configuration
#[tauri::command]
pub async fn delete_ide(id: String, db: State<'_, DbState>) -> Result<(), String> {
    sqlx::query("DELETE FROM ide_configs WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| format!("Failed to delete IDE: {e}"))?;
    Ok(())
}

/// Set the default IDE
#[tauri::command]
pub async fn set_default_ide(id: String, db: State<'_, DbState>) -> Result<(), String> {
    let pool = &db.0;
    sqlx::query("UPDATE ide_configs SET is_default = 0")
        .execute(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?;
    sqlx::query("UPDATE ide_configs SET is_default = 1 WHERE id = ?")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to set default IDE: {e}"))?;
    Ok(())
}

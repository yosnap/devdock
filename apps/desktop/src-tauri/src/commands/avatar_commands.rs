use crate::services::{avatar_service, db_service::DbState};
use sqlx::Row;
use tauri::{AppHandle, Manager, State};

/// Upload an avatar for a project or workspace.
/// `entity` is "project" or "workspace", `id` is the entity UUID.
/// `source_path` is the absolute path to the selected image file.
/// Returns the new avatar filename stored in DB.
#[tauri::command]
pub async fn upload_avatar(
    entity: String,
    id: String,
    source_path: String,
    app: AppHandle,
    db: State<'_, DbState>,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))?;

    let pool = &db.0;

    // Fetch old avatar filename to delete after successful upload
    let old_avatar: Option<String> = match entity.as_str() {
        "project" => sqlx::query("SELECT avatar FROM projects WHERE id = ?")
            .bind(&id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?
            .and_then(|r| r.get("avatar")),
        "workspace" => sqlx::query("SELECT avatar FROM workspaces WHERE id = ?")
            .bind(&id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?
            .and_then(|r| r.get("avatar")),
        _ => return Err(format!("Unknown entity type: {entity}")),
    };

    // Save new avatar (validates extension + size, deletes old)
    let filename = avatar_service::save_avatar(
        &app_data_dir,
        &source_path,
        old_avatar.as_deref(),
    )?;

    // Persist filename in DB
    match entity.as_str() {
        "project" => {
            sqlx::query("UPDATE projects SET avatar = ? WHERE id = ?")
                .bind(&filename)
                .bind(&id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update project avatar: {e}"))?;
        }
        "workspace" => {
            sqlx::query("UPDATE workspaces SET avatar = ? WHERE id = ?")
                .bind(&filename)
                .bind(&id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update workspace avatar: {e}"))?;
        }
        _ => unreachable!(),
    }

    Ok(filename)
}

/// Remove the avatar for a project or workspace.
#[tauri::command]
pub async fn remove_avatar(
    entity: String,
    id: String,
    app: AppHandle,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))?;

    let pool = &db.0;

    let old_avatar: Option<String> = match entity.as_str() {
        "project" => sqlx::query("SELECT avatar FROM projects WHERE id = ?")
            .bind(&id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?
            .and_then(|r| r.get("avatar")),
        "workspace" => sqlx::query("SELECT avatar FROM workspaces WHERE id = ?")
            .bind(&id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?
            .and_then(|r| r.get("avatar")),
        _ => return Err(format!("Unknown entity type: {entity}")),
    };

    if let Some(filename) = old_avatar {
        avatar_service::delete_avatar(&app_data_dir, &filename);
    }

    match entity.as_str() {
        "project" => {
            sqlx::query("UPDATE projects SET avatar = NULL WHERE id = ?")
                .bind(&id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to clear project avatar: {e}"))?;
        }
        "workspace" => {
            sqlx::query("UPDATE workspaces SET avatar = NULL WHERE id = ?")
                .bind(&id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to clear workspace avatar: {e}"))?;
        }
        _ => unreachable!(),
    }

    Ok(())
}

/// Resolve the full filesystem path for an avatar filename.
/// Returns None if the file does not exist.
#[tauri::command]
pub fn get_avatar_path(filename: String, app: AppHandle) -> Option<String> {
    let app_data_dir = app.path().app_data_dir().ok()?;
    avatar_service::avatar_path(&app_data_dir, &filename)
        .map(|p| p.to_string_lossy().into_owned())
}

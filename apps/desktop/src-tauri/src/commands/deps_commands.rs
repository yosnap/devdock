use crate::models::Dependency;
use crate::services::{background_worker, db_service::DbState};
use sqlx::Row;
use tauri::State;

/// Get all dependencies for a project from DB cache
#[tauri::command]
pub async fn get_deps(project_id: String, db: State<'_, DbState>) -> Result<Vec<Dependency>, String> {
    let rows = sqlx::query(
        r#"SELECT id, project_id, name, current_version, latest_version, dep_type,
           ecosystem, is_outdated, has_vulnerability, last_checked_at
           FROM project_deps WHERE project_id = ? ORDER BY is_outdated DESC, name ASC"#,
    )
    .bind(&project_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(rows
        .iter()
        .map(|row| Dependency {
            id: row.get("id"),
            project_id: row.get("project_id"),
            name: row.get("name"),
            current_version: row.get("current_version"),
            latest_version: row.get("latest_version"),
            dep_type: row.get("dep_type"),
            ecosystem: row.get("ecosystem"),
            is_outdated: row.get::<i64, _>("is_outdated") != 0,
            has_vulnerability: row.get::<i64, _>("has_vulnerability") != 0,
            last_checked_at: row.get("last_checked_at"),
        })
        .collect())
}

/// Scan and store dependencies from the project's config files (local, no network)
#[tauri::command]
pub async fn scan_deps(project_id: String, db: State<'_, DbState>) -> Result<usize, String> {
    let pool = &db.0;

    let path: String = sqlx::query_scalar("SELECT path FROM projects WHERE id = ?")
        .bind(&project_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?
        .ok_or_else(|| format!("Project not found: {project_id}"))?;

    let stack: Option<String> = sqlx::query_scalar("SELECT stack FROM projects WHERE id = ?")
        .bind(&project_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?
        .flatten();

    background_worker::refresh_deps(pool, &project_id, &path, stack.as_deref()).await;

    // Return count of deps stored
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM project_deps WHERE project_id = ?")
        .bind(&project_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?;

    Ok(count as usize)
}

/// Check latest versions from registries and mark outdated (network call)
#[tauri::command]
pub async fn check_outdated(project_id: String, db: State<'_, DbState>) -> Result<usize, String> {
    background_worker::check_outdated_deps(&db.0, &project_id).await
}

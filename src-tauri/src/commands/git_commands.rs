use crate::models::{GitInfo, GitStatus};
use crate::services::{background_worker, db_service::DbState, git_service};
use sqlx::Row;
use tauri::State;

/// Get live git status for a project (reads from disk, then caches to DB)
#[tauri::command]
pub async fn get_git_status(project_id: String, db: State<'_, DbState>) -> Result<GitInfo, String> {
    let pool = &db.0;

    // Get project path
    let path: String = sqlx::query_scalar("SELECT path FROM projects WHERE id = ?")
        .bind(&project_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?
        .ok_or_else(|| format!("Project not found: {project_id}"))?;

    // Read live git info
    let info = git_service::get_git_info(&path);

    // Cache to DB asynchronously (non-blocking)
    if info.is_git_repo {
        let pool_clone = pool.clone();
        let project_id_clone = project_id.clone();
        let path_clone = path.clone();
        tokio::spawn(async move {
            background_worker::refresh_git_status(&pool_clone, &project_id_clone, &path_clone).await;
        });
    }

    Ok(info)
}

/// Get cached git status from DB (fast, no disk read)
#[tauri::command]
pub async fn get_cached_git_status(
    project_id: String,
    db: State<'_, DbState>,
) -> Result<Option<GitStatus>, String> {
    let pool = &db.0;

    let row = sqlx::query(
        r#"SELECT project_id, branch, uncommitted_count, ahead, behind,
           last_commit_msg, last_commit_author, last_commit_date, remote_url, updated_at
           FROM project_git_status WHERE project_id = ?"#,
    )
    .bind(&project_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(row.map(|r| GitStatus {
        project_id: r.get("project_id"),
        branch: r.get("branch"),
        uncommitted_count: r.get("uncommitted_count"),
        ahead: r.get("ahead"),
        behind: r.get("behind"),
        last_commit_msg: r.get("last_commit_msg"),
        last_commit_author: r.get("last_commit_author"),
        last_commit_date: r.get("last_commit_date"),
        remote_url: r.get("remote_url"),
        updated_at: r.get("updated_at"),
    }))
}

/// Trigger a background refresh of git status for a project
#[tauri::command]
pub async fn refresh_project_git(project_id: String, db: State<'_, DbState>) -> Result<GitInfo, String> {
    get_git_status(project_id, db).await
}

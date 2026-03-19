use crate::models::Ecosystem;
use crate::services::{deps_analyzer, git_service, registry_client};
use chrono::Utc;
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use uuid::Uuid;

/// Shared cancellation flag for the background worker
pub type WorkerHandle = Arc<Mutex<bool>>;

/// Spawn a background Tokio task that refreshes git status and deps every 5 minutes.
/// Returns a handle that can be used to stop the worker.
pub fn start_background_worker(pool: SqlitePool) -> WorkerHandle {
    let stop_flag: WorkerHandle = Arc::new(Mutex::new(false));
    let flag_clone = stop_flag.clone();

    tokio::spawn(async move {
        loop {
            // Check stop signal
            if *flag_clone.lock().await {
                break;
            }

            // Run scan (errors are logged, not propagated)
            if let Err(e) = scan_all_projects(&pool).await {
                eprintln!("[background_worker] scan error: {e}");
            }

            // Wait 5 minutes before next scan
            tokio::time::sleep(Duration::from_secs(300)).await;
        }
    });

    stop_flag
}

/// Scan git status and deps for all active projects
async fn scan_all_projects(pool: &SqlitePool) -> Result<(), String> {
    let rows = sqlx::query("SELECT id, path, stack FROM projects WHERE status = 'active'")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("DB error: {e}"))?;

    for row in rows {
        use sqlx::Row;
        let project_id: String = row.get("id");
        let path: String = row.get("path");
        let stack: Option<String> = row.get("stack");

        // Git status scan (fast, local)
        refresh_git_status(pool, &project_id, &path).await;

        // Deps scan (parse local files, no network)
        refresh_deps(pool, &project_id, &path, stack.as_deref()).await;
    }

    Ok(())
}

/// Update git status cache for one project
pub async fn refresh_git_status(pool: &SqlitePool, project_id: &str, path: &str) {
    let info = git_service::get_git_info(path);
    if !info.is_git_repo {
        return;
    }

    let now = Utc::now().to_rfc3339();
    let _ = sqlx::query(
        r#"INSERT INTO project_git_status
           (project_id, branch, uncommitted_count, ahead, behind, last_commit_msg, last_commit_author, last_commit_date, remote_url, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(project_id) DO UPDATE SET
             branch = excluded.branch,
             uncommitted_count = excluded.uncommitted_count,
             ahead = excluded.ahead,
             behind = excluded.behind,
             last_commit_msg = excluded.last_commit_msg,
             last_commit_author = excluded.last_commit_author,
             last_commit_date = excluded.last_commit_date,
             remote_url = excluded.remote_url,
             updated_at = excluded.updated_at"#,
    )
    .bind(project_id)
    .bind(&info.branch)
    .bind(info.uncommitted_count)
    .bind(info.ahead)
    .bind(info.behind)
    .bind(&info.last_commit_msg)
    .bind(&info.last_commit_author)
    .bind(&info.last_commit_date)
    .bind(&info.remote_url)
    .bind(&now)
    .execute(pool)
    .await;
}

/// Parse and store deps for one project (local file parsing only)
pub async fn refresh_deps(pool: &SqlitePool, project_id: &str, path: &str, _stack: Option<&str>) {
    let parsed = deps_analyzer::parse_deps(path);
    let now = Utc::now().to_rfc3339();

    for dep in parsed {
        let id = Uuid::new_v4().to_string();
        let ecosystem = dep.ecosystem.to_string();

        let _ = sqlx::query(
            r#"INSERT INTO project_deps (id, project_id, name, current_version, dep_type, ecosystem, last_checked_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(project_id, name, ecosystem) DO UPDATE SET
                 current_version = excluded.current_version,
                 dep_type = excluded.dep_type,
                 last_checked_at = excluded.last_checked_at"#,
        )
        .bind(&id)
        .bind(project_id)
        .bind(&dep.name)
        .bind(&dep.version)
        .bind(&dep.dep_type)
        .bind(&ecosystem)
        .bind(&now)
        .execute(pool)
        .await;
    }
}

/// Check latest versions from registries and mark outdated packages.
/// This is intentionally separate from refresh_deps — called on-demand, not every 5 min.
pub async fn check_outdated_deps(pool: &SqlitePool, project_id: &str) -> Result<usize, String> {
    let rows = sqlx::query(
        "SELECT id, name, current_version, ecosystem FROM project_deps WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    let mut outdated_count = 0;

    for row in rows {
        use sqlx::Row;
        let id: String = row.get("id");
        let name: String = row.get("name");
        let current: Option<String> = row.get("current_version");
        let ecosystem_str: String = row.get("ecosystem");

        let ecosystem = match ecosystem_str.as_str() {
            "npm" => Ecosystem::Npm,
            "cargo" => Ecosystem::Cargo,
            "pip" => Ecosystem::Pip,
            "go" => Ecosystem::Go,
            _ => continue,
        };

        let latest = registry_client::fetch_latest_version(&name, &ecosystem).await;
        let now = Utc::now().to_rfc3339();

        let is_outdated = match (&current, &latest) {
            (Some(cur), Some(lat)) => registry_client::is_outdated(cur, lat),
            _ => false,
        };

        if is_outdated {
            outdated_count += 1;
        }

        let _ = sqlx::query(
            "UPDATE project_deps SET latest_version = ?, is_outdated = ?, last_checked_at = ? WHERE id = ?"
        )
        .bind(&latest)
        .bind(if is_outdated { 1i64 } else { 0i64 })
        .bind(&now)
        .bind(&id)
        .execute(pool)
        .await;
    }

    Ok(outdated_count)
}

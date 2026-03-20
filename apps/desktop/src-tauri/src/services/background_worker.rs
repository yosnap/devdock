use crate::models::Ecosystem;
use crate::services::{deps_analyzer, git_service, health_calculator, registry_client, tech_detector};
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

/// Scan git status, deps, and tech breakdown for all active projects
async fn scan_all_projects(pool: &SqlitePool) -> Result<(), String> {
    let rows = sqlx::query(
        "SELECT id, path, stack, tech_breakdown FROM projects WHERE status = 'active'"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    for row in rows {
        use sqlx::Row;
        let project_id: String = row.get("id");
        let path: String = row.get("path");
        let stack: Option<String> = row.get("stack");
        let existing_tb: Option<String> = row.get("tech_breakdown");

        // Git status scan (fast, local)
        refresh_git_status(pool, &project_id, &path).await;

        // Deps scan (parse local files, no network)
        refresh_deps(pool, &project_id, &path, stack.as_deref()).await;

        // Backfill tech_breakdown if missing
        if existing_tb.is_none() {
            let tb = tech_detector::detect_tech_breakdown(&path);
            if let Ok(json) = serde_json::to_string(&tb) {
                let _ = sqlx::query("UPDATE projects SET tech_breakdown = ? WHERE id = ?")
                    .bind(&json)
                    .bind(&project_id)
                    .execute(pool)
                    .await;
            }
        }

        // Auto-calculate health score from cached git + deps data
        calculate_health_from_cache(pool, &project_id).await;
    }

    Ok(())
}

/// Build HealthInput from cached git_status + deps data, then compute and save score.
async fn calculate_health_from_cache(pool: &SqlitePool, project_id: &str) {
    use sqlx::Row;

    // Read cached git status
    let git_row = sqlx::query(
        "SELECT uncommitted_count, remote_url, last_commit_date FROM project_git_status WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let (uncommitted, has_remote, days_since) = if let Some(row) = git_row {
        let uncommitted: i32 = row.get::<i64, _>("uncommitted_count") as i32;
        let remote: Option<String> = row.get("remote_url");
        let last_date: Option<String> = row.get("last_commit_date");
        let days = last_date.and_then(|d| {
            chrono::DateTime::parse_from_rfc3339(&d)
                .or_else(|_| chrono::DateTime::parse_from_str(&d, "%Y-%m-%d %H:%M:%S %z"))
                .ok()
                .map(|dt| (Utc::now() - dt.with_timezone(&Utc)).num_days())
        });
        (uncommitted, remote.is_some() && !remote.as_ref().unwrap().is_empty(), days)
    } else {
        (0, false, None)
    };

    // Count outdated deps
    let outdated: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM project_deps WHERE project_id = ? AND is_outdated = 1"
    )
    .bind(project_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let vulnerable: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM project_deps WHERE project_id = ? AND has_vulnerability = 1"
    )
    .bind(project_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let input = health_calculator::HealthInput {
        outdated_deps_count: outdated as i32,
        vulnerable_deps_count: vulnerable as i32,
        ci_failing: false, // CI status requires network — skip in background
        days_since_commit: days_since,
        uncommitted_changes: uncommitted,
        has_remote,
    };

    let cfg = health_calculator::get_health_config(pool).await;
    let result = health_calculator::calculate_health(&input, &cfg);
    let _ = health_calculator::update_project_health_score(pool, project_id, result.score).await;
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

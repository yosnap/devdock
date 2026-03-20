/// Tauri IPC commands for health scoring and quick launch.
use tauri::State;

use crate::services::db_service::DbState;
use crate::services::health_calculator::{
    self, HealthConfig, HealthInput, HealthResult,
};
use crate::services::quick_launch::{self, QuickLaunchItem};
use crate::sync::sync_queue;

// ── Health config ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_health_config(db: State<'_, DbState>) -> Result<HealthConfig, String> {
    Ok(health_calculator::get_health_config(&db.0).await)
}

#[tauri::command]
pub async fn save_health_config(
    config: HealthConfig,
    db: State<'_, DbState>,
) -> Result<(), String> {
    health_calculator::save_health_config(&db.0, &config).await
}

// ── Health scoring ────────────────────────────────────────────────────────────

/// Calculate and persist health score for a single project.
/// Frontend provides pre-aggregated input data.
#[tauri::command]
pub async fn calculate_project_health(
    project_id: String,
    input: HealthInput,
    db: State<'_, DbState>,
) -> Result<HealthResult, String> {
    let pool = &db.0;
    let cfg = health_calculator::get_health_config(pool).await;
    let result = health_calculator::calculate_health(&input, &cfg);
    health_calculator::update_project_health_score(pool, &project_id, result.score).await?;

    // Enqueue health_score update for cloud sync (full row needed by parser)
    {
        let pool_clone = pool.clone();
        let pid = project_id.clone();
        let score = result.score;
        tokio::spawn(async move {
            // Fetch minimal required fields for sync parser
            let row = sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>, bool, String, Option<String>, Option<String>, Option<String>, Option<String>, String, String)>(
                "SELECT id, name, COALESCE((SELECT value FROM app_preferences WHERE key='user_id'),''), \
                 description, stack, is_favorite, status, workspace_id, github_owner, github_repo, avatar, \
                 created_at, updated_at FROM projects WHERE id = ?"
            )
            .bind(&pid)
            .fetch_optional(&pool_clone)
            .await;

            if let Ok(Some(r)) = row {
                let payload = serde_json::json!({
                    "id": r.0, "name": r.1, "user_id": r.2,
                    "description": r.3, "stack": r.4,
                    "is_favorite": r.5, "status": r.6,
                    "workspace_id": r.7, "github_owner": r.8,
                    "github_repo": r.9, "avatar": r.10,
                    "health_score": score,
                    "created_at": r.11, "updated_at": r.12,
                });
                let _ = sync_queue::enqueue(
                    &pool_clone, "projects", &pid,
                    "UPDATE", Some(payload.to_string()),
                ).await;
            }
        });
    }

    Ok(result)
}

/// Return all projects with health_score below the attention threshold.
#[tauri::command]
pub async fn get_projects_needing_attention(
    db: State<'_, DbState>,
) -> Result<Vec<serde_json::Value>, String> {
    let cfg = health_calculator::get_health_config(&db.0).await;
    let threshold = cfg.attention_threshold;

    let rows = sqlx::query!(
        "SELECT id, name, path, stack, health_score, status
         FROM projects
         WHERE health_score >= 0 AND health_score < ?
         ORDER BY health_score ASC",
        threshold
    )
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let result = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "name": r.name,
                "path": r.path,
                "stack": r.stack,
                "health_score": r.health_score,
                "status": r.status,
            })
        })
        .collect();

    Ok(result)
}

// ── Quick launch ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn quick_search_projects(
    query: String,
    db: State<'_, DbState>,
) -> Result<Vec<QuickLaunchItem>, String> {
    quick_launch::fuzzy_search_projects(&db.0, &query, 10).await
}

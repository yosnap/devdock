/// Startup pull: fetches remote changes from Supabase and merges into SQLite.
/// Called on app launch after user is authenticated.
/// Merge strategy: compare updated_at, keep newer. Insert if not exists locally.
use crate::sync::supabase_client::SupabaseClient;
use chrono::Utc;
use sqlx::SqlitePool;
use std::sync::Arc;

/// Tables eligible for pull sync, in dependency order (workspaces before projects)
const SYNC_TABLES: &[&str] = &[
    "workspaces",
    "projects",
    "project_note_items",
    "project_links",
    "project_tags",
];

/// Entry point: pull all remote changes since last sync per table.
pub async fn pull_remote_changes(
    pool: &SqlitePool,
    supabase: &Arc<SupabaseClient>,
    user_id: &str,
) -> Result<(), String> {
    for &table in SYNC_TABLES {
        let since = get_last_synced_at(pool, table).await?;
        let since_str = since.as_deref().unwrap_or("1970-01-01T00:00:00Z");

        match supabase.fetch_changes(table, since_str, user_id).await {
            Ok(rows) => {
                if !rows.is_empty() {
                    if let Err(e) = merge_rows(pool, table, rows).await {
                        eprintln!("[startup_sync] merge error for {table}: {e}");
                    }
                }
                update_last_synced_at(pool, table).await?;
            }
            Err(e) => {
                // Non-fatal: log and continue with other tables
                eprintln!("[startup_sync] fetch error for {table}: {e}");
            }
        }
    }
    Ok(())
}

/// Merge remote rows into local SQLite using last-write-wins on updated_at.
async fn merge_rows(
    pool: &SqlitePool,
    table: &str,
    rows: Vec<serde_json::Value>,
) -> Result<(), String> {
    for row in rows {
        let id = row["id"]
            .as_str()
            .ok_or_else(|| format!("Row missing id in {table}"))?;
        let remote_updated = row["updated_at"].as_str().unwrap_or("1970-01-01T00:00:00Z");

        // Fetch local updated_at for conflict resolution
        let local_updated: Option<String> = fetch_local_updated_at(pool, table, id).await?;

        match local_updated {
            None => {
                // Record doesn't exist locally — insert it
                insert_remote_row(pool, table, &row).await?;
            }
            Some(local_ts) => {
                // Keep the newer version
                if remote_updated > local_ts.as_str() {
                    update_local_row(pool, table, &row).await?;
                }
                // If local is newer, skip — it will be pushed by sync_worker
            }
        }
    }
    Ok(())
}

/// Get the last_synced_at timestamp for a table from sync_metadata.
async fn get_last_synced_at(
    pool: &SqlitePool,
    table: &str,
) -> Result<Option<String>, String> {
    let val: Option<String> = sqlx::query_scalar(
        "SELECT last_synced_at FROM sync_metadata WHERE table_name = ?",
    )
    .bind(table)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to read sync_metadata for {table}: {e}"))?
    .flatten();
    Ok(val)
}

/// Update last_synced_at to now() for a table.
async fn update_last_synced_at(pool: &SqlitePool, table: &str) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO sync_metadata (table_name, last_synced_at) VALUES (?, ?) \
         ON CONFLICT(table_name) DO UPDATE SET last_synced_at = excluded.last_synced_at",
    )
    .bind(table)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update sync_metadata for {table}: {e}"))?;
    Ok(())
}

/// Fetch local updated_at for a record, or None if it doesn't exist.
async fn fetch_local_updated_at(
    pool: &SqlitePool,
    table: &str,
    id: &str,
) -> Result<Option<String>, String> {
    // updated_at column exists on projects, workspaces, project_note_items
    // project_links and project_tags don't have updated_at — treat as always stale
    let col = match table {
        "projects" | "workspaces" | "project_note_items" => "updated_at",
        _ => return Ok(None), // force insert/update for tables without updated_at
    };

    let query = format!("SELECT {col} FROM {table} WHERE id = ?");
    let val: Option<String> = sqlx::query_scalar(&query)
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to fetch local row {table}/{id}: {e}"))?
        .flatten();
    Ok(val)
}

/// Insert a remote row that doesn't exist locally.
/// Uses OR IGNORE to avoid races with concurrent writes.
async fn insert_remote_row(
    pool: &SqlitePool,
    table: &str,
    row: &serde_json::Value,
) -> Result<(), String> {
    match table {
        "projects" => {
            sqlx::query(
                "INSERT OR IGNORE INTO projects \
                 (id, user_id, name, description, stack, workspace_id, is_favorite, status, \
                  health_score, github_owner, github_repo, avatar, last_opened_at, \
                  created_at, updated_at, synced_at) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            )
            .bind(row["id"].as_str())
            .bind(row["user_id"].as_str())
            .bind(row["name"].as_str())
            .bind(row["description"].as_str())
            .bind(row["stack"].as_str())
            .bind(row["workspace_id"].as_str())
            .bind(row["is_favorite"].as_bool().map(|b| if b { 1i64 } else { 0i64 }))
            .bind(row["status"].as_str().unwrap_or("active"))
            .bind(row["health_score"].as_i64().unwrap_or(0))
            .bind(row["github_owner"].as_str())
            .bind(row["github_repo"].as_str())
            .bind(row["avatar"].as_str())
            .bind(row["last_opened_at"].as_str())
            .bind(row["created_at"].as_str())
            .bind(row["updated_at"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Insert project failed: {e}"))?;
        }
        "workspaces" => {
            sqlx::query(
                "INSERT OR IGNORE INTO workspaces \
                 (id, user_id, name, color, icon, sort_order, created_at, synced_at) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            )
            .bind(row["id"].as_str())
            .bind(row["user_id"].as_str())
            .bind(row["name"].as_str())
            .bind(row["color"].as_str())
            .bind(row["icon"].as_str())
            .bind(row["sort_order"].as_i64().unwrap_or(0))
            .bind(row["created_at"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Insert workspace failed: {e}"))?;
        }
        "project_note_items" => {
            sqlx::query(
                "INSERT OR IGNORE INTO project_note_items \
                 (id, project_id, title, content, note_type, is_resolved, \
                  created_at, updated_at, synced_at) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            )
            .bind(row["id"].as_str())
            .bind(row["project_id"].as_str())
            .bind(row["title"].as_str())
            .bind(row["content"].as_str())
            .bind(row["note_type"].as_str().unwrap_or("note"))
            .bind(row["is_resolved"].as_bool().map(|b| if b { 1i64 } else { 0i64 }))
            .bind(row["created_at"].as_str())
            .bind(row["updated_at"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Insert note_item failed: {e}"))?;
        }
        "project_links" => {
            sqlx::query(
                "INSERT OR IGNORE INTO project_links \
                 (id, project_id, title, url, icon, sort_order, synced_at) \
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            )
            .bind(row["id"].as_str())
            .bind(row["project_id"].as_str())
            .bind(row["title"].as_str())
            .bind(row["url"].as_str())
            .bind(row["icon"].as_str())
            .bind(row["sort_order"].as_i64().unwrap_or(0))
            .execute(pool)
            .await
            .map_err(|e| format!("Insert link failed: {e}"))?;
        }
        "project_tags" => {
            sqlx::query(
                "INSERT OR IGNORE INTO project_tags (project_id, tag, synced_at) \
                 VALUES (?, ?, CURRENT_TIMESTAMP)",
            )
            .bind(row["project_id"].as_str())
            .bind(row["tag"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Insert tag failed: {e}"))?;
        }
        _ => {}
    }
    Ok(())
}

/// Update an existing local row with remote data (remote wins).
async fn update_local_row(
    pool: &SqlitePool,
    table: &str,
    row: &serde_json::Value,
) -> Result<(), String> {
    match table {
        "projects" => {
            sqlx::query(
                "UPDATE projects SET \
                 name = ?, description = ?, stack = ?, workspace_id = ?, \
                 is_favorite = ?, status = ?, health_score = ?, \
                 github_owner = ?, github_repo = ?, avatar = ?, \
                 last_opened_at = ?, updated_at = ?, synced_at = CURRENT_TIMESTAMP \
                 WHERE id = ?",
            )
            .bind(row["name"].as_str())
            .bind(row["description"].as_str())
            .bind(row["stack"].as_str())
            .bind(row["workspace_id"].as_str())
            .bind(row["is_favorite"].as_bool().map(|b| if b { 1i64 } else { 0i64 }))
            .bind(row["status"].as_str().unwrap_or("active"))
            .bind(row["health_score"].as_i64().unwrap_or(0))
            .bind(row["github_owner"].as_str())
            .bind(row["github_repo"].as_str())
            .bind(row["avatar"].as_str())
            .bind(row["last_opened_at"].as_str())
            .bind(row["updated_at"].as_str())
            .bind(row["id"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Update project failed: {e}"))?;
        }
        "workspaces" => {
            sqlx::query(
                "UPDATE workspaces SET \
                 name = ?, color = ?, icon = ?, sort_order = ?, \
                 synced_at = CURRENT_TIMESTAMP \
                 WHERE id = ?",
            )
            .bind(row["name"].as_str())
            .bind(row["color"].as_str())
            .bind(row["icon"].as_str())
            .bind(row["sort_order"].as_i64().unwrap_or(0))
            .bind(row["id"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Update workspace failed: {e}"))?;
        }
        "project_note_items" => {
            sqlx::query(
                "UPDATE project_note_items SET \
                 title = ?, content = ?, note_type = ?, is_resolved = ?, \
                 updated_at = ?, synced_at = CURRENT_TIMESTAMP \
                 WHERE id = ?",
            )
            .bind(row["title"].as_str())
            .bind(row["content"].as_str())
            .bind(row["note_type"].as_str().unwrap_or("note"))
            .bind(row["is_resolved"].as_bool().map(|b| if b { 1i64 } else { 0i64 }))
            .bind(row["updated_at"].as_str())
            .bind(row["id"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Update note_item failed: {e}"))?;
        }
        "project_links" => {
            sqlx::query(
                "UPDATE project_links SET \
                 title = ?, url = ?, icon = ?, sort_order = ?, \
                 synced_at = CURRENT_TIMESTAMP \
                 WHERE id = ?",
            )
            .bind(row["title"].as_str())
            .bind(row["url"].as_str())
            .bind(row["icon"].as_str())
            .bind(row["sort_order"].as_i64().unwrap_or(0))
            .bind(row["id"].as_str())
            .execute(pool)
            .await
            .map_err(|e| format!("Update link failed: {e}"))?;
        }
        _ => {}
    }
    Ok(())
}

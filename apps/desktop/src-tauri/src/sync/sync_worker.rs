/// Background sync worker: drains the sync_queue every 5s, skips when offline.
/// Emits Tauri events: sync:progress, sync:error, sync:complete.
use crate::sync::{supabase_client::SupabaseClient, sync_queue};
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const POLL_INTERVAL_SECS: u64 = 5;
const BATCH_SIZE: i64 = 50;

/// Spawn the background sync task. Call once after db + supabase init.
pub fn start_sync_worker(
    pool: SqlitePool,
    supabase: Arc<SupabaseClient>,
    app: AppHandle,
    avatars_dir: PathBuf,
) {
    tokio::spawn(async move {
        loop {
            if supabase.check_connectivity().await {
                if let Err(e) = process_queue(&pool, &supabase, &app, &avatars_dir).await {
                    eprintln!("[sync_worker] queue error: {e}");
                    let _ = app.emit("sync:error", serde_json::json!({ "error": e }));
                }
            }
            tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
        }
    });
}

/// Drain one batch from the queue, dispatch each item to Supabase.
async fn process_queue(
    pool: &SqlitePool,
    supabase: &SupabaseClient,
    app: &AppHandle,
    avatars_dir: &PathBuf,
) -> Result<(), String> {
    // Recover previously parked rows that failed only because user_id was missing.
    // If user_id exists now in payload, make them retryable again.
    let _ = sqlx::query(
        "UPDATE sync_queue
         SET retry_count = 0, last_error = NULL
         WHERE retry_count >= 5
           AND COALESCE(last_error, '') LIKE 'Missing required field: user_id%'
           AND json_extract(payload, '$.user_id') IS NOT NULL
           AND json_extract(payload, '$.user_id') <> ''"
    )
    .execute(pool)
    .await;

    let items = sync_queue::dequeue_batch(pool, BATCH_SIZE).await?;

    if items.is_empty() {
        return Ok(());
    }

    let total = items.len();
    let _ = app.emit("sync:progress", serde_json::json!({ "pending": total }));

    let mut completed_ids: Vec<i64> = Vec::new();

    for item in items {
        let result = dispatch_item(supabase, &item.table_name, &item.operation, &item.payload, avatars_dir).await;

        match result {
            Ok(()) => {
                completed_ids.push(item.id);
            }
            Err(e) => {
                eprintln!("[sync_worker] failed item {}: {e}", item.id);
                // After 5 failures the item is parked (dequeue filters retry_count >= 5)
                let _ = sync_queue::mark_failed(pool, item.id, &e).await;
                let _ = app.emit(
                    "sync:error",
                    serde_json::json!({
                        "table": item.table_name,
                        "record_id": item.record_id,
                        "error": e,
                        "retry_count": item.retry_count + 1,
                    }),
                );
            }
        }
    }

    if !completed_ids.is_empty() {
        sync_queue::mark_completed(pool, completed_ids).await?;
    }

    let _ = app.emit("sync:complete", serde_json::json!({ "processed": total }));
    Ok(())
}

/// Public alias used by sync_commands::force_sync for on-demand flush.
pub async fn dispatch_sync_item(
    supabase: &SupabaseClient,
    table_name: &str,
    operation: &str,
    payload: &Option<String>,
    avatars_dir: &PathBuf,
) -> Result<(), String> {
    dispatch_item(supabase, table_name, operation, payload, avatars_dir).await
}

/// Upload a local avatar file to Supabase Storage if it exists, return public URL.
async fn upload_avatar_if_local(
    supabase: &SupabaseClient,
    avatar: &str,
    user_id: &str,
    avatars_dir: &PathBuf,
) -> Option<String> {
    // Already a URL — skip upload
    if avatar.starts_with("http") {
        return Some(avatar.to_string());
    }
    let file_path = avatars_dir.join(avatar);
    if !file_path.exists() {
        return Some(avatar.to_string()); // keep filename, file may not exist
    }
    match tokio::fs::read(&file_path).await {
        Ok(data) => match supabase.upload_avatar_file(user_id, avatar, data).await {
            Ok(url) => Some(url),
            Err(e) => {
                eprintln!("[sync_worker] avatar upload failed: {e}");
                Some(avatar.to_string())
            }
        },
        Err(e) => {
            eprintln!("[sync_worker] avatar read failed: {e}");
            Some(avatar.to_string())
        }
    }
}

/// Route a queue item to the correct Supabase call based on table + operation.
async fn dispatch_item(
    supabase: &SupabaseClient,
    table_name: &str,
    operation: &str,
    payload: &Option<String>,
    avatars_dir: &PathBuf,
) -> Result<(), String> {
    match operation {
        "DELETE" => {
            let id = payload
                .as_deref()
                .ok_or_else(|| "DELETE item missing payload (record id)".to_string())?;
            supabase.soft_delete_record(table_name, id).await
        }
        "INSERT" | "UPDATE" => {
            let raw = payload
                .as_deref()
                .ok_or_else(|| format!("{operation} item missing payload JSON"))?;
            let value: serde_json::Value =
                serde_json::from_str(raw).map_err(|e| format!("JSON parse error: {e}"))?;

            match table_name {
                "projects" => {
                    let mut p = parse_project_sync(&value)?;
                    if let Some(ref av) = p.avatar {
                        p.avatar = upload_avatar_if_local(supabase, av, &p.user_id, avatars_dir).await;
                    }
                    supabase.upsert_project(&p).await
                }
                "workspaces" => {
                    let mut w = parse_workspace_sync(&value)?;
                    if let Some(ref av) = w.avatar {
                        w.avatar = upload_avatar_if_local(supabase, av, &w.user_id, avatars_dir).await;
                    }
                    supabase.upsert_workspace(&w).await
                }
                "project_note_items" => {
                    let n = parse_note_item_sync(&value)?;
                    supabase.upsert_note_item(&n).await
                }
                "project_links" => {
                    let l = parse_link_sync(&value)?;
                    supabase.upsert_link(&l).await
                }
                other => Err(format!("Unknown sync table: {other}")),
            }
        }
        other => Err(format!("Unknown sync operation: {other}")),
    }
}

// --- JSON -> sync DTO parsers ---

use crate::sync::supabase_client::{LinkSync, NoteItemSync, ProjectSync, WorkspaceSync};

fn get_str(v: &serde_json::Value, key: &str) -> Result<String, String> {
    v[key]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Missing required field: {key}"))
}

fn get_opt_str(v: &serde_json::Value, key: &str) -> Option<String> {
    v[key].as_str().map(|s| s.to_string())
}

fn parse_project_sync(v: &serde_json::Value) -> Result<ProjectSync, String> {
    Ok(ProjectSync {
        id: get_str(v, "id")?,
        user_id: get_str(v, "user_id")?,
        name: get_str(v, "name")?,
        description: get_opt_str(v, "description"),
        stack: get_opt_str(v, "stack"),
        workspace_id: get_opt_str(v, "workspace_id"),
        is_favorite: v["is_favorite"].as_bool().unwrap_or(false),
        status: get_str(v, "status").unwrap_or_else(|_| "active".to_string()),
        health_score: v["health_score"].as_i64().unwrap_or(0) as i32,
        github_owner: get_opt_str(v, "github_owner"),
        github_repo: get_opt_str(v, "github_repo"),
        avatar: get_opt_str(v, "avatar"),
        tech_breakdown: v["tech_breakdown"].as_str()
            .and_then(|s| serde_json::from_str(s).ok())
            .or_else(|| v["tech_breakdown"].as_object().map(|_| v["tech_breakdown"].clone())),
        last_opened_at: get_opt_str(v, "last_opened_at"),
        deleted_at: get_opt_str(v, "deleted_at"),
        created_at: get_str(v, "created_at").unwrap_or_else(|_| chrono::Utc::now().to_rfc3339()),
        updated_at: get_str(v, "updated_at").unwrap_or_else(|_| chrono::Utc::now().to_rfc3339()),
    })
}

fn parse_workspace_sync(v: &serde_json::Value) -> Result<WorkspaceSync, String> {
    Ok(WorkspaceSync {
        id: get_str(v, "id")?,
        user_id: get_str(v, "user_id").unwrap_or_default(),
        name: get_str(v, "name")?,
        color: get_opt_str(v, "color"),
        icon: get_opt_str(v, "icon"),
        avatar: get_opt_str(v, "avatar"),
        sort_order: v["sort_order"].as_i64().unwrap_or(0) as i32,
        created_at: get_str(v, "created_at").unwrap_or_else(|_| chrono::Utc::now().to_rfc3339()),
    })
}

fn parse_note_item_sync(v: &serde_json::Value) -> Result<NoteItemSync, String> {
    Ok(NoteItemSync {
        id: get_str(v, "id")?,
        project_id: get_str(v, "project_id")?,
        title: get_str(v, "title")?,
        content: get_opt_str(v, "content"),
        note_type: get_str(v, "note_type").unwrap_or_else(|_| "note".to_string()),
        is_resolved: v["is_resolved"].as_bool().unwrap_or(false),
        created_at: get_str(v, "created_at")?,
        updated_at: get_str(v, "updated_at")?,
    })
}

fn parse_link_sync(v: &serde_json::Value) -> Result<LinkSync, String> {
    Ok(LinkSync {
        id: get_str(v, "id")?,
        project_id: get_str(v, "project_id")?,
        title: get_str(v, "title")?,
        url: get_str(v, "url")?,
        icon: get_opt_str(v, "icon"),
        sort_order: v["sort_order"].as_i64().unwrap_or(0) as i32,
    })
}

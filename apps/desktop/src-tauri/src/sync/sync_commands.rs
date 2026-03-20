/// Tauri commands exposing sync control to the frontend.
use crate::services::db_service::DbState;
use crate::sync::{startup_sync, sync_queue, supabase_client::SupabaseClient};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

/// Shared Supabase client managed by Tauri state
pub struct SupabaseState(pub Arc<SupabaseClient>);

#[derive(Debug, Serialize)]
pub struct SyncStatus {
    pub pending_count: i64,
    pub last_error: Option<String>,
    pub last_synced_at: Option<String>,
}

/// Return current sync status: pending queue size + last sync timestamp.
#[tauri::command]
pub async fn get_sync_status(db: State<'_, DbState>) -> Result<SyncStatus, String> {
    let pool = &db.0;

    let pending_count = sync_queue::pending_count(pool).await?;

    // Fetch the most recent last_error from parked items (retry_count >= 5)
    let last_error: Option<String> = sqlx::query_scalar(
        "SELECT last_error FROM sync_queue WHERE retry_count >= 5 \
         ORDER BY id DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?
    .flatten();

    // Use the earliest (oldest) last_synced_at across tables as the watermark
    let last_synced_at: Option<String> = sqlx::query_scalar(
        "SELECT MIN(last_synced_at) FROM sync_metadata",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?
    .flatten();

    Ok(SyncStatus { pending_count, last_error, last_synced_at })
}

/// Delete all items from the sync queue (testing / user-initiated reset).
#[tauri::command]
pub async fn clear_sync_queue(db: State<'_, DbState>) -> Result<(), String> {
    sync_queue::clear_all(&db.0).await
}

/// Trigger an immediate full sync: pull from Supabase then flush the queue.
/// Requires a valid Supabase session stored in SupabaseState.
#[tauri::command]
pub async fn force_sync(
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
) -> Result<(), String> {
    let pool = &db.0;
    let client = &supabase.0;

    // Read user_id from app_preferences (set at login)
    let user_id: Option<String> = sqlx::query_scalar(
        "SELECT value FROM app_preferences WHERE key = 'user_id'",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error reading user_id: {e}"))?
    .flatten();

    let uid = user_id.ok_or("No authenticated user — cannot force sync")?;

    // Pull remote changes first
    startup_sync::pull_remote_changes(pool, client, &uid).await?;

    // Then flush the outbound queue (one batch of up to 200)
    let items = sync_queue::dequeue_batch(pool, 200).await?;
    let mut completed: Vec<i64> = Vec::new();

    for item in items {
        let result = crate::sync::sync_worker::dispatch_sync_item(
            client,
            &item.table_name,
            &item.operation,
            &item.payload,
        )
        .await;

        match result {
            Ok(()) => completed.push(item.id),
            Err(e) => {
                let _ = sync_queue::mark_failed(pool, item.id, &e).await;
            }
        }
    }

    if !completed.is_empty() {
        sync_queue::mark_completed(pool, completed).await?;
    }

    Ok(())
}

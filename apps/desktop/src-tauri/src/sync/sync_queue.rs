/// Sync queue: persistent offline change log stored in SQLite.
/// CRUD operations enqueue here; sync_worker drains asynchronously.
use chrono::Utc;
use sqlx::{Row, SqlitePool};

#[derive(Debug, Clone)]
pub struct SyncQueueItem {
    pub id: i64,
    pub table_name: String,
    pub record_id: String,
    pub operation: String, // 'INSERT' | 'UPDATE' | 'DELETE'
    pub payload: Option<String>,
    pub retry_count: i32,
}

/// Append a change event to the queue. Fire-and-forget from command handlers.
pub async fn enqueue(
    pool: &SqlitePool,
    table_name: &str,
    record_id: &str,
    operation: &str,
    payload_json: Option<String>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO sync_queue (table_name, record_id, operation, payload, created_at) \
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(table_name)
    .bind(record_id)
    .bind(operation)
    .bind(payload_json)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to enqueue sync item: {e}"))?;
    Ok(())
}

/// Fetch oldest N pending items (retry_count < 5).
pub async fn dequeue_batch(pool: &SqlitePool, limit: i64) -> Result<Vec<SyncQueueItem>, String> {
    let rows = sqlx::query(
        "SELECT id, table_name, record_id, operation, payload, retry_count \
         FROM sync_queue \
         WHERE retry_count < 5 \
         ORDER BY created_at ASC \
         LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to dequeue sync batch: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| SyncQueueItem {
            id: r.get("id"),
            table_name: r.get("table_name"),
            record_id: r.get("record_id"),
            operation: r.get("operation"),
            payload: r.get("payload"),
            retry_count: r.get("retry_count"),
        })
        .collect())
}

/// Remove successfully processed items from the queue.
pub async fn mark_completed(pool: &SqlitePool, ids: Vec<i64>) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }
    // Build parameterized IN clause
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let query = format!("DELETE FROM sync_queue WHERE id IN ({placeholders})");

    let mut q = sqlx::query(&query);
    for id in &ids {
        q = q.bind(id);
    }
    q.execute(pool)
        .await
        .map_err(|e| format!("Failed to mark sync items completed: {e}"))?;
    Ok(())
}

/// Increment retry counter and store error message for a failed item.
pub async fn mark_failed(pool: &SqlitePool, id: i64, error_msg: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE sync_queue \
         SET retry_count = retry_count + 1, last_error = ? \
         WHERE id = ?",
    )
    .bind(error_msg)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to mark sync item failed: {e}"))?;
    Ok(())
}

/// Count items still pending (retry_count < 5). Used for status reporting.
pub async fn pending_count(pool: &SqlitePool) -> Result<i64, String> {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sync_queue WHERE retry_count < 5")
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to count sync queue: {e}"))?;
    Ok(count)
}

/// Delete all items — used for testing or user-initiated reset.
pub async fn clear_all(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query("DELETE FROM sync_queue")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to clear sync queue: {e}"))?;
    Ok(())
}

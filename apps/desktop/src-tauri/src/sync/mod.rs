/// Sync module: bidirectional sync between local SQLite and Supabase PostgreSQL.
/// Desktop always writes to SQLite first (offline-first), then sync is best-effort.
pub mod supabase_client;
pub mod sync_commands;
pub mod sync_queue;
pub mod sync_worker;
pub mod startup_sync;

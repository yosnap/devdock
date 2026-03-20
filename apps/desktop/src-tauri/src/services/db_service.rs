use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use tauri::Manager;

/// Initialize SQLite connection pool and run migrations
pub async fn init_db(app: &tauri::AppHandle) -> Result<SqlitePool, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {e}"))?;

    let db_path = app_dir.join("devdock.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| format!("Failed to connect to DB: {e}"))?;

    // Run embedded migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("Migration failed: {e}"))?;

    Ok(pool)
}

/// Shared DB state managed by Tauri
pub struct DbState(pub SqlitePool);

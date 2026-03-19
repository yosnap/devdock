/// Tauri IPC commands for auto-update and config export/import.
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use tauri_plugin_updater::UpdaterExt;

use crate::services::db_service::DbState;

// ── App info ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub version: String,
    pub name: String,
}

#[tauri::command]
pub fn get_app_info(app: tauri::AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        name: app.package_info().name.clone(),
    }
}

// ── Auto-updater ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
}

/// Check for a new version using the configured update endpoint.
#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await.map_err(|e| e.to_string())? {
        Some(update) => Ok(UpdateInfo {
            available: true,
            version: Some(update.version.clone()),
            notes: update.body.clone(),
        }),
        None => Ok(UpdateInfo { available: false, version: None, notes: None }),
    }
}

/// Download and install the update (triggers restart).
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Export / Import config ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub workspaces: Vec<serde_json::Value>,
    pub ide_configs: Vec<serde_json::Value>,
    pub projects: Vec<serde_json::Value>,
    pub health_config: serde_json::Value,
}

/// Export all app configuration and project metadata to JSON.
/// NOTE: OAuth tokens are never exported (they stay in keychain only).
#[tauri::command]
pub async fn export_config(db: State<'_, DbState>) -> Result<String, String> {
    let pool = &db.0;

    let workspaces = fetch_json(pool,
        "SELECT id, name, color, icon, sort_order, created_at FROM workspaces ORDER BY sort_order"
    ).await?;

    let ide_configs = fetch_json(pool,
        "SELECT id, name, command, args, icon, is_default, sort_order FROM ide_configs ORDER BY sort_order"
    ).await?;

    let projects = fetch_json(pool,
        "SELECT p.id, p.name, p.path, p.description, p.stack, p.workspace_id, p.default_ide_id,
                p.is_favorite, p.status, p.last_opened_at, p.created_at, p.updated_at,
                p.health_score, p.github_owner, p.github_repo,
                COALESCE((SELECT GROUP_CONCAT(tag) FROM project_tags WHERE project_id = p.id), '') AS tags
         FROM projects p ORDER BY p.name"
    ).await?;

    let health_config = fetch_json(pool,
        "SELECT weight_deps_outdated, weight_vulnerability, weight_ci_failing,
                weight_stale_30d, weight_stale_90d, weight_uncommitted,
                weight_no_remote, attention_threshold
         FROM health_config WHERE id = 'default' LIMIT 1"
    ).await?;

    let export = ExportData {
        version: "1.0.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        workspaces,
        ide_configs,
        projects,
        health_config: health_config.into_iter().next().unwrap_or(serde_json::Value::Null),
    };

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

/// Import configuration from a previously exported JSON string.
/// Merges workspaces and IDE configs; upserts projects by ID.
/// NEVER imports OAuth tokens or credentials.
#[tauri::command]
pub async fn import_config(json: String, db: State<'_, DbState>) -> Result<ImportResult, String> {
    let data: ExportData = serde_json::from_str(&json)
        .map_err(|e| format!("Invalid export format: {e}"))?;

    let pool = &db.0;
    let mut imported = ImportResult::default();

    // Import workspaces
    for ws in &data.workspaces {
        let id = ws["id"].as_str().unwrap_or_default();
        let name = ws["name"].as_str().unwrap_or_default();
        let color = ws["color"].as_str();
        let icon = ws["icon"].as_str();
        let sort = ws["sort_order"].as_i64().unwrap_or(0);

        let res = sqlx::query!(
            "INSERT INTO workspaces (id, name, color, icon, sort_order)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color,
               icon = excluded.icon, sort_order = excluded.sort_order",
            id, name, color, icon, sort
        ).execute(pool).await;

        if res.is_ok() { imported.workspaces += 1; }
    }

    // Import IDE configs
    for ide in &data.ide_configs {
        let id = ide["id"].as_str().unwrap_or_default();
        let name = ide["name"].as_str().unwrap_or_default();
        let command = ide["command"].as_str().unwrap_or_default();
        let args = ide["args"].as_str().unwrap_or("{}");
        let icon = ide["icon"].as_str();
        let is_default: bool = ide["is_default"].as_bool().unwrap_or(false);
        let sort: i64 = ide["sort_order"].as_i64().unwrap_or(0);

        let res = sqlx::query!(
            "INSERT INTO ide_configs (id, name, command, args, icon, is_default, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, command = excluded.command,
               args = excluded.args, icon = excluded.icon, is_default = excluded.is_default,
               sort_order = excluded.sort_order",
            id, name, command, args, icon, is_default, sort
        ).execute(pool).await;

        if res.is_ok() { imported.ide_configs += 1; }
    }

    // Import projects
    for p in &data.projects {
        let id = p["id"].as_str().unwrap_or_default();
        let name = p["name"].as_str().unwrap_or_default();
        let path = p["path"].as_str().unwrap_or_default();
        let description = p["description"].as_str();
        let stack = p["stack"].as_str();
        let workspace_id = p["workspace_id"].as_str();
        let default_ide_id = p["default_ide_id"].as_str();
        let is_favorite: bool = p["is_favorite"].as_bool().unwrap_or(false);
        let status = p["status"].as_str().unwrap_or("active");
        let tags_csv = p["tags"].as_str().unwrap_or("").to_string();
        let health_score: i64 = p["health_score"].as_i64().unwrap_or(-1);
        let github_owner = p["github_owner"].as_str();
        let github_repo = p["github_repo"].as_str();

        let res: Result<_, sqlx::Error> = sqlx::query!(
            "INSERT INTO projects
               (id, name, path, description, stack, workspace_id, default_ide_id,
                is_favorite, status, health_score, github_owner, github_repo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name, path = excluded.path, description = excluded.description,
               stack = excluded.stack, workspace_id = excluded.workspace_id,
               default_ide_id = excluded.default_ide_id, is_favorite = excluded.is_favorite,
               status = excluded.status,
               health_score = excluded.health_score, github_owner = excluded.github_owner,
               github_repo = excluded.github_repo",
            id, name, path, description, stack, workspace_id, default_ide_id,
            is_favorite, status, health_score, github_owner, github_repo
        ).execute(pool).await;

        if res.is_ok() {
            // Re-insert tags for this project
            if !tags_csv.is_empty() {
                let _ = sqlx::query!("DELETE FROM project_tags WHERE project_id = ?", id)
                    .execute(pool).await;
                for tag in tags_csv.split(',').filter(|t| !t.trim().is_empty()) {
                    let tag = tag.trim();
                    let _ = sqlx::query!(
                        "INSERT OR IGNORE INTO project_tags (project_id, tag) VALUES (?, ?)",
                        id, tag
                    ).execute(pool).await;
                }
            }
            imported.projects += 1;
        }
    }

    Ok(imported)
}

#[derive(Debug, Default, Serialize)]
pub struct ImportResult {
    pub workspaces: usize,
    pub ide_configs: usize,
    pub projects: usize,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Execute a raw SELECT and return rows as Vec<serde_json::Value>.
async fn fetch_json(pool: &SqlitePool, sql: &str) -> Result<Vec<serde_json::Value>, String> {
    use sqlx::{Column, Row, TypeInfo};

    let rows = sqlx::query(sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let result = rows
        .into_iter()
        .map(|row| {
            let cols = row.columns();
            let mut map = serde_json::Map::new();
            for col in cols {
                let name = col.name();
                let type_name = col.type_info().name();
                let val: serde_json::Value = match type_name {
                    "INTEGER" | "INT" | "BIGINT" => {
                        row.try_get::<i64, _>(name).map(|v| v.into()).unwrap_or(serde_json::Value::Null)
                    }
                    "REAL" | "FLOAT" | "DOUBLE" => {
                        row.try_get::<f64, _>(name).map(|v| v.into()).unwrap_or(serde_json::Value::Null)
                    }
                    "BOOLEAN" | "BOOL" => {
                        row.try_get::<bool, _>(name).map(|v| v.into()).unwrap_or(serde_json::Value::Null)
                    }
                    _ => {
                        row.try_get::<Option<String>, _>(name)
                            .ok()
                            .flatten()
                            .map(serde_json::Value::String)
                            .unwrap_or(serde_json::Value::Null)
                    }
                };
                map.insert(name.to_string(), val);
            }
            serde_json::Value::Object(map)
        })
        .collect();

    Ok(result)
}

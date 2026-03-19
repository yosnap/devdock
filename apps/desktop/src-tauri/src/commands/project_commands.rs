use crate::models::{CreateProjectPayload, Project, UpdateProjectPayload};
use crate::services::{db_service::DbState, ide_launcher, project_scanner, tech_detector};
use crate::services::tech_detector::TechBreakdown;
use chrono::Utc;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

/// List all projects with their tags
#[tauri::command]
pub async fn list_projects(db: State<'_, DbState>) -> Result<Vec<Project>, String> {
    let pool = &db.0;

    let rows = sqlx::query(
        r#"SELECT id, name, path, description, stack, workspace_id, default_ide_id,
           is_favorite, status, last_opened_at, created_at, updated_at, avatar
           FROM projects ORDER BY is_favorite DESC, last_opened_at DESC, name ASC"#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    let mut projects = Vec::new();
    for row in rows {
        let id: String = row.get("id");
        let tags = fetch_project_tags(pool, &id).await?;

        projects.push(Project {
            id,
            name: row.get("name"),
            path: row.get("path"),
            description: row.get("description"),
            stack: row.get("stack"),
            workspace_id: row.get("workspace_id"),
            default_ide_id: row.get("default_ide_id"),
            is_favorite: row.get::<i64, _>("is_favorite") != 0,
            status: row.get("status"),
            last_opened_at: row.get("last_opened_at"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            tags: Some(tags),
            avatar: row.get("avatar"),
        });
    }

    Ok(projects)
}

/// Add a new project, auto-detecting stack if not provided
#[tauri::command]
pub async fn add_project(
    payload: CreateProjectPayload,
    db: State<'_, DbState>,
) -> Result<Project, String> {
    let pool = &db.0;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Auto-detect stack if not provided
    let stack = payload.stack.or_else(|| {
        project_scanner::detect_stack(&payload.path).map(|d| d.stack)
    });

    sqlx::query(
        r#"INSERT INTO projects (id, name, path, description, stack, workspace_id, default_ide_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&payload.path)
    .bind(&payload.description)
    .bind(&stack)
    .bind(&payload.workspace_id)
    .bind(&payload.default_ide_id)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert project: {e}"))?;

    // Insert tags
    if let Some(tags) = &payload.tags {
        for tag in tags {
            sqlx::query("INSERT OR IGNORE INTO project_tags (project_id, tag) VALUES (?, ?)")
                .bind(&id)
                .bind(tag)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to insert tag: {e}"))?;
        }
    }

    Ok(Project {
        id,
        name: payload.name,
        path: payload.path,
        description: payload.description,
        stack,
        workspace_id: payload.workspace_id,
        default_ide_id: payload.default_ide_id,
        is_favorite: false,
        status: "active".to_string(),
        last_opened_at: None,
        created_at: now.clone(),
        updated_at: now,
        tags: payload.tags,
        avatar: None,
    })
}

/// Update project fields
#[tauri::command]
pub async fn update_project(
    payload: UpdateProjectPayload,
    db: State<'_, DbState>,
) -> Result<Project, String> {
    let pool = &db.0;
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"UPDATE projects SET
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           stack = COALESCE(?, stack),
           workspace_id = COALESCE(?, workspace_id),
           default_ide_id = COALESCE(?, default_ide_id),
           is_favorite = COALESCE(?, is_favorite),
           status = COALESCE(?, status),
           updated_at = ?
           WHERE id = ?"#,
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.stack)
    .bind(&payload.workspace_id)
    .bind(&payload.default_ide_id)
    .bind(payload.is_favorite.map(|f| if f { 1i64 } else { 0i64 }))
    .bind(&payload.status)
    .bind(&now)
    .bind(&payload.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update project: {e}"))?;

    // Replace tags if provided
    if let Some(tags) = &payload.tags {
        sqlx::query("DELETE FROM project_tags WHERE project_id = ?")
            .bind(&payload.id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to clear tags: {e}"))?;

        for tag in tags {
            sqlx::query("INSERT OR IGNORE INTO project_tags (project_id, tag) VALUES (?, ?)")
                .bind(&payload.id)
                .bind(tag)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to insert tag: {e}"))?;
        }
    }

    // Return updated project
    get_project_by_id(pool, &payload.id).await
}

/// Delete a project by ID
#[tauri::command]
pub async fn delete_project(id: String, db: State<'_, DbState>) -> Result<(), String> {
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| format!("Failed to delete project: {e}"))?;
    Ok(())
}

/// Launch a project in its configured IDE
#[tauri::command]
pub async fn launch_project(id: String, db: State<'_, DbState>) -> Result<(), String> {
    let pool = &db.0;

    // Get project + IDE config
    let row = sqlx::query(
        r#"SELECT p.path, p.default_ide_id, i.command, i.args
           FROM projects p
           LEFT JOIN ide_configs i ON p.default_ide_id = i.id
           WHERE p.id = ?"#,
    )
    .bind(&id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?
    .ok_or_else(|| format!("Project not found: {id}"))?;

    let path: String = row.get("path");
    let command: Option<String> = row.get("command");
    let args: Option<String> = row.get("args");

    let cmd = command.ok_or("No IDE configured for this project")?;
    let args_str = args.unwrap_or_else(|| "{path}".to_string());

    ide_launcher::launch_ide(&cmd, &args_str, &path)?;

    // Update last_opened_at
    let now = Utc::now().to_rfc3339();
    sqlx::query("UPDATE projects SET last_opened_at = ? WHERE id = ?")
        .bind(&now)
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update last_opened_at: {e}"))?;

    Ok(())
}

/// Detect stack for a given path
#[tauri::command]
pub async fn detect_project_stack(path: String) -> Result<Option<String>, String> {
    Ok(project_scanner::detect_stack(&path).map(|d| d.stack))
}

// --- Helpers ---

async fn fetch_project_tags(pool: &sqlx::SqlitePool, project_id: &str) -> Result<Vec<String>, String> {
    let rows = sqlx::query("SELECT tag FROM project_tags WHERE project_id = ? ORDER BY tag")
        .bind(project_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch tags: {e}"))?;

    Ok(rows.iter().map(|r| r.get::<String, _>("tag")).collect())
}

async fn get_project_by_id(pool: &sqlx::SqlitePool, id: &str) -> Result<Project, String> {
    let row = sqlx::query(
        r#"SELECT id, name, path, description, stack, workspace_id, default_ide_id,
           is_favorite, status, last_opened_at, created_at, updated_at, avatar
           FROM projects WHERE id = ?"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?
    .ok_or_else(|| format!("Project not found: {id}"))?;

    let tags = fetch_project_tags(pool, id).await?;

    Ok(Project {
        id: row.get("id"),
        name: row.get("name"),
        path: row.get("path"),
        description: row.get("description"),
        stack: row.get("stack"),
        workspace_id: row.get("workspace_id"),
        default_ide_id: row.get("default_ide_id"),
        is_favorite: row.get::<i64, _>("is_favorite") != 0,
        status: row.get("status"),
        last_opened_at: row.get("last_opened_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        tags: Some(tags),
        avatar: row.get("avatar"),
    })
}

/// Analyze a project directory and return detailed tech breakdown
#[tauri::command]
pub async fn analyze_project_tech(path: String) -> Result<TechBreakdown, String> {
    Ok(tech_detector::detect_tech_breakdown(&path))
}

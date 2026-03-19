use crate::models::{ProjectLink, ProjectNote, UpsertLinkPayload};
use crate::services::db_service::DbState;
use chrono::Utc;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

// --- Notes ---

/// Get notes for a project (creates empty note if none exists)
#[tauri::command]
pub async fn get_notes(project_id: String, db: State<'_, DbState>) -> Result<ProjectNote, String> {
    let pool = &db.0;

    // Try to fetch existing note
    let row = sqlx::query(
        "SELECT id, project_id, content, updated_at FROM project_notes WHERE project_id = ?"
    )
    .bind(&project_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    if let Some(r) = row {
        return Ok(ProjectNote {
            id: r.get("id"),
            project_id: r.get("project_id"),
            content: r.get("content"),
            updated_at: r.get("updated_at"),
        });
    }

    // Create empty note
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO project_notes (id, project_id, content, updated_at) VALUES (?, ?, '', ?)"
    )
    .bind(&id)
    .bind(&project_id)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create note: {e}"))?;

    Ok(ProjectNote {
        id,
        project_id,
        content: String::new(),
        updated_at: now,
    })
}

/// Save (upsert) notes for a project
#[tauri::command]
pub async fn save_notes(
    project_id: String,
    content: String,
    db: State<'_, DbState>,
) -> Result<ProjectNote, String> {
    let pool = &db.0;
    let now = Utc::now().to_rfc3339();

    // Check if note exists
    let existing_id: Option<String> =
        sqlx::query_scalar("SELECT id FROM project_notes WHERE project_id = ?")
            .bind(&project_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?
            .flatten();

    let id = if let Some(existing) = existing_id {
        sqlx::query("UPDATE project_notes SET content = ?, updated_at = ? WHERE project_id = ?")
            .bind(&content)
            .bind(&now)
            .bind(&project_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update note: {e}"))?;
        existing
    } else {
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO project_notes (id, project_id, content, updated_at) VALUES (?, ?, ?, ?)"
        )
        .bind(&new_id)
        .bind(&project_id)
        .bind(&content)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create note: {e}"))?;
        new_id
    };

    Ok(ProjectNote { id, project_id, content, updated_at: now })
}

// --- Links ---

/// Get all quick links for a project
#[tauri::command]
pub async fn get_links(project_id: String, db: State<'_, DbState>) -> Result<Vec<ProjectLink>, String> {
    let rows = sqlx::query(
        "SELECT id, project_id, title, url, icon, sort_order FROM project_links WHERE project_id = ? ORDER BY sort_order ASC"
    )
    .bind(&project_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| ProjectLink {
            id: r.get("id"),
            project_id: r.get("project_id"),
            title: r.get("title"),
            url: r.get("url"),
            icon: r.get("icon"),
            sort_order: r.get("sort_order"),
        })
        .collect())
}

/// Add or update a quick link
#[tauri::command]
pub async fn upsert_link(
    payload: UpsertLinkPayload,
    db: State<'_, DbState>,
) -> Result<ProjectLink, String> {
    let pool = &db.0;

    let id = match &payload.id {
        Some(existing_id) => {
            // Validate URL scheme before storing
            validate_url(&payload.url)?;
            sqlx::query(
                "UPDATE project_links SET title = ?, url = ?, icon = ? WHERE id = ?"
            )
            .bind(&payload.title)
            .bind(&payload.url)
            .bind(&payload.icon)
            .bind(existing_id)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to update link: {e}"))?;
            existing_id.clone()
        }
        None => {
            validate_url(&payload.url)?;
            let new_id = Uuid::new_v4().to_string();
            let sort_order: i32 = sqlx::query_scalar(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM project_links WHERE project_id = ?"
            )
            .bind(&payload.project_id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("DB error: {e}"))?;

            sqlx::query(
                "INSERT INTO project_links (id, project_id, title, url, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&new_id)
            .bind(&payload.project_id)
            .bind(&payload.title)
            .bind(&payload.url)
            .bind(&payload.icon)
            .bind(sort_order)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to create link: {e}"))?;
            new_id
        }
    };

    // Fetch and return updated link
    let row = sqlx::query(
        "SELECT id, project_id, title, url, icon, sort_order FROM project_links WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(ProjectLink {
        id: row.get("id"),
        project_id: row.get("project_id"),
        title: row.get("title"),
        url: row.get("url"),
        icon: row.get("icon"),
        sort_order: row.get("sort_order"),
    })
}

/// Delete a quick link
#[tauri::command]
pub async fn delete_link(id: String, db: State<'_, DbState>) -> Result<(), String> {
    sqlx::query("DELETE FROM project_links WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| format!("Failed to delete link: {e}"))?;
    Ok(())
}

/// Validate URL allows only http/https/ftp schemes
fn validate_url(url: &str) -> Result<(), String> {
    let lower = url.to_lowercase();
    if lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("ftp://")
    {
        Ok(())
    } else {
        Err(format!("Invalid URL scheme. Only http/https/ftp allowed: {url}"))
    }
}

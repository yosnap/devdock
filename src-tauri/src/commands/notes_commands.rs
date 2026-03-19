use crate::models::{
    CreateNotePayload, NoteItem, ProjectLink, ProjectNote, UpdateNotePayload, UpsertLinkPayload,
};
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

// --- Structured Note Items ---

fn row_to_note_item(r: &sqlx::sqlite::SqliteRow) -> NoteItem {
    let is_resolved: i64 = r.get("is_resolved");
    let github_issue_number: Option<i64> = r.get("github_issue_number");
    NoteItem {
        id: r.get("id"),
        project_id: r.get("project_id"),
        title: r.get("title"),
        content: r.get("content"),
        note_type: r.get("note_type"),
        github_issue_url: r.get("github_issue_url"),
        github_issue_number,
        is_resolved: is_resolved != 0,
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }
}

/// List all note items for a project
#[tauri::command]
pub async fn list_note_items(
    project_id: String,
    db: State<'_, DbState>,
) -> Result<Vec<NoteItem>, String> {
    let rows = sqlx::query(
        "SELECT id, project_id, title, content, note_type, github_issue_url, \
         github_issue_number, is_resolved, created_at, updated_at \
         FROM project_note_items WHERE project_id = ? ORDER BY created_at DESC",
    )
    .bind(&project_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(rows.iter().map(row_to_note_item).collect())
}

/// Create a new note item
#[tauri::command]
pub async fn create_note_item(
    payload: CreateNotePayload,
    db: State<'_, DbState>,
) -> Result<NoteItem, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO project_note_items \
         (id, project_id, title, content, note_type, is_resolved, created_at, updated_at) \
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&payload.project_id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&payload.note_type)
    .bind(&now)
    .bind(&now)
    .execute(&db.0)
    .await
    .map_err(|e| format!("Failed to create note item: {e}"))?;

    Ok(NoteItem {
        id,
        project_id: payload.project_id,
        title: payload.title,
        content: payload.content,
        note_type: payload.note_type,
        github_issue_url: None,
        github_issue_number: None,
        is_resolved: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Update an existing note item
#[tauri::command]
pub async fn update_note_item(
    payload: UpdateNotePayload,
    db: State<'_, DbState>,
) -> Result<NoteItem, String> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE project_note_items SET title = ?, content = ?, note_type = ?, updated_at = ? \
         WHERE id = ?",
    )
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&payload.note_type)
    .bind(&now)
    .bind(&payload.id)
    .execute(&db.0)
    .await
    .map_err(|e| format!("Failed to update note item: {e}"))?;

    let row = sqlx::query(
        "SELECT id, project_id, title, content, note_type, github_issue_url, \
         github_issue_number, is_resolved, created_at, updated_at \
         FROM project_note_items WHERE id = ?",
    )
    .bind(&payload.id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(row_to_note_item(&row))
}

/// Toggle resolved state of a note item
#[tauri::command]
pub async fn toggle_note_resolved(
    id: String,
    db: State<'_, DbState>,
) -> Result<NoteItem, String> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE project_note_items SET is_resolved = NOT is_resolved, updated_at = ? WHERE id = ?",
    )
    .bind(&now)
    .bind(&id)
    .execute(&db.0)
    .await
    .map_err(|e| format!("Failed to toggle note: {e}"))?;

    let row = sqlx::query(
        "SELECT id, project_id, title, content, note_type, github_issue_url, \
         github_issue_number, is_resolved, created_at, updated_at \
         FROM project_note_items WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(row_to_note_item(&row))
}

/// Delete a note item
#[tauri::command]
pub async fn delete_note_item(id: String, db: State<'_, DbState>) -> Result<(), String> {
    sqlx::query("DELETE FROM project_note_items WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| format!("Failed to delete note item: {e}"))?;
    Ok(())
}

/// Link a GitHub issue to a note item (called after creating the issue)
#[tauri::command]
pub async fn link_note_to_issue(
    id: String,
    issue_url: String,
    issue_number: i64,
    db: State<'_, DbState>,
) -> Result<NoteItem, String> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE project_note_items SET github_issue_url = ?, github_issue_number = ?, \
         updated_at = ? WHERE id = ?",
    )
    .bind(&issue_url)
    .bind(issue_number)
    .bind(&now)
    .bind(&id)
    .execute(&db.0)
    .await
    .map_err(|e| format!("Failed to link issue: {e}"))?;

    let row = sqlx::query(
        "SELECT id, project_id, title, content, note_type, github_issue_url, \
         github_issue_number, is_resolved, created_at, updated_at \
         FROM project_note_items WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(row_to_note_item(&row))
}

// --- App Preferences ---

/// Get a preference value by key
#[tauri::command]
pub async fn get_preference(key: String, db: State<'_, DbState>) -> Result<Option<String>, String> {
    let value: Option<String> =
        sqlx::query_scalar("SELECT value FROM app_preferences WHERE key = ?")
            .bind(&key)
            .fetch_optional(&db.0)
            .await
            .map_err(|e| format!("DB error: {e}"))?
            .flatten();
    Ok(value)
}

/// Set a preference value by key
#[tauri::command]
pub async fn set_preference(
    key: String,
    value: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO app_preferences (key, value) VALUES (?, ?) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(&db.0)
    .await
    .map_err(|e| format!("Failed to set preference: {e}"))?;
    Ok(())
}

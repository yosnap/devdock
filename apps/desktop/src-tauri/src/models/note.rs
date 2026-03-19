use serde::{Deserialize, Serialize};

/// Markdown notes for a project (legacy single-note)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectNote {
    pub id: String,
    pub project_id: String,
    pub content: String,
    pub updated_at: String,
}

/// Structured note item with type classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteItem {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub content: String,
    pub note_type: String, // 'bug' | 'idea' | 'task' | 'reminder' | 'note'
    pub github_issue_url: Option<String>,
    pub github_issue_number: Option<i64>,
    pub is_resolved: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Payload for creating a note item
#[derive(Debug, Deserialize)]
pub struct CreateNotePayload {
    pub project_id: String,
    pub title: String,
    pub content: String,
    pub note_type: String,
}

/// Payload for updating a note item
#[derive(Debug, Deserialize)]
pub struct UpdateNotePayload {
    pub id: String,
    pub title: String,
    pub content: String,
    pub note_type: String,
}

/// Quick link attached to a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectLink {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub url: String,
    pub icon: Option<String>,
    pub sort_order: i32,
}

/// Payload for creating/updating a link
#[derive(Debug, Deserialize)]
pub struct UpsertLinkPayload {
    pub id: Option<String>,
    pub project_id: String,
    pub title: String,
    pub url: String,
    pub icon: Option<String>,
}

use serde::{Deserialize, Serialize};

/// Markdown notes for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectNote {
    pub id: String,
    pub project_id: String,
    pub content: String,
    pub updated_at: String,
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

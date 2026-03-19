use serde::{Deserialize, Serialize};

/// Workspace: logical grouping of projects
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
}

/// Payload for creating a workspace
#[derive(Debug, Deserialize)]
pub struct CreateWorkspacePayload {
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
}

/// Payload for updating a workspace
#[derive(Debug, Deserialize)]
pub struct UpdateWorkspacePayload {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
}

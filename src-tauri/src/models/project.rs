use serde::{Deserialize, Serialize};

/// Project status variants
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProjectStatus {
    Active,
    Paused,
    Archived,
}

impl Default for ProjectStatus {
    fn default() -> Self {
        ProjectStatus::Active
    }
}

impl std::fmt::Display for ProjectStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectStatus::Active => write!(f, "active"),
            ProjectStatus::Paused => write!(f, "paused"),
            ProjectStatus::Archived => write!(f, "archived"),
        }
    }
}

/// Core project entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub stack: Option<String>,
    pub workspace_id: Option<String>,
    pub default_ide_id: Option<String>,
    pub is_favorite: bool,
    pub status: String,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Avatar filename stored in app_data/avatars/
    pub avatar: Option<String>,
    /// GitHub repository owner (e.g. "yosnap")
    pub github_owner: Option<String>,
    /// GitHub repository name (e.g. "devdock")
    pub github_repo: Option<String>,
}

/// Payload for creating a new project
#[derive(Debug, Deserialize)]
pub struct CreateProjectPayload {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub stack: Option<String>,
    pub workspace_id: Option<String>,
    pub default_ide_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Payload for updating an existing project
#[derive(Debug, Deserialize)]
pub struct UpdateProjectPayload {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub stack: Option<String>,
    pub workspace_id: Option<String>,
    pub default_ide_id: Option<String>,
    pub is_favorite: Option<bool>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
}

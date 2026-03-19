use serde::{Deserialize, Serialize};

/// IDE configuration for launching projects
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdeConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    /// Template string where `{path}` is replaced with the project path
    pub args: String,
    pub icon: Option<String>,
    pub is_default: bool,
    pub sort_order: i32,
}

/// Payload for creating a new IDE config
#[derive(Debug, Deserialize)]
pub struct CreateIdePayload {
    pub name: String,
    pub command: String,
    pub args: Option<String>,
    pub icon: Option<String>,
    pub is_default: Option<bool>,
}

/// Payload for updating an IDE config
#[derive(Debug, Deserialize)]
pub struct UpdateIdePayload {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<String>,
    pub icon: Option<String>,
    pub is_default: Option<bool>,
    pub sort_order: Option<i32>,
}

use serde::{Deserialize, Serialize};

/// Cached git status for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub project_id: String,
    pub branch: Option<String>,
    pub uncommitted_count: i32,
    pub ahead: i32,
    pub behind: i32,
    pub last_commit_msg: Option<String>,
    pub last_commit_author: Option<String>,
    pub last_commit_date: Option<String>,
    pub remote_url: Option<String>,
    pub updated_at: String,
}

/// Live git info from git2 (not DB)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitInfo {
    pub branch: Option<String>,
    pub uncommitted_count: i32,
    pub ahead: i32,
    pub behind: i32,
    pub last_commit_msg: Option<String>,
    pub last_commit_author: Option<String>,
    pub last_commit_date: Option<String>,
    pub remote_url: Option<String>,
    pub is_git_repo: bool,
}

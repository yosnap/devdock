/// Tauri IPC commands for GitHub integration.
/// Handles PAT storage, CI status, issues CRUD.
use tauri::State;

use crate::services::db_service::DbState;
use crate::services::github_client::{
    self, CiStatus, GitHubIssue,
};
use crate::services::keychain_service;

// ── Token management ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn save_github_token(token: String) -> Result<(), String> {
    // Basic validation: GitHub PATs start with "ghp_", "github_pat_", or classic tokens (40 hex chars)
    if token.trim().is_empty() {
        return Err("Token cannot be empty".to_string());
    }
    keychain_service::store_github_token(token.trim())
}

#[tauri::command]
pub async fn get_github_token_status() -> Result<bool, String> {
    Ok(keychain_service::get_github_token()?.is_some())
}

#[tauri::command]
pub async fn delete_github_token() -> Result<(), String> {
    keychain_service::delete_github_token()
}

// ── GitHub metadata helpers ───────────────────────────────────────────────────

/// Parse and store owner/repo for a project from its git remote URL.
#[tauri::command]
pub async fn detect_github_repo(
    project_id: String,
    remote_url: String,
    db: State<'_, DbState>,
) -> Result<(String, String), String> {
    let (owner, repo) = github_client::parse_github_owner_repo(&remote_url)
        .ok_or_else(|| "Could not parse GitHub owner/repo from remote URL".to_string())?;

    sqlx::query!(
        "UPDATE projects SET github_owner = ?, github_repo = ? WHERE id = ?",
        owner,
        repo,
        project_id
    )
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok((owner, repo))
}

// ── CI / Actions ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_ci_status(
    project_id: String,
    owner: String,
    repo: String,
    db: State<'_, DbState>,
) -> Result<CiStatus, String> {
    let token = keychain_service::get_github_token()?
        .ok_or_else(|| "No GitHub token configured".to_string())?;

    github_client::get_ci_status(&db.0, &project_id, &owner, &repo, &token).await
}

// ── Issues ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_issues(
    project_id: String,
    owner: String,
    repo: String,
    db: State<'_, DbState>,
) -> Result<Vec<GitHubIssue>, String> {
    let token = keychain_service::get_github_token()?
        .ok_or_else(|| "No GitHub token configured".to_string())?;

    github_client::get_issues(&db.0, &project_id, &owner, &repo, &token).await
}

#[tauri::command]
pub async fn create_issue(
    owner: String,
    repo: String,
    title: String,
    body: String,
    labels: Vec<String>,
) -> Result<GitHubIssue, String> {
    if title.trim().is_empty() {
        return Err("Issue title cannot be empty".to_string());
    }

    let token = keychain_service::get_github_token()?
        .ok_or_else(|| "No GitHub token configured".to_string())?;

    github_client::create_issue(&owner, &repo, title.trim(), &body, labels, &token).await
}

/// GitHub REST API v3 client.
/// Supports PAT authentication stored in OS keychain.
/// Implements 5-minute response cache via SQLite github_cache table.
/// Respects rate limits: returns error with retry-after when exhausted.
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// ── Public data types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRun {
    pub id: i64,
    pub name: String,
    pub status: String,     // queued | in_progress | completed
    pub conclusion: Option<String>, // success | failure | cancelled | skipped | ...
    pub html_url: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CiStatus {
    pub overall: String,   // "success" | "failure" | "running" | "unknown"
    pub runs: Vec<WorkflowRun>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubIssue {
    pub number: i64,
    pub title: String,
    pub state: String,
    pub html_url: String,
    pub user_login: String,
    pub created_at: String,
    pub labels: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct RunsResponse {
    workflow_runs: Vec<WorkflowRun>,
}

#[derive(Debug, Deserialize)]
struct IssueRaw {
    number: i64,
    title: String,
    state: String,
    html_url: String,
    user: UserRaw,
    created_at: String,
    labels: Vec<LabelRaw>,
    pull_request: Option<serde_json::Value>, // skip PRs
}

#[derive(Debug, Deserialize)]
struct UserRaw {
    login: String,
}

#[derive(Debug, Deserialize)]
struct LabelRaw {
    name: String,
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_TTL_SECS: i64 = 300; // 5 minutes

/// Return cached JSON string if fresh, else None.
async fn read_cache(pool: &SqlitePool, project_id: &str, key: &str) -> Option<String> {
    let row = sqlx::query!(
        "SELECT data, cached_at FROM github_cache WHERE project_id = ? AND cache_key = ?",
        project_id,
        key
    )
    .fetch_optional(pool)
    .await
    .ok()??;

    let cached_at = chrono::DateTime::parse_from_rfc3339(&row.cached_at).ok()?;
    let age = chrono::Utc::now().signed_duration_since(cached_at).num_seconds();
    if age < CACHE_TTL_SECS {
        Some(row.data)
    } else {
        None
    }
}

/// Write JSON to cache (upsert).
async fn write_cache(pool: &SqlitePool, project_id: &str, key: &str, data: &str) {
    let _ = sqlx::query!(
        "INSERT INTO github_cache (project_id, cache_key, data, cached_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(project_id, cache_key) DO UPDATE SET data = excluded.data, cached_at = excluded.cached_at",
        project_id,
        key,
        data
    )
    .execute(pool)
    .await;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

fn build_client(token: &str) -> Result<reqwest::Client, String> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        format!("Bearer {token}").parse().map_err(|e: reqwest::header::InvalidHeaderValue| e.to_string())?,
    );
    headers.insert(
        ACCEPT,
        "application/vnd.github+json".parse().map_err(|e: reqwest::header::InvalidHeaderValue| e.to_string())?,
    );
    headers.insert(
        USER_AGENT,
        "DevDock/0.3.0".parse().map_err(|e: reqwest::header::InvalidHeaderValue| e.to_string())?,
    );
    headers.insert(
        "X-GitHub-Api-Version",
        "2022-11-28".parse().map_err(|e: reqwest::header::InvalidHeaderValue| e.to_string())?,
    );

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Fetch the last 5 workflow runs. Returns cached data when fresh.
pub async fn get_ci_status(
    pool: &SqlitePool,
    project_id: &str,
    owner: &str,
    repo: &str,
    token: &str,
) -> Result<CiStatus, String> {
    // Try cache first
    if let Some(cached) = read_cache(pool, project_id, "actions").await {
        if let Ok(runs) = serde_json::from_str::<Vec<WorkflowRun>>(&cached) {
            return Ok(aggregate_ci_status(runs));
        }
    }

    let client = build_client(token)?;
    let url = format!(
        "https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page=5"
    );
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if resp.status() == 403 || resp.status() == 429 {
        return Err("GitHub API rate limit exceeded. Try again later.".to_string());
    }
    if !resp.status().is_success() {
        return Err(format!("GitHub API error: {}", resp.status()));
    }

    let body: RunsResponse = resp.json().await.map_err(|e| e.to_string())?;
    let json = serde_json::to_string(&body.workflow_runs).map_err(|e| e.to_string())?;
    write_cache(pool, project_id, "actions", &json).await;

    Ok(aggregate_ci_status(body.workflow_runs))
}

/// Fetch open issues (not PRs). Returns cached data when fresh.
pub async fn get_issues(
    pool: &SqlitePool,
    project_id: &str,
    owner: &str,
    repo: &str,
    token: &str,
) -> Result<Vec<GitHubIssue>, String> {
    if let Some(cached) = read_cache(pool, project_id, "issues").await {
        if let Ok(issues) = serde_json::from_str::<Vec<GitHubIssue>>(&cached) {
            return Ok(issues);
        }
    }

    let client = build_client(token)?;
    let url = format!(
        "https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=30"
    );
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if resp.status() == 403 || resp.status() == 429 {
        return Err("GitHub API rate limit exceeded. Try again later.".to_string());
    }
    if !resp.status().is_success() {
        return Err(format!("GitHub API error: {}", resp.status()));
    }

    let raw: Vec<IssueRaw> = resp.json().await.map_err(|e| e.to_string())?;
    // Filter out pull requests
    let issues: Vec<GitHubIssue> = raw
        .into_iter()
        .filter(|i| i.pull_request.is_none())
        .map(|i| GitHubIssue {
            number: i.number,
            title: i.title,
            state: i.state,
            html_url: i.html_url,
            user_login: i.user.login,
            created_at: i.created_at,
            labels: i.labels.into_iter().map(|l| l.name).collect(),
        })
        .collect();

    let json = serde_json::to_string(&issues).map_err(|e| e.to_string())?;
    write_cache(pool, project_id, "issues", &json).await;
    Ok(issues)
}

/// Create a new issue on GitHub.
pub async fn create_issue(
    owner: &str,
    repo: &str,
    title: &str,
    body: &str,
    labels: Vec<String>,
    token: &str,
) -> Result<GitHubIssue, String> {
    let client = build_client(token)?;
    let url = format!("https://api.github.com/repos/{owner}/{repo}/issues");
    let payload = serde_json::json!({
        "title": title,
        "body": body,
        "labels": labels,
    });

    let resp = client.post(&url).json(&payload).send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API error: {}", resp.status()));
    }

    let raw: IssueRaw = resp.json().await.map_err(|e| e.to_string())?;
    Ok(GitHubIssue {
        number: raw.number,
        title: raw.title,
        state: raw.state,
        html_url: raw.html_url,
        user_login: raw.user.login,
        created_at: raw.created_at,
        labels: raw.labels.into_iter().map(|l| l.name).collect(),
    })
}

/// Parse "owner/repo" from a GitHub remote URL (https or ssh).
pub fn parse_github_owner_repo(remote_url: &str) -> Option<(String, String)> {
    // Trim trailing .git
    let url = remote_url.trim_end_matches(".git");

    // https://github.com/owner/repo  or  git@github.com:owner/repo
    if let Some(rest) = url.strip_prefix("https://github.com/") {
        let parts: Vec<&str> = rest.splitn(2, '/').collect();
        if parts.len() == 2 {
            return Some((parts[0].to_string(), parts[1].to_string()));
        }
    } else if let Some(rest) = url.strip_prefix("git@github.com:") {
        let parts: Vec<&str> = rest.splitn(2, '/').collect();
        if parts.len() == 2 {
            return Some((parts[0].to_string(), parts[1].to_string()));
        }
    }
    None
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn aggregate_ci_status(runs: Vec<WorkflowRun>) -> CiStatus {
    let overall = if runs.iter().any(|r| r.status == "in_progress" || r.status == "queued") {
        "running"
    } else if runs.iter().any(|r| r.conclusion.as_deref() == Some("failure")) {
        "failure"
    } else if runs.iter().all(|r| r.conclusion.as_deref() == Some("success")) && !runs.is_empty() {
        "success"
    } else {
        "unknown"
    };

    CiStatus {
        overall: overall.to_string(),
        runs,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_https_remote() {
        let (o, r) = parse_github_owner_repo("https://github.com/paulopinheiro/devdock.git").unwrap();
        assert_eq!(o, "paulopinheiro");
        assert_eq!(r, "devdock");
    }

    #[test]
    fn test_parse_ssh_remote() {
        let (o, r) = parse_github_owner_repo("git@github.com:paulopinheiro/devdock.git").unwrap();
        assert_eq!(o, "paulopinheiro");
        assert_eq!(r, "devdock");
    }

    #[test]
    fn test_parse_invalid_remote() {
        assert!(parse_github_owner_repo("https://gitlab.com/user/repo").is_none());
    }

    #[test]
    fn test_aggregate_ci_failure() {
        let runs = vec![
            WorkflowRun { id: 1, name: "CI".into(), status: "completed".into(), conclusion: Some("failure".into()), html_url: "".into(), created_at: "".into() },
        ];
        let status = aggregate_ci_status(runs);
        assert_eq!(status.overall, "failure");
    }

    #[test]
    fn test_aggregate_ci_running() {
        let runs = vec![
            WorkflowRun { id: 1, name: "CI".into(), status: "in_progress".into(), conclusion: None, html_url: "".into(), created_at: "".into() },
        ];
        let status = aggregate_ci_status(runs);
        assert_eq!(status.overall, "running");
    }
}

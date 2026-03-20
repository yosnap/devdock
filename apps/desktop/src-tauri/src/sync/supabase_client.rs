/// Supabase REST API client for sync operations.
/// All writes use POST with Prefer: resolution=merge-duplicates for upserts.
/// Token is stored in OS keychain and refreshed externally via set_access_token().
use serde::Serialize;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;

// --- Sync DTOs (only syncable fields — no path, no default_ide_id) ---

#[derive(Debug, Serialize, Clone)]
pub struct ProjectSync {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub stack: Option<String>,
    pub workspace_id: Option<String>,
    pub is_favorite: bool,
    pub status: String,
    pub health_score: i32,
    pub github_owner: Option<String>,
    pub github_repo: Option<String>,
    pub avatar: Option<String>,
    pub last_opened_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct WorkspaceSync {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct NoteItemSync {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub content: Option<String>,
    pub note_type: String,
    pub is_resolved: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct LinkSync {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub url: String,
    pub icon: Option<String>,
    pub sort_order: i32,
}

// --- Client ---

pub struct SupabaseClient {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
    /// JWT refreshed externally; stored behind RwLock for concurrent access
    access_token: Arc<RwLock<String>>,
}

impl SupabaseClient {
    pub fn new(base_url: String, api_key: String, access_token: String) -> Self {
        Self {
            http: reqwest::Client::new(),
            base_url,
            api_key,
            access_token: Arc::new(RwLock::new(access_token)),
        }
    }

    /// Update JWT after token refresh (called by auth layer)
    pub async fn set_access_token(&self, token: String) {
        let mut guard = self.access_token.write().await;
        *guard = token;
    }

    /// Build auth headers for every request
    async fn auth_headers(&self) -> [(&'static str, String); 3] {
        let token = self.access_token.read().await.clone();
        [
            ("apikey", self.api_key.clone()),
            ("Authorization", format!("Bearer {}", token)),
            ("Prefer", "return=minimal".to_string()),
        ]
    }

    /// POST upsert to /rest/v1/{table} with merge-duplicates resolution
    async fn upsert<T: Serialize>(&self, table: &str, body: &T) -> Result<(), String> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        let headers = self.auth_headers().await;

        let mut req = self
            .http
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates,return=minimal");

        for (k, v) in &headers {
            req = req.header(*k, v);
        }

        let resp = req
            .json(body)
            .send()
            .await
            .map_err(|e| format!("HTTP error upserting {table}: {e}"))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            Err(format!("Supabase upsert {table} failed [{status}]: {text}"))
        }
    }

    pub async fn upsert_project(&self, project: &ProjectSync) -> Result<(), String> {
        self.upsert("projects", project).await
    }

    pub async fn upsert_workspace(&self, ws: &WorkspaceSync) -> Result<(), String> {
        self.upsert("workspaces", ws).await
    }

    pub async fn upsert_note_item(&self, note: &NoteItemSync) -> Result<(), String> {
        self.upsert("project_note_items", note).await
    }

    pub async fn upsert_link(&self, link: &LinkSync) -> Result<(), String> {
        self.upsert("project_links", link).await
    }

    /// Soft-delete: PATCH {table}?id=eq.{id} with deleted_at = now()
    pub async fn soft_delete_record(&self, table: &str, id: &str) -> Result<(), String> {
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, id);
        let headers = self.auth_headers().await;
        let now = chrono::Utc::now().to_rfc3339();

        let mut req = self
            .http
            .patch(&url)
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal");

        for (k, v) in &headers {
            req = req.header(*k, v);
        }

        let body = serde_json::json!({ "deleted_at": now });
        let resp = req
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("HTTP error soft-deleting {table}/{id}: {e}"))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            Err(format!("Soft-delete {table}/{id} failed [{status}]: {text}"))
        }
    }

    /// Fetch rows updated since a timestamp for a given table and user
    pub async fn fetch_changes(
        &self,
        table: &str,
        since: &str,
        user_id: &str,
    ) -> Result<Vec<Value>, String> {
        let url = format!(
            "{}/rest/v1/{}?updated_at=gt.{}&user_id=eq.{}&order=updated_at.asc",
            self.base_url, table, since, user_id
        );
        let headers = self.auth_headers().await;

        let mut req = self.http.get(&url).header("Accept", "application/json");
        for (k, v) in &headers {
            req = req.header(*k, v);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("HTTP error fetching changes for {table}: {e}"))?;

        if resp.status().is_success() {
            resp.json::<Vec<Value>>()
                .await
                .map_err(|e| format!("JSON parse error for {table}: {e}"))
        } else {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            Err(format!("fetch_changes {table} failed [{status}]: {text}"))
        }
    }

    /// HEAD request to check connectivity
    pub async fn check_connectivity(&self) -> bool {
        let url = format!("{}/rest/v1/", self.base_url);
        let headers = self.auth_headers().await;

        let mut req = self.http.head(&url);
        for (k, v) in &headers {
            req = req.header(*k, v);
        }

        req.send().await.map(|r| r.status().as_u16() < 500).unwrap_or(false)
    }
}

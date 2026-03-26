/// Tauri commands for Supabase authentication (email/password + GitHub OAuth).
/// The desktop app remains fully functional offline — auth only enables sync.
use crate::services::keychain_service;
use crate::services::db_service::DbState;
use crate::auth::token_refresh;
use crate::sync::sync_commands::SupabaseState;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;

// Supabase credentials — baked in at compile time for desktop (no backend secret required)
const SUPABASE_URL: &str = "https://wrlwhuxmtnmocfootpxh.supabase.co";
const SUPABASE_ANON_KEY: &str = "sb_publishable_Yaw1VVE2hLvm4rJVsWV8ig_GBInoQ-9";

// --- DTOs ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Deserialize)]
struct SignInResponse {
    access_token: String,
    refresh_token: String,
    user: SignInUser,
}

#[derive(Deserialize)]
struct SignInUser {
    id: String,
    email: Option<String>,
}

#[derive(Deserialize)]
struct UserResponse {
    id: String,
    email: Option<String>,
}

// --- Commands ---

/// Sign in with email + password via Supabase Auth REST API.
/// Stores tokens in OS keychain and emits `auth:signed-in` event.
#[tauri::command]
pub async fn sign_in_with_email(
    email: String,
    password: String,
    app: tauri::AppHandle,
) -> Result<AuthUser, String> {
    let url = format!("{}/auth/v1/token?grant_type=password", SUPABASE_URL);
    let body = serde_json::json!({ "email": email, "password": password });

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Sign-in HTTP error: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Sign-in failed [{status}]: {text}"));
    }

    let data: SignInResponse = resp
        .json()
        .await
        .map_err(|e| format!("Sign-in JSON parse error: {e}"))?;

    let user = AuthUser {
        id: data.user.id,
        email: data.user.email.unwrap_or_else(|| email.clone()),
        access_token: data.access_token.clone(),
        refresh_token: data.refresh_token.clone(),
    };

    // Persist tokens to OS keychain
    keychain_service::store_supabase_token(&data.access_token)
        .map_err(|e| format!("Keychain store error: {e}"))?;
    keychain_service::store_supabase_refresh_token(&data.refresh_token)
        .map_err(|e| format!("Keychain store error: {e}"))?;

    // Update running sync worker with new token
    if let Some(supabase) = app.try_state::<SupabaseState>() {
        supabase.0.set_access_token(user.access_token.clone()).await;
    }

    // Save user_id to app_preferences + backfill sync_queue
    if let Ok(db) = app.try_state::<DbState>().ok_or(()) {
        let uid = user.id.clone();
        // Persist user_id for sync worker and background tasks
        let _ = sqlx::query(
            "INSERT OR REPLACE INTO app_preferences (key, value) VALUES ('user_id', ?)"
        )
        .bind(&uid)
        .execute(&db.0)
        .await;

        // Backfill user_id into pending sync_queue items (created before login)
        let _ = sqlx::query(
            "UPDATE sync_queue
             SET payload = json_set(COALESCE(payload, '{}'), '$.user_id', ?),
                 retry_count = CASE
                     WHEN COALESCE(last_error, '') LIKE 'Missing required field: user_id%' THEN 0
                     ELSE retry_count
                 END,
                 last_error = CASE
                     WHEN COALESCE(last_error, '') LIKE 'Missing required field: user_id%' THEN NULL
                     ELSE last_error
                 END
             WHERE operation IN ('INSERT','UPDATE')
               AND (payload IS NULL
                 OR json_extract(payload, '$.user_id') IS NULL
                 OR json_extract(payload, '$.user_id') = '')"
        )
        .bind(&uid)
        .execute(&db.0)
        .await;
    }

    // Notify frontend
    app.emit("auth:signed-in", &user)
        .map_err(|e| format!("Event emit error: {e}"))?;

    Ok(user)
}

/// Sign out: revoke server session, clear keychain, emit `auth:signed-out`.
#[tauri::command]
pub async fn sign_out(app: tauri::AppHandle) -> Result<(), String> {
    // Attempt server-side logout — best-effort, don't fail if offline
    if let Ok(Some(token)) = keychain_service::get_supabase_token() {
        let url = format!("{}/auth/v1/logout", SUPABASE_URL);
        let client = reqwest::Client::new();
        let _ = client
            .post(&url)
            .header("apikey", SUPABASE_ANON_KEY)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await;
    }

    // Clear local credentials regardless of network result
    keychain_service::delete_supabase_tokens()
        .map_err(|e| format!("Keychain delete error: {e}"))?;

    app.emit("auth:signed-out", ())
        .map_err(|e| format!("Event emit error: {e}"))?;

    Ok(())
}

/// OAuth callback port — a temporary HTTP server listens here to capture tokens.
/// Must be added to Supabase Redirect URLs: http://localhost:17365/auth/callback
const OAUTH_CALLBACK_PORT: u16 = 17365;

/// Open browser for GitHub OAuth via Supabase.
/// Spawns a one-shot HTTP server to capture the callback token,
/// then stores it in keychain and emits auth:signed-in.
#[tauri::command]
pub async fn sign_in_with_github(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(debug_assertions)]
    let redirect = format!("http://localhost:{}/auth/callback", OAUTH_CALLBACK_PORT);
    #[cfg(not(debug_assertions))]
    let redirect = "devdock://auth/callback".to_string();

    let encoded_redirect = redirect.replace(':', "%3A").replace('/', "%2F");
    let oauth_url = format!(
        "{}/auth/v1/authorize?provider=github&redirect_to={}",
        SUPABASE_URL, encoded_redirect
    );

    // Spawn the one-shot callback server before opening the browser
    let app_clone = app.clone();
    tokio::spawn(async move {
        if let Err(e) = wait_for_oauth_callback(&app_clone).await {
            eprintln!("[oauth] Callback server error: {e}");
        }
    });

    app.opener()
        .open_url(&oauth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {e}"))?;
    Ok(())
}

/// Listens on localhost:OAUTH_CALLBACK_PORT for the OAuth redirect.
/// Strategy: first request gets an HTML page that reads the URL fragment with JS
/// and makes a second GET request with tokens as query params (fragments never reach server).
async fn wait_for_oauth_callback(app: &tauri::AppHandle) -> Result<(), String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let addr = format!("127.0.0.1:{}", OAUTH_CALLBACK_PORT);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Cannot bind callback server: {e}"))?;

    // First connection: Supabase redirects here with fragment — serve JS to re-send tokens
    {
        let (mut stream, _) = listener.accept().await
            .map_err(|e| format!("Accept error: {e}"))?;
        let mut buf = vec![0u8; 4096];
        let _ = stream.read(&mut buf).await;

        // JS reads fragment and redirects to /token?access_token=...
        let html = r#"<!DOCTYPE html><html><head><title>DevDock</title></head><body>
<p>Completing sign in...</p>
<script>
  const params = new URLSearchParams(window.location.hash.slice(1));
  const at = params.get('access_token') || '';
  const rt = params.get('refresh_token') || '';
  window.location.href = '/token?access_token=' + encodeURIComponent(at) + '&refresh_token=' + encodeURIComponent(rt);
</script></body></html>"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            html.len(), html
        );
        let _ = stream.write_all(response.as_bytes()).await;
    }

    // Second connection: JS sends GET /token?access_token=X&refresh_token=Y
    let (mut stream, _) = listener.accept().await
        .map_err(|e| format!("Accept error: {e}"))?;
    let mut buf = vec![0u8; 8192];
    let n = stream.read(&mut buf).await.map_err(|e| format!("Read error: {e}"))?;
    let request = String::from_utf8_lossy(&buf[..n]);

    let path = request.lines().next()
        .and_then(|l| l.split_whitespace().nth(1))
        .unwrap_or("");
    let query = path.split('?').nth(1).unwrap_or("");

    let mut access_token = String::new();
    let mut refresh_token = String::new();
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        match (parts.next(), parts.next()) {
            (Some("access_token"), Some(v)) => access_token = urldecode(v),
            (Some("refresh_token"), Some(v)) => refresh_token = urldecode(v),
            _ => {}
        }
    }

    let success = !access_token.is_empty();
    let html = if success {
        "<!DOCTYPE html><html><body><h2>Signed in to DevDock!</h2><p>You can close this tab.</p><script>setTimeout(()=>window.close(),1000)</script></body></html>"
    } else {
        "<!DOCTYPE html><html><body><h2>Sign in failed</h2><p>No token received.</p></body></html>"
    };
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(), html
    );
    let _ = stream.write_all(response.as_bytes()).await;
    drop(stream);

    if !success {
        return Err("No access_token in OAuth callback".to_string());
    }

    handle_oauth_callback(app, &format!(
        "devdock://auth/callback#access_token={}&refresh_token={}",
        access_token, refresh_token
    )).await
}

fn urldecode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = std::str::from_utf8(&bytes[i+1..i+3]) {
                if let Ok(byte) = u8::from_str_radix(hex, 16) {
                    result.push(byte as char);
                    i += 3;
                    continue;
                }
            }
        } else if bytes[i] == b'+' {
            result.push(' ');
            i += 1;
            continue;
        }
        result.push(bytes[i] as char);
        i += 1;
    }
    result
}

/// Complete OAuth flow after deep-link callback.
/// Called from lib.rs deep-link handler with the full callback URL.
/// Exchanges the URL fragment tokens and stores them in keychain.
pub async fn handle_oauth_callback(app: &tauri::AppHandle, url: &str) -> Result<(), String> {
    // Parse fragment: devdock://auth/callback#access_token=X&refresh_token=Y&...
    let fragment = url.split('#').nth(1).unwrap_or("");
    let mut access_token = String::new();
    let mut refresh_token = String::new();

    for pair in fragment.split('&') {
        let mut parts = pair.splitn(2, '=');
        match (parts.next(), parts.next()) {
            (Some("access_token"), Some(v)) => access_token = v.to_string(),
            (Some("refresh_token"), Some(v)) => refresh_token = v.to_string(),
            _ => {}
        }
    }

    if access_token.is_empty() {
        return Err("OAuth callback missing access_token".to_string());
    }

    // Persist tokens
    keychain_service::store_supabase_token(&access_token)
        .map_err(|e| format!("Keychain store error: {e}"))?;
    if !refresh_token.is_empty() {
        keychain_service::store_supabase_refresh_token(&refresh_token)
            .map_err(|e| format!("Keychain store error: {e}"))?;
    }

    // Fetch user info to emit auth:signed-in
    let client = reqwest::Client::new();
    let user_url = format!("{}/auth/v1/user", SUPABASE_URL);
    let resp = client
        .get(&user_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("User fetch error: {e}"))?;

    #[derive(Deserialize)]
    struct OAuthUser { id: String, email: Option<String> }

    let user_data: OAuthUser = resp
        .json()
        .await
        .map_err(|e| format!("User JSON parse error: {e}"))?;

    let auth_user = AuthUser {
        id: user_data.id,
        email: user_data.email.unwrap_or_default(),
        access_token,
        refresh_token,
    };

    // Update running sync worker with new token so sync starts immediately
    if let Some(supabase) = app.try_state::<SupabaseState>() {
        supabase.0.set_access_token(auth_user.access_token.clone()).await;
    }

    // Save user_id + backfill sync_queue
    if let Ok(db) = app.try_state::<DbState>().ok_or(()) {
        let uid = auth_user.id.clone();
        let _ = sqlx::query(
            "INSERT OR REPLACE INTO app_preferences (key, value) VALUES ('user_id', ?)"
        )
        .bind(&uid)
        .execute(&db.0)
        .await;

        let _ = sqlx::query(
            "UPDATE sync_queue
             SET payload = json_set(COALESCE(payload, '{}'), '$.user_id', ?),
                 retry_count = CASE
                     WHEN COALESCE(last_error, '') LIKE 'Missing required field: user_id%' THEN 0
                     ELSE retry_count
                 END,
                 last_error = CASE
                     WHEN COALESCE(last_error, '') LIKE 'Missing required field: user_id%' THEN NULL
                     ELSE last_error
                 END
             WHERE operation IN ('INSERT','UPDATE')
               AND (payload IS NULL
                 OR json_extract(payload, '$.user_id') IS NULL
                 OR json_extract(payload, '$.user_id') = '')"
        )
        .bind(&uid)
        .execute(&db.0)
        .await;
    }

    app.emit("auth:signed-in", &auth_user)
        .map_err(|e| format!("Event emit error: {e}"))?;

    Ok(())
}

/// Return current authenticated user by reading keychain + validating token.
/// Returns None if not authenticated or token is expired and refresh fails.
#[tauri::command]
pub async fn get_current_user() -> Result<Option<AuthUser>, String> {
    let access_token = match keychain_service::get_supabase_token()? {
        Some(t) if !t.is_empty() => t,
        _ => return Ok(None),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/auth/v1/user", SUPABASE_URL);

    let resp = client
        .get(&url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("get_current_user HTTP error: {e}"))?;

    // 401 → try refresh
    if resp.status() == 401 {
        let refresh_tok = match keychain_service::get_supabase_refresh_token()? {
            Some(t) if !t.is_empty() => t,
            _ => return Ok(None),
        };

        let (new_access, _) =
            match token_refresh::refresh_token(SUPABASE_URL, SUPABASE_ANON_KEY, &refresh_tok).await {
                Ok(pair) => pair,
                Err(_) => return Ok(None), // refresh failed — treat as unauthenticated
            };

        // Retry with refreshed token
        let retry = client
            .get(&url)
            .header("apikey", SUPABASE_ANON_KEY)
            .header("Authorization", format!("Bearer {}", new_access))
            .send()
            .await
            .map_err(|e| format!("get_current_user retry error: {e}"))?;

        if !retry.status().is_success() {
            return Ok(None);
        }

        let user_data: UserResponse = retry
            .json()
            .await
            .map_err(|e| format!("User JSON parse error: {e}"))?;

        return Ok(Some(AuthUser {
            id: user_data.id,
            email: user_data.email.unwrap_or_default(),
            access_token: new_access,
            refresh_token: keychain_service::get_supabase_refresh_token()?
                .unwrap_or_default(),
        }));
    }

    if !resp.status().is_success() {
        return Ok(None);
    }

    let user_data: UserResponse = resp
        .json()
        .await
        .map_err(|e| format!("User JSON parse error: {e}"))?;

    Ok(Some(AuthUser {
        id: user_data.id,
        email: user_data.email.unwrap_or_default(),
        access_token,
        refresh_token: keychain_service::get_supabase_refresh_token()?
            .unwrap_or_default(),
    }))
}

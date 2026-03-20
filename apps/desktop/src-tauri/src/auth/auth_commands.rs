/// Tauri commands for Supabase email/password authentication.
/// The desktop app remains fully functional offline — auth only enables sync.
use crate::services::keychain_service;
use crate::auth::token_refresh;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

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

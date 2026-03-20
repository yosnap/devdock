/// Token refresh logic for Supabase JWT.
/// Called by auth commands before using an expired access token.
use crate::services::keychain_service;
use serde::Deserialize;

#[derive(Deserialize)]
struct RefreshResponse {
    access_token: String,
    refresh_token: String,
}

/// Exchange a refresh token for a new access + refresh token pair.
/// Stores the new tokens in the OS keychain before returning.
///
/// Returns (new_access_token, new_refresh_token) on success.
pub async fn refresh_token(
    supabase_url: &str,
    api_key: &str,
    refresh_tok: &str,
) -> Result<(String, String), String> {
    let url = format!("{}/auth/v1/token?grant_type=refresh_token", supabase_url);

    let client = reqwest::Client::new();
    let body = serde_json::json!({ "refresh_token": refresh_tok });

    let resp = client
        .post(&url)
        .header("apikey", api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("refresh_token HTTP error: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed [{status}]: {text}"));
    }

    let data: RefreshResponse = resp
        .json()
        .await
        .map_err(|e| format!("Token refresh JSON parse error: {e}"))?;

    // Persist new tokens to keychain so they survive restarts
    keychain_service::store_supabase_token(&data.access_token, &data.refresh_token)
        .map_err(|e| format!("Keychain store error after refresh: {e}"))?;

    Ok((data.access_token, data.refresh_token))
}

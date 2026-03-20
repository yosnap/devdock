/// Secure token storage via OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).
/// Tokens are never written to the DB or logs.
use keyring::Entry;

const SERVICE: &str = "devdock";
const GITHUB_TOKEN_KEY: &str = "github_token";

/// Store a GitHub PAT/OAuth token in the OS keychain.
pub fn store_github_token(token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, GITHUB_TOKEN_KEY).map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())
}

/// Retrieve the stored GitHub token. Returns None if not found.
pub fn get_github_token() -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE, GITHUB_TOKEN_KEY).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Remove the stored GitHub token from the keychain (logout).
pub fn delete_github_token() -> Result<(), String> {
    let entry = Entry::new(SERVICE, GITHUB_TOKEN_KEY).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // already absent
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Smoke test: store, retrieve, delete cycle.
    /// Requires a real OS keychain — ignored in CI environments without one.
    #[test]
    #[ignore = "requires OS keychain access (run manually)"]
    fn test_token_roundtrip() {
        let token = "ghp_test_token_12345";
        // Store
        assert!(store_github_token(token).is_ok());
        // Retrieve
        let got = get_github_token().unwrap();
        assert_eq!(got.as_deref(), Some(token));
        // Delete
        assert!(delete_github_token().is_ok());
        // Confirm absent
        let gone = get_github_token().unwrap();
        assert!(gone.is_none());
    }
}

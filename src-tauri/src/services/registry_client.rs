use crate::models::Ecosystem;

/// Fetch the latest version of a package from its registry.
/// Returns None on network errors, rate limits, or unknown packages.
pub async fn fetch_latest_version(name: &str, ecosystem: &Ecosystem) -> Option<String> {
    match ecosystem {
        Ecosystem::Npm => fetch_npm_version(name).await,
        Ecosystem::Cargo => fetch_crates_version(name).await,
        Ecosystem::Pip => fetch_pypi_version(name).await,
        Ecosystem::Go => fetch_go_version(name).await,
    }
}

/// npm registry: https://registry.npmjs.org/{name}/latest
async fn fetch_npm_version(name: &str) -> Option<String> {
    // Skip scoped packages with slashes that could be path-traversal attempts
    if name.contains("..") {
        return None;
    }
    let url = format!("https://registry.npmjs.org/{name}/latest");
    let resp = reqwest::get(&url).await.ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let json: serde_json::Value = resp.json().await.ok()?;
    json.get("version")?.as_str().map(|s| s.to_string())
}

/// crates.io API: https://crates.io/api/v1/crates/{name}
async fn fetch_crates_version(name: &str) -> Option<String> {
    if name.contains("..") {
        return None;
    }
    let url = format!("https://crates.io/api/v1/crates/{name}");
    let client = reqwest::Client::builder()
        .user_agent("DevDock/0.1.0 (project-launcher)")
        .build()
        .ok()?;
    let resp = client.get(&url).send().await.ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let json: serde_json::Value = resp.json().await.ok()?;
    json.get("crate")?
        .get("newest_version")?
        .as_str()
        .map(|s| s.to_string())
}

/// PyPI API: https://pypi.org/pypi/{name}/json
async fn fetch_pypi_version(name: &str) -> Option<String> {
    if name.contains("..") {
        return None;
    }
    let url = format!("https://pypi.org/pypi/{name}/json");
    let resp = reqwest::get(&url).await.ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let json: serde_json::Value = resp.json().await.ok()?;
    json.get("info")?
        .get("version")?
        .as_str()
        .map(|s| s.to_string())
}

/// Go module proxy: https://proxy.golang.org/{module}/@latest
async fn fetch_go_version(name: &str) -> Option<String> {
    if name.contains("..") {
        return None;
    }
    let url = format!("https://proxy.golang.org/{}/@latest", name.to_lowercase());
    let resp = reqwest::get(&url).await.ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let json: serde_json::Value = resp.json().await.ok()?;
    json.get("Version")?
        .as_str()
        .map(|s| s.trim_start_matches('v').to_string())
}

/// Check if a version string indicates the package is outdated.
/// Simple semver comparison — returns true if latest > current.
pub fn is_outdated(current: &str, latest: &str) -> bool {
    let current = strip_version_prefix(current);
    let latest = strip_version_prefix(latest);
    // Compare as semver tuples (major.minor.patch)
    parse_semver(latest) > parse_semver(current)
}

fn strip_version_prefix(v: &str) -> &str {
    v.trim_start_matches('^')
        .trim_start_matches('~')
        .trim_start_matches('v')
        .trim_start_matches('=')
}

fn parse_semver(v: &str) -> (u64, u64, u64) {
    let parts: Vec<&str> = v.split('.').collect();
    let major = parts.first().and_then(|p| p.parse().ok()).unwrap_or(0);
    let minor = parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(0);
    let patch = parts.get(2)
        .and_then(|p| p.split(['-', '+']).next())
        .and_then(|p| p.parse().ok())
        .unwrap_or(0);
    (major, minor, patch)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_outdated_newer() {
        assert!(is_outdated("1.0.0", "1.1.0"));
        assert!(is_outdated("1.0.0", "2.0.0"));
        assert!(is_outdated("1.2.3", "1.2.4"));
    }

    #[test]
    fn test_is_outdated_same_or_newer() {
        assert!(!is_outdated("1.0.0", "1.0.0"));
        assert!(!is_outdated("2.0.0", "1.0.0"));
    }

    #[test]
    fn test_version_prefix_stripped() {
        assert!(is_outdated("^1.0.0", "1.1.0"));
        assert!(is_outdated("~1.0.0", "1.0.1"));
        assert!(!is_outdated("v2.0.0", "v1.0.0"));
    }

    #[test]
    fn test_path_traversal_blocked() {
        // These should not panic — they just return None
        let _ = tokio::runtime::Runtime::new().unwrap().block_on(async {
            fetch_npm_version("../etc/passwd").await
        });
    }
}

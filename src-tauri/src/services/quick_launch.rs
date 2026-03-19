/// Quick Launch fuzzy search over projects.
/// Returns top-N projects matching the query, sorted by fuzzy score descending.
/// Used by the Quick Launch popup window (Cmd/Ctrl+Shift+Space).
use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickLaunchItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub stack: Option<String>,
    pub score: i64,
}

/// Search projects with fuzzy matching against name + path.
/// Returns up to `limit` results sorted by match score descending.
pub async fn fuzzy_search_projects(
    pool: &SqlitePool,
    query: &str,
    limit: usize,
) -> Result<Vec<QuickLaunchItem>, String> {
    // Fetch all active projects (status='active') for searching
    let projects = sqlx::query!(
        "SELECT id, name, path, stack FROM projects WHERE status = 'active' ORDER BY name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if query.trim().is_empty() {
        // Return all projects (up to limit) when query is empty
        return Ok(projects
            .into_iter()
            .take(limit)
            .map(|p| QuickLaunchItem {
                id: p.id.unwrap_or_default(),
                name: p.name,
                path: p.path,
                stack: p.stack,
                score: 0,
            })
            .collect());
    }

    let matcher = SkimMatcherV2::default();
    let q = query.to_lowercase();

    let mut scored: Vec<QuickLaunchItem> = projects
        .into_iter()
        .filter_map(|p| {
            // Score against name (weighted higher) and path
            let name_score = matcher.fuzzy_match(&p.name.to_lowercase(), &q);
            let path_score = matcher.fuzzy_match(&p.path.to_lowercase(), &q).map(|s| s / 2);
            let best = name_score.or(path_score)?;
            Some(QuickLaunchItem {
                id: p.id.unwrap_or_default(),
                name: p.name,
                path: p.path,
                stack: p.stack,
                score: best,
            })
        })
        .collect();

    // Sort by score descending, then name alphabetically
    scored.sort_by(|a, b| b.score.cmp(&a.score).then(a.name.cmp(&b.name)));
    scored.truncate(limit);

    Ok(scored)
}

#[cfg(test)]
mod tests {
    use super::*;
    use fuzzy_matcher::skim::SkimMatcherV2;
    use fuzzy_matcher::FuzzyMatcher;

    #[test]
    fn test_fuzzy_match_hits() {
        let matcher = SkimMatcherV2::default();
        // "dev" should match "devdock"
        assert!(matcher.fuzzy_match("devdock", "dev").is_some());
    }

    #[test]
    fn test_fuzzy_match_miss() {
        let matcher = SkimMatcherV2::default();
        // "xyz" should not match "devdock"
        assert!(matcher.fuzzy_match("devdock", "xyz").is_none());
    }

    #[test]
    fn test_fuzzy_partial_path() {
        let matcher = SkimMatcherV2::default();
        assert!(matcher.fuzzy_match("/users/paulo/projects/devdock", "dock").is_some());
    }
}

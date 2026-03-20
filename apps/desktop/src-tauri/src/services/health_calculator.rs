/// Project health score calculator.
/// Score: 0-100 (higher = healthier). Configurable weights stored in health_config table.
/// Aggregates: outdated deps, CI status, git staleness, uncommitted changes, remote presence.
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthConfig {
    pub weight_deps_outdated: i64,
    pub weight_vulnerability: i64,
    pub weight_ci_failing: i64,
    pub weight_stale_30d: i64,
    pub weight_stale_90d: i64,
    pub weight_uncommitted: i64,
    pub weight_no_remote: i64,
    pub attention_threshold: i64,
}

impl Default for HealthConfig {
    fn default() -> Self {
        Self {
            weight_deps_outdated: 5,
            weight_vulnerability: 15,
            weight_ci_failing: 20,
            weight_stale_30d: 10,
            weight_stale_90d: 20,
            weight_uncommitted: 10,
            weight_no_remote: 5,
            attention_threshold: 50,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthInput {
    pub outdated_deps_count: i32,
    pub vulnerable_deps_count: i32,
    pub ci_failing: bool,
    /// Days since last commit (None = no commits)
    pub days_since_commit: Option<i64>,
    pub uncommitted_changes: i32,
    pub has_remote: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResult {
    pub score: i32,
    pub penalties: Vec<HealthPenalty>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthPenalty {
    pub reason: String,
    pub points: i32,
}

/// Fetch health config from DB. Falls back to defaults if table is empty.
pub async fn get_health_config(pool: &SqlitePool) -> HealthConfig {
    sqlx::query_as!(
        HealthConfig,
        "SELECT weight_deps_outdated, weight_vulnerability, weight_ci_failing,
                weight_stale_30d, weight_stale_90d, weight_uncommitted,
                weight_no_remote, attention_threshold
         FROM health_config WHERE id = 'default' LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or_default()
}

/// Persist health config changes.
pub async fn save_health_config(pool: &SqlitePool, cfg: &HealthConfig) -> Result<(), String> {
    sqlx::query!(
        "UPDATE health_config SET
           weight_deps_outdated = ?,
           weight_vulnerability = ?,
           weight_ci_failing = ?,
           weight_stale_30d = ?,
           weight_stale_90d = ?,
           weight_uncommitted = ?,
           weight_no_remote = ?,
           attention_threshold = ?
         WHERE id = 'default'",
        cfg.weight_deps_outdated,
        cfg.weight_vulnerability,
        cfg.weight_ci_failing,
        cfg.weight_stale_30d,
        cfg.weight_stale_90d,
        cfg.weight_uncommitted,
        cfg.weight_no_remote,
        cfg.attention_threshold,
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Calculate health score given inputs and config.
/// Returns 0-100 score + penalty breakdown.
pub fn calculate_health(input: &HealthInput, cfg: &HealthConfig) -> HealthResult {
    let mut penalties: Vec<HealthPenalty> = Vec::new();

    // Outdated deps (max -30)
    if input.outdated_deps_count > 0 {
        let pts = (input.outdated_deps_count as i64 * cfg.weight_deps_outdated).min(30) as i32;
        penalties.push(HealthPenalty {
            reason: format!("{} outdated dependencies", input.outdated_deps_count),
            points: pts,
        });
    }

    // Vulnerabilities (max -30)
    if input.vulnerable_deps_count > 0 {
        let pts = (input.vulnerable_deps_count as i64 * cfg.weight_vulnerability).min(30) as i32;
        penalties.push(HealthPenalty {
            reason: format!("{} vulnerable dependencies", input.vulnerable_deps_count),
            points: pts,
        });
    }

    // CI failing
    if input.ci_failing {
        penalties.push(HealthPenalty {
            reason: "CI failing".to_string(),
            points: cfg.weight_ci_failing as i32,
        });
    }

    // Last commit staleness
    match input.days_since_commit {
        None => {
            penalties.push(HealthPenalty {
                reason: "No commits found".to_string(),
                points: cfg.weight_stale_90d as i32,
            });
        }
        Some(days) if days > 90 => {
            penalties.push(HealthPenalty {
                reason: format!("No commit in {days} days (> 90 days)"),
                points: cfg.weight_stale_90d as i32,
            });
        }
        Some(days) if days > 30 => {
            penalties.push(HealthPenalty {
                reason: format!("No commit in {days} days (> 30 days)"),
                points: cfg.weight_stale_30d as i32,
            });
        }
        _ => {}
    }

    // Uncommitted changes > 10 files
    if input.uncommitted_changes > 10 {
        penalties.push(HealthPenalty {
            reason: format!("{} uncommitted files", input.uncommitted_changes),
            points: cfg.weight_uncommitted as i32,
        });
    }

    // No remote
    if !input.has_remote {
        penalties.push(HealthPenalty {
            reason: "No git remote configured".to_string(),
            points: cfg.weight_no_remote as i32,
        });
    }

    let total_penalty: i32 = penalties.iter().map(|p| p.points).sum();
    let score = (100 - total_penalty).clamp(0, 100);

    HealthResult { score, penalties }
}

/// Persist the computed health score back to the project row.
pub async fn update_project_health_score(
    pool: &SqlitePool,
    project_id: &str,
    score: i32,
) -> Result<(), String> {
    sqlx::query!(
        "UPDATE projects SET health_score = ? WHERE id = ?",
        score,
        project_id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_cfg() -> HealthConfig {
        HealthConfig::default()
    }

    #[test]
    fn test_perfect_project_scores_100() {
        let input = HealthInput {
            outdated_deps_count: 0,
            vulnerable_deps_count: 0,
            ci_failing: false,
            days_since_commit: Some(5),
            uncommitted_changes: 2,
            has_remote: true,
        };
        let result = calculate_health(&input, &default_cfg());
        assert_eq!(result.score, 100);
        assert!(result.penalties.is_empty());
    }

    #[test]
    fn test_ci_failing_penalty() {
        let input = HealthInput {
            outdated_deps_count: 0,
            vulnerable_deps_count: 0,
            ci_failing: true,
            days_since_commit: Some(1),
            uncommitted_changes: 0,
            has_remote: true,
        };
        let result = calculate_health(&input, &default_cfg());
        assert_eq!(result.score, 80); // 100 - 20
    }

    #[test]
    fn test_outdated_deps_capped_at_30() {
        let input = HealthInput {
            outdated_deps_count: 100, // 100 * 5 = 500 but capped at 30
            vulnerable_deps_count: 0,
            ci_failing: false,
            days_since_commit: Some(1),
            uncommitted_changes: 0,
            has_remote: true,
        };
        let result = calculate_health(&input, &default_cfg());
        assert_eq!(result.score, 70); // 100 - 30
    }

    #[test]
    fn test_stale_90d_penalty() {
        let input = HealthInput {
            outdated_deps_count: 0,
            vulnerable_deps_count: 0,
            ci_failing: false,
            days_since_commit: Some(91),
            uncommitted_changes: 0,
            has_remote: true,
        };
        let result = calculate_health(&input, &default_cfg());
        assert_eq!(result.score, 80); // 100 - 20
    }

    #[test]
    fn test_score_never_goes_below_zero() {
        let input = HealthInput {
            outdated_deps_count: 100,
            vulnerable_deps_count: 10,
            ci_failing: true,
            days_since_commit: Some(91),
            uncommitted_changes: 50,
            has_remote: false,
        };
        let result = calculate_health(&input, &default_cfg());
        assert!(result.score >= 0);
    }
}

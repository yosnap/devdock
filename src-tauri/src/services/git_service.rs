use crate::models::GitInfo;
use git2::{Repository, StatusOptions};

/// Get git status for a project path using libgit2 (no shell dependency)
pub fn get_git_info(path: &str) -> GitInfo {
    match Repository::open(path) {
        Ok(repo) => extract_git_info(&repo),
        Err(_) => GitInfo {
            branch: None,
            uncommitted_count: 0,
            ahead: 0,
            behind: 0,
            last_commit_msg: None,
            last_commit_author: None,
            last_commit_date: None,
            remote_url: None,
            is_git_repo: false,
        },
    }
}

/// Extract all git info from an open repository
fn extract_git_info(repo: &Repository) -> GitInfo {
    let branch = get_branch_name(repo);
    let uncommitted_count = count_uncommitted_changes(repo);
    let (ahead, behind) = get_ahead_behind(repo);
    let (last_msg, last_author, last_date) = get_last_commit(repo);
    let remote_url = get_remote_url(repo);

    GitInfo {
        branch,
        uncommitted_count,
        ahead,
        behind,
        last_commit_msg: last_msg,
        last_commit_author: last_author,
        last_commit_date: last_date,
        remote_url,
        is_git_repo: true,
    }
}

/// Get current branch name (handles detached HEAD)
fn get_branch_name(repo: &Repository) -> Option<String> {
    // Try named branch first
    if let Ok(head) = repo.head() {
        if let Some(name) = head.shorthand() {
            return Some(name.to_string());
        }
    }
    // Detached HEAD — return short SHA
    repo.head()
        .ok()
        .and_then(|h| h.target())
        .map(|oid| oid.to_string()[..7].to_string())
}

/// Count files with uncommitted changes (staged + unstaged)
fn count_uncommitted_changes(repo: &Repository) -> i32 {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .exclude_submodules(true)
        .include_ignored(false);

    repo.statuses(Some(&mut opts))
        .map(|statuses| statuses.len() as i32)
        .unwrap_or(0)
}

/// Get ahead/behind counts relative to upstream
fn get_ahead_behind(repo: &Repository) -> (i32, i32) {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return (0, 0),
    };

    let local_oid = match head.target() {
        Some(oid) => oid,
        None => return (0, 0),
    };

    // Find tracking branch
    let branch_name = head.shorthand().unwrap_or("");
    let upstream_ref = format!("refs/remotes/origin/{branch_name}");

    let upstream_oid = match repo.find_reference(&upstream_ref) {
        Ok(r) => match r.target() {
            Some(oid) => oid,
            None => return (0, 0),
        },
        Err(_) => return (0, 0),
    };

    repo.graph_ahead_behind(local_oid, upstream_oid)
        .map(|(a, b)| (a as i32, b as i32))
        .unwrap_or((0, 0))
}

/// Get last commit metadata
fn get_last_commit(repo: &Repository) -> (Option<String>, Option<String>, Option<String>) {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return (None, None, None),
    };

    let commit = match head.peel_to_commit() {
        Ok(c) => c,
        Err(_) => return (None, None, None),
    };

    let msg = commit.message().map(|m| m.lines().next().unwrap_or("").to_string());
    let author = commit.author().name().map(|n| n.to_string());
    let time = commit.time().seconds();
    // Format as ISO-8601 date string
    let date = chrono::DateTime::from_timestamp(time, 0)
        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string());

    (msg, author, date)
}

/// Get remote origin URL
fn get_remote_url(repo: &Repository) -> Option<String> {
    repo.find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(|u| u.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_non_git_dir_returns_not_repo() {
        let dir = TempDir::new().unwrap();
        let info = get_git_info(dir.path().to_str().unwrap());
        assert!(!info.is_git_repo);
        assert_eq!(info.uncommitted_count, 0);
        assert_eq!(info.ahead, 0);
        assert_eq!(info.behind, 0);
    }

    #[test]
    fn test_git_repo_detected() {
        let dir = TempDir::new().unwrap();
        // Init a real git repo
        let repo = git2::Repository::init(dir.path()).unwrap();
        // Create initial commit so HEAD exists
        let sig = git2::Signature::now("Test", "test@test.com").unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
            index.write_tree().unwrap()
        };
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();

        let info = get_git_info(dir.path().to_str().unwrap());
        assert!(info.is_git_repo);
        assert!(info.branch.is_some());
        assert!(info.last_commit_msg.is_some());
    }

    #[test]
    fn test_uncommitted_changes_detected() {
        let dir = TempDir::new().unwrap();
        let repo = git2::Repository::init(dir.path()).unwrap();
        let sig = git2::Signature::now("Test", "test@test.com").unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
            index.write_tree().unwrap()
        };
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();

        // Add an untracked file
        std::fs::write(dir.path().join("new_file.txt"), "content").unwrap();

        let info = get_git_info(dir.path().to_str().unwrap());
        assert!(info.uncommitted_count > 0);
    }
}

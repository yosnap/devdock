use std::path::Path;
use std::process::Command;

/// Result of an IDE launch attempt
#[derive(Debug)]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
}

/// Resolve short IDE command to full path for production builds.
/// In production, PATH doesn't include /usr/local/bin etc.
fn resolve_command(cmd: &str) -> String {
    // If already absolute, use as-is
    if cmd.starts_with('/') {
        return cmd.to_string();
    }

    // Common locations for CLI tools on macOS
    let search_paths = [
        "/usr/local/bin",
        "/opt/homebrew/bin",
        "/usr/bin",
        "/Applications",
    ];

    for dir in &search_paths {
        let full = format!("{}/{}", dir, cmd);
        if Path::new(&full).exists() {
            return full;
        }
    }

    // macOS: try `open -a` for app names as fallback
    cmd.to_string()
}

/// Launch an IDE with the given command template and project path.
/// The `args` template uses `{path}` as placeholder.
pub fn launch_ide(command: &str, args_template: &str, project_path: &str) -> Result<LaunchResult, String> {
    if !Path::new(project_path).exists() {
        return Err(format!("Project path does not exist: {project_path}"));
    }

    if command.is_empty() || command.contains(';') || command.contains('&') || command.contains('|') {
        return Err(format!("Invalid IDE command: {command}"));
    }

    let resolved_cmd = resolve_command(command);

    let resolved_args: Vec<String> = args_template
        .split_whitespace()
        .map(|arg| {
            if arg == "{path}" {
                project_path.to_string()
            } else {
                arg.to_string()
            }
        })
        .collect();

    let result = Command::new(&resolved_cmd)
        .args(&resolved_args)
        .spawn();

    match result {
        Ok(_) => Ok(LaunchResult {
            success: true,
            message: format!("Launched {resolved_cmd} for {project_path}"),
        }),
        Err(e) => Err(format!("Failed to launch {resolved_cmd}: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_invalid_path_returns_error() {
        let result = launch_ide("code", "{path}", "/nonexistent/path/xyz");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_empty_command_returns_error() {
        let dir = TempDir::new().unwrap();
        let result = launch_ide("", "{path}", dir.path().to_str().unwrap());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid IDE command"));
    }

    #[test]
    fn test_command_injection_blocked() {
        let dir = TempDir::new().unwrap();
        let result = launch_ide("code; rm -rf", "{path}", dir.path().to_str().unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_args_placeholder_replaced() {
        // We can test the arg substitution logic independently
        let template = "{path}";
        let path = "/home/user/project";
        let resolved: Vec<String> = template
            .split_whitespace()
            .map(|arg| if arg == "{path}" { path.to_string() } else { arg.to_string() })
            .collect();
        assert_eq!(resolved, vec!["/home/user/project"]);
    }
}

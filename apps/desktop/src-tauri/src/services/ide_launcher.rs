use std::path::Path;
use std::process::Command;

/// Result of an IDE launch attempt
#[derive(Debug)]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
}

/// Launch an IDE with the given command template and project path.
/// The `args` template uses `{path}` as placeholder.
pub fn launch_ide(command: &str, args_template: &str, project_path: &str) -> Result<LaunchResult, String> {
    // Validate project path exists
    if !Path::new(project_path).exists() {
        return Err(format!("Project path does not exist: {project_path}"));
    }

    // Validate command is not empty and doesn't contain dangerous chars
    if command.is_empty() || command.contains(';') || command.contains('&') || command.contains('|') {
        return Err(format!("Invalid IDE command: {command}"));
    }

    // Build args by replacing {path} placeholder
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

    // Spawn detached process so the IDE runs independently
    let result = Command::new(command)
        .args(&resolved_args)
        .spawn();

    match result {
        Ok(_) => Ok(LaunchResult {
            success: true,
            message: format!("Launched {command} for {project_path}"),
        }),
        Err(e) => Err(format!("Failed to launch {command}: {e}")),
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

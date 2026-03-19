use std::path::Path;

/// Detected technology stack for a project directory
#[derive(Debug, Clone)]
pub struct StackDetection {
    pub stack: String,
    pub name: String,
}

/// Detect the tech stack from files present in the project directory
pub fn detect_stack(path: &str) -> Option<StackDetection> {
    let dir = Path::new(path);

    // Order matters: more specific checks first
    let checks: &[(&[&str], &str, &str)] = &[
        // Rust
        (&["Cargo.toml"], "rust", "Rust"),
        // Go
        (&["go.mod"], "go", "Go"),
        // Python
        (&["pyproject.toml", "setup.py", "requirements.txt"], "python", "Python"),
        // Ruby
        (&["Gemfile"], "ruby", "Ruby"),
        // PHP
        (&["composer.json"], "php", "PHP"),
        // .NET
        (&["*.csproj", "*.sln"], "dotnet", ".NET"),
        // Java/Kotlin
        (&["pom.xml", "build.gradle", "build.gradle.kts"], "java", "Java/Kotlin"),
        // Swift
        (&["Package.swift", "*.xcodeproj"], "swift", "Swift"),
        // Node/JS (after others to avoid false positives)
        (&["package.json"], "node", "Node.js"),
    ];

    for (files, stack_id, stack_name) in checks {
        for file_pattern in *files {
            // Handle wildcard patterns
            if file_pattern.contains('*') {
                let ext = file_pattern.trim_start_matches("*.");
                if dir_has_extension(dir, ext) {
                    return Some(StackDetection {
                        stack: stack_id.to_string(),
                        name: stack_name.to_string(),
                    });
                }
            } else if dir.join(file_pattern).exists() {
                return Some(StackDetection {
                    stack: stack_id.to_string(),
                    name: stack_name.to_string(),
                });
            }
        }
    }

    None
}

/// Check if directory contains any file with given extension
fn dir_has_extension(dir: &Path, ext: &str) -> bool {
    std::fs::read_dir(dir)
        .ok()
        .map(|entries| {
            entries.filter_map(|e| e.ok()).any(|entry| {
                entry
                    .path()
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e == ext)
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// Extract a reasonable project name from a directory path
pub fn extract_project_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown Project")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_detect_rust_stack() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Cargo.toml"), "[package]").unwrap();
        let result = detect_stack(dir.path().to_str().unwrap());
        assert!(result.is_some());
        assert_eq!(result.unwrap().stack, "rust");
    }

    #[test]
    fn test_detect_node_stack() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("package.json"), "{}").unwrap();
        let result = detect_stack(dir.path().to_str().unwrap());
        assert!(result.is_some());
        assert_eq!(result.unwrap().stack, "node");
    }

    #[test]
    fn test_unknown_stack() {
        let dir = TempDir::new().unwrap();
        let result = detect_stack(dir.path().to_str().unwrap());
        assert!(result.is_none());
    }

    #[test]
    fn test_extract_project_name() {
        assert_eq!(extract_project_name("/home/user/my-project"), "my-project");
        assert_eq!(extract_project_name("/projects/devdock"), "devdock");
    }
}

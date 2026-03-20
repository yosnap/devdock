use crate::models::{Ecosystem, ParsedDep};
use std::path::Path;

/// Parse all dependency files found in the project directory
pub fn parse_deps(project_path: &str) -> Vec<ParsedDep> {
    let dir = Path::new(project_path);
    let mut deps = Vec::new();

    // Try each ecosystem parser
    deps.extend(parse_npm_deps(dir));
    deps.extend(parse_cargo_deps(dir));
    deps.extend(parse_pip_deps(dir));
    deps.extend(parse_go_deps(dir));

    deps
}

/// Parse package.json for npm/Node.js dependencies
fn parse_npm_deps(dir: &Path) -> Vec<ParsedDep> {
    let pkg_path = dir.join("package.json");
    if !pkg_path.exists() {
        return vec![];
    }

    let content = match std::fs::read_to_string(&pkg_path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let json: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let mut deps = Vec::new();

    // Parse both dependencies and devDependencies
    for dep_type in &["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(obj) = json.get(*dep_type).and_then(|v| v.as_object()) {
            for (name, version_val) in obj {
                let version = version_val
                    .as_str()
                    .unwrap_or("*")
                    .trim_start_matches(|c: char| !c.is_alphanumeric())
                    .to_string();

                deps.push(ParsedDep {
                    name: name.clone(),
                    version,
                    dep_type: dep_type.to_string(),
                    ecosystem: Ecosystem::Npm,
                });
            }
        }
    }

    deps
}

/// Parse Cargo.toml for Rust dependencies
fn parse_cargo_deps(dir: &Path) -> Vec<ParsedDep> {
    let cargo_path = dir.join("Cargo.toml");
    if !cargo_path.exists() {
        return vec![];
    }

    let content = match std::fs::read_to_string(&cargo_path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let toml: toml::Value = match toml::from_str(&content) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let mut deps = Vec::new();

    for dep_type in &["dependencies", "dev-dependencies", "build-dependencies"] {
        if let Some(table) = toml.get(*dep_type).and_then(|v| v.as_table()) {
            for (name, value) in table {
                let version = match value {
                    toml::Value::String(v) => v.clone(),
                    toml::Value::Table(t) => t
                        .get("version")
                        .and_then(|v| v.as_str())
                        .unwrap_or("*")
                        .to_string(),
                    _ => "*".to_string(),
                };

                deps.push(ParsedDep {
                    name: name.clone(),
                    version: version.trim_start_matches('^').trim_start_matches('~').to_string(),
                    dep_type: dep_type.to_string(),
                    ecosystem: Ecosystem::Cargo,
                });
            }
        }
    }

    deps
}

/// Parse requirements.txt or pyproject.toml for Python dependencies
fn parse_pip_deps(dir: &Path) -> Vec<ParsedDep> {
    let mut deps = Vec::new();

    // requirements.txt
    let req_path = dir.join("requirements.txt");
    if req_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&req_path) {
            for line in content.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                // Parse "package==1.2.3" or "package>=1.0"
                let (name, version) = parse_pip_requirement(line);
                deps.push(ParsedDep {
                    name,
                    version,
                    dep_type: "dependencies".to_string(),
                    ecosystem: Ecosystem::Pip,
                });
            }
        }
    }

    // pyproject.toml [project.dependencies]
    let pyproject_path = dir.join("pyproject.toml");
    if pyproject_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&pyproject_path) {
            if let Ok(toml) = toml::from_str::<toml::Value>(&content) {
                if let Some(project_deps) = toml
                    .get("project")
                    .and_then(|p: &toml::Value| p.get("dependencies"))
                    .and_then(|d: &toml::Value| d.as_array())
                {
                    for dep in project_deps {
                        if let Some(dep_str) = dep.as_str() {
                            let (name, version) = parse_pip_requirement(dep_str);
                            deps.push(ParsedDep {
                                name,
                                version,
                                dep_type: "dependencies".to_string(),
                                ecosystem: Ecosystem::Pip,
                            });
                        }
                    }
                }
            }
        }
    }

    deps
}

/// Parse a single pip requirement line like "requests==2.28.0" or "flask>=2.0"
fn parse_pip_requirement(line: &str) -> (String, String) {
    // Split on first operator (==, >=, <=, ~=, !=)
    for op in &["==", ">=", "<=", "~=", "!=", ">", "<"] {
        if let Some(idx) = line.find(op) {
            let name = line[..idx].trim().to_string();
            let version = line[idx + op.len()..].trim().to_string();
            return (name, version);
        }
    }
    (line.trim().to_string(), "*".to_string())
}

/// Parse go.mod for Go dependencies
fn parse_go_deps(dir: &Path) -> Vec<ParsedDep> {
    let go_mod_path = dir.join("go.mod");
    if !go_mod_path.exists() {
        return vec![];
    }

    let content = match std::fs::read_to_string(&go_mod_path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let mut deps = Vec::new();
    let mut in_require_block = false;

    for line in content.lines() {
        let line = line.trim();

        if line == "require (" {
            in_require_block = true;
            continue;
        }
        if in_require_block && line == ")" {
            in_require_block = false;
            continue;
        }

        // Single-line: require github.com/foo/bar v1.2.3
        let entry = if line.starts_with("require ") {
            line.strip_prefix("require ").unwrap_or("").trim()
        } else if in_require_block {
            line
        } else {
            continue
        };

        let parts: Vec<&str> = entry.split_whitespace().collect();
        if parts.len() >= 2 && !parts[0].starts_with("//") {
            deps.push(ParsedDep {
                name: parts[0].to_string(),
                version: parts[1].trim_start_matches('v').to_string(),
                dep_type: "dependencies".to_string(),
                ecosystem: Ecosystem::Go,
            });
        }
    }

    deps
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_parse_npm_deps() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("package.json"),
            r#"{"dependencies":{"react":"^18.0.0"},"devDependencies":{"vitest":"^1.0.0"}}"#,
        ).unwrap();
        let deps = parse_npm_deps(dir.path());
        assert_eq!(deps.len(), 2);
        assert!(deps.iter().any(|d| d.name == "react" && d.ecosystem == Ecosystem::Npm));
        assert!(deps.iter().any(|d| d.name == "vitest" && d.dep_type == "devDependencies"));
    }

    #[test]
    fn test_parse_cargo_deps() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("Cargo.toml"),
            "[package]\nname = \"test\"\n[dependencies]\nserde = \"1.0\"\n[dev-dependencies]\ntempfile = \"3.0\"\n",
        ).unwrap();
        let deps = parse_cargo_deps(dir.path());
        assert!(deps.iter().any(|d| d.name == "serde" && d.ecosystem == Ecosystem::Cargo));
        assert!(deps.iter().any(|d| d.name == "tempfile" && d.dep_type == "dev-dependencies"));
    }

    #[test]
    fn test_parse_pip_requirement() {
        let (name, ver) = parse_pip_requirement("requests==2.28.0");
        assert_eq!(name, "requests");
        assert_eq!(ver, "2.28.0");

        let (name2, ver2) = parse_pip_requirement("flask>=2.0");
        assert_eq!(name2, "flask");
        assert_eq!(ver2, "2.0");

        let (name3, ver3) = parse_pip_requirement("numpy");
        assert_eq!(name3, "numpy");
        assert_eq!(ver3, "*");
    }

    #[test]
    fn test_parse_go_deps() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("go.mod"),
            "module example.com/myapp\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n\tgithub.com/stretchr/testify v1.8.4\n)\n",
        ).unwrap();
        let deps = parse_go_deps(dir.path());
        assert_eq!(deps.len(), 2);
        assert!(deps.iter().any(|d| d.name == "github.com/gin-gonic/gin" && d.version == "1.9.1"));
    }

    #[test]
    fn test_empty_dir_returns_empty() {
        let dir = TempDir::new().unwrap();
        let deps = parse_deps(dir.path().to_str().unwrap());
        assert!(deps.is_empty());
    }
}

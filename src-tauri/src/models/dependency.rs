use serde::{Deserialize, Serialize};

/// Dependency ecosystem identifier
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Ecosystem {
    Npm,
    Cargo,
    Pip,
    Go,
}

impl std::fmt::Display for Ecosystem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Ecosystem::Npm => write!(f, "npm"),
            Ecosystem::Cargo => write!(f, "cargo"),
            Ecosystem::Pip => write!(f, "pip"),
            Ecosystem::Go => write!(f, "go"),
        }
    }
}

/// A project dependency with version tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub current_version: Option<String>,
    pub latest_version: Option<String>,
    pub dep_type: Option<String>,
    pub ecosystem: String,
    pub is_outdated: bool,
    pub has_vulnerability: bool,
    pub last_checked_at: Option<String>,
}

/// Raw dependency parsed from config files before DB storage
#[derive(Debug, Clone)]
pub struct ParsedDep {
    pub name: String,
    pub version: String,
    pub dep_type: String,
    pub ecosystem: Ecosystem,
}

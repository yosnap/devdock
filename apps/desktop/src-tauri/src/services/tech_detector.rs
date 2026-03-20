/// Detailed technology detection beyond the primary stack.
/// Detects frameworks, databases, ORMs, and testing tools with their versions.
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechItem {
    pub name: String,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechBreakdown {
    pub language: Option<String>,
    pub version: Option<String>,
    pub frameworks: Vec<TechItem>,
    pub databases: Vec<TechItem>,
    pub orms: Vec<TechItem>,
    pub testing: Vec<TechItem>,
    pub devops: Vec<TechItem>,
}

fn read_file(path: &Path) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    let lower = haystack.to_lowercase();
    needles.iter().any(|n| lower.contains(n))
}

/// Extract dep version from parsed package.json (checks dependencies + devDependencies)
fn npm_dep_version(parsed: &Value, pkg_names: &[&str]) -> Option<String> {
    for section in &["dependencies", "devDependencies"] {
        if let Some(deps) = parsed[section].as_object() {
            for pkg in pkg_names {
                if let Some(v) = deps.get(*pkg).and_then(|v| v.as_str()) {
                    return Some(v.trim_start_matches('^').trim_start_matches('~').to_string());
                }
            }
        }
    }
    None
}

fn ti(name: &str, ver: Option<String>) -> TechItem {
    TechItem { name: name.to_string(), version: ver }
}

/// Detect tech breakdown from a project directory
pub fn detect_tech_breakdown(project_path: &str) -> TechBreakdown {
    let dir = Path::new(project_path);
    let mut frameworks = Vec::new();
    let mut databases = Vec::new();
    let mut orms = Vec::new();
    let mut testing = Vec::new();
    let mut devops = Vec::new();
    let mut language: Option<String> = None;
    let mut version: Option<String> = None;

    // --- Node.js ecosystem ---
    let pkg_path = dir.join("package.json");
    if pkg_path.exists() {
        language = Some("Node.js / JavaScript".to_string());
        let pkg = read_file(&pkg_path);
        let parsed: Value = serde_json::from_str(&pkg).unwrap_or_default();

        version = parsed["version"].as_str().map(|s| s.to_string());

        // Frameworks (order matters: meta-frameworks before base libs)
        if contains_any(&pkg, &["\"next\""]) {
            frameworks.push(ti("Next.js", npm_dep_version(&parsed, &["next"])));
        } else if contains_any(&pkg, &["\"nuxt\""]) {
            frameworks.push(ti("Nuxt.js", npm_dep_version(&parsed, &["nuxt"])));
        } else if contains_any(&pkg, &["\"astro\""]) {
            frameworks.push(ti("Astro", npm_dep_version(&parsed, &["astro"])));
        } else if contains_any(&pkg, &["\"react\""]) {
            frameworks.push(ti("React", npm_dep_version(&parsed, &["react"])));
        } else if contains_any(&pkg, &["\"vue\""]) {
            frameworks.push(ti("Vue.js", npm_dep_version(&parsed, &["vue"])));
        } else if contains_any(&pkg, &["\"@angular/core\""]) {
            frameworks.push(ti("Angular", npm_dep_version(&parsed, &["@angular/core"])));
        } else if contains_any(&pkg, &["\"svelte\""]) {
            frameworks.push(ti("Svelte", npm_dep_version(&parsed, &["svelte"])));
        }
        if contains_any(&pkg, &["\"express\""]) {
            frameworks.push(ti("Express", npm_dep_version(&parsed, &["express"])));
        }
        if contains_any(&pkg, &["\"fastify\""]) {
            frameworks.push(ti("Fastify", npm_dep_version(&parsed, &["fastify"])));
        }
        if contains_any(&pkg, &["\"@nestjs/core\""]) {
            frameworks.push(ti("NestJS", npm_dep_version(&parsed, &["@nestjs/core"])));
        }
        if contains_any(&pkg, &["\"hono\""]) {
            frameworks.push(ti("Hono", npm_dep_version(&parsed, &["hono"])));
        }
        if contains_any(&pkg, &["\"electron\""]) {
            frameworks.push(ti("Electron", npm_dep_version(&parsed, &["electron"])));
        }

        // TypeScript check
        if contains_any(&pkg, &["\"typescript\"", "\"ts-node\""]) || dir.join("tsconfig.json").exists() {
            language = Some("Node.js / TypeScript".to_string());
        }

        // Databases
        if contains_any(&pkg, &["\"pg\"", "\"postgres\"", "\"@vercel/postgres\""]) {
            databases.push(ti("PostgreSQL", npm_dep_version(&parsed, &["pg", "postgres"])));
        }
        if contains_any(&pkg, &["\"mysql\"", "\"mysql2\""]) {
            databases.push(ti("MySQL", npm_dep_version(&parsed, &["mysql2", "mysql"])));
        }
        if contains_any(&pkg, &["\"mongodb\"", "\"mongoose\""]) {
            databases.push(ti("MongoDB", npm_dep_version(&parsed, &["mongodb", "mongoose"])));
        }
        if contains_any(&pkg, &["\"redis\"", "\"ioredis\""]) {
            databases.push(ti("Redis", npm_dep_version(&parsed, &["ioredis", "redis"])));
        }
        if contains_any(&pkg, &["\"better-sqlite3\"", "\"sqlite3\""]) {
            databases.push(ti("SQLite", npm_dep_version(&parsed, &["better-sqlite3", "sqlite3"])));
        }

        // ORMs
        if contains_any(&pkg, &["\"prisma\"", "\"@prisma/client\""]) {
            orms.push(ti("Prisma", npm_dep_version(&parsed, &["@prisma/client", "prisma"])));
        }
        if contains_any(&pkg, &["\"typeorm\""]) {
            orms.push(ti("TypeORM", npm_dep_version(&parsed, &["typeorm"])));
        }
        if contains_any(&pkg, &["\"sequelize\""]) {
            orms.push(ti("Sequelize", npm_dep_version(&parsed, &["sequelize"])));
        }
        if contains_any(&pkg, &["\"drizzle-orm\""]) {
            orms.push(ti("Drizzle", npm_dep_version(&parsed, &["drizzle-orm"])));
        }
        if contains_any(&pkg, &["\"knex\""]) {
            orms.push(ti("Knex", npm_dep_version(&parsed, &["knex"])));
        }

        // Testing
        if contains_any(&pkg, &["\"jest\""]) {
            testing.push(ti("Jest", npm_dep_version(&parsed, &["jest"])));
        }
        if contains_any(&pkg, &["\"vitest\""]) {
            testing.push(ti("Vitest", npm_dep_version(&parsed, &["vitest"])));
        }
        if contains_any(&pkg, &["\"mocha\""]) {
            testing.push(ti("Mocha", npm_dep_version(&parsed, &["mocha"])));
        }
        if contains_any(&pkg, &["\"cypress\""]) {
            testing.push(ti("Cypress", npm_dep_version(&parsed, &["cypress"])));
        }
        if contains_any(&pkg, &["\"playwright\""]) {
            testing.push(ti("Playwright", npm_dep_version(&parsed, &["@playwright/test", "playwright"])));
        }
    }

    // --- Rust ---
    let cargo_path = dir.join("Cargo.toml");
    if cargo_path.exists() {
        language = Some("Rust".to_string());
        let cargo = read_file(&cargo_path);

        // Extract version
        for line in cargo.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("version") && trimmed.contains('=') {
                if let Some(v) = trimmed.split('=').nth(1) {
                    let v = v.trim().trim_matches('"').trim_matches('\'');
                    if !v.is_empty() { version = Some(v.to_string()); }
                }
                break;
            }
        }

        if contains_any(&cargo, &["actix-web", "actix_web"]) { frameworks.push(ti("Actix-web", None)); }
        if contains_any(&cargo, &["axum"]) { frameworks.push(ti("Axum", None)); }
        if contains_any(&cargo, &["rocket"]) { frameworks.push(ti("Rocket", None)); }
        if contains_any(&cargo, &["warp"]) { frameworks.push(ti("Warp", None)); }
        if contains_any(&cargo, &["tauri"]) { frameworks.push(ti("Tauri", None)); }
        if contains_any(&cargo, &["leptos"]) { frameworks.push(ti("Leptos", None)); }

        if contains_any(&cargo, &["sqlx"]) { orms.push(ti("SQLx", None)); }
        if contains_any(&cargo, &["diesel"]) { orms.push(ti("Diesel", None)); }
        if contains_any(&cargo, &["sea-orm"]) { orms.push(ti("SeaORM", None)); }

        if contains_any(&cargo, &["postgres", "tokio-postgres"]) { databases.push(ti("PostgreSQL", None)); }
        if contains_any(&cargo, &["mysql"]) { databases.push(ti("MySQL", None)); }
        if contains_any(&cargo, &["sqlite"]) { databases.push(ti("SQLite", None)); }
        if contains_any(&cargo, &["redis"]) { databases.push(ti("Redis", None)); }

        if contains_any(&cargo, &["rstest"]) { testing.push(ti("rstest", None)); }
        if contains_any(&cargo, &["criterion"]) { testing.push(ti("Criterion", None)); }
    }

    // --- Python ---
    let req_path = dir.join("requirements.txt");
    let pyproject_path = dir.join("pyproject.toml");
    if req_path.exists() || pyproject_path.exists() {
        language = Some("Python".to_string());
        let deps = format!("{}{}", read_file(&req_path), read_file(&pyproject_path));

        if contains_any(&deps, &["fastapi"]) { frameworks.push(ti("FastAPI", None)); }
        else if contains_any(&deps, &["django"]) { frameworks.push(ti("Django", None)); }
        else if contains_any(&deps, &["flask"]) { frameworks.push(ti("Flask", None)); }

        if contains_any(&deps, &["psycopg", "psycopg2"]) { databases.push(ti("PostgreSQL", None)); }
        if contains_any(&deps, &["pymysql", "mysqlclient"]) { databases.push(ti("MySQL", None)); }
        if contains_any(&deps, &["pymongo"]) { databases.push(ti("MongoDB", None)); }
        if contains_any(&deps, &["redis"]) { databases.push(ti("Redis", None)); }

        if contains_any(&deps, &["sqlalchemy"]) { orms.push(ti("SQLAlchemy", None)); }
        if contains_any(&deps, &["tortoise-orm"]) { orms.push(ti("Tortoise ORM", None)); }

        if contains_any(&deps, &["pytest"]) { testing.push(ti("pytest", None)); }
    }

    // --- Go ---
    let gomod_path = dir.join("go.mod");
    if gomod_path.exists() {
        language = Some("Go".to_string());
        let gomod = read_file(&gomod_path);

        if contains_any(&gomod, &["gin-gonic"]) { frameworks.push(ti("Gin", None)); }
        if contains_any(&gomod, &["labstack/echo"]) { frameworks.push(ti("Echo", None)); }
        if contains_any(&gomod, &["gofiber"]) { frameworks.push(ti("Fiber", None)); }
        if contains_any(&gomod, &["chi"]) { frameworks.push(ti("Chi", None)); }

        if contains_any(&gomod, &["gorm"]) { orms.push(ti("GORM", None)); }

        if contains_any(&gomod, &["pq", "pgx"]) { databases.push(ti("PostgreSQL", None)); }
        if contains_any(&gomod, &["mattn/go-sqlite3"]) { databases.push(ti("SQLite", None)); }
        if contains_any(&gomod, &["go-redis"]) { databases.push(ti("Redis", None)); }

        if contains_any(&gomod, &["testify"]) { testing.push(ti("testify", None)); }
    }

    // --- Java/Kotlin ---
    let pom_path = dir.join("pom.xml");
    let gradle_path = dir.join("build.gradle");
    let gradle_kts_path = dir.join("build.gradle.kts");
    if pom_path.exists() || gradle_path.exists() || gradle_kts_path.exists() {
        let build = format!("{}{}{}", read_file(&pom_path), read_file(&gradle_path), read_file(&gradle_kts_path));
        language = Some(if gradle_kts_path.exists() { "Kotlin".to_string() } else { "Java".to_string() });

        if contains_any(&build, &["spring-boot"]) { frameworks.push(ti("Spring Boot", None)); }
        if contains_any(&build, &["quarkus"]) { frameworks.push(ti("Quarkus", None)); }
        if contains_any(&build, &["micronaut"]) { frameworks.push(ti("Micronaut", None)); }

        if contains_any(&build, &["hibernate", "jpa"]) { orms.push(ti("Hibernate / JPA", None)); }

        if contains_any(&build, &["postgresql"]) { databases.push(ti("PostgreSQL", None)); }
        if contains_any(&build, &["mysql"]) { databases.push(ti("MySQL", None)); }
        if contains_any(&build, &["h2"]) { databases.push(ti("H2", None)); }

        if contains_any(&build, &["junit"]) { testing.push(ti("JUnit", None)); }
        if contains_any(&build, &["mockito"]) { testing.push(ti("Mockito", None)); }
    }

    // --- DevOps (cross-language) ---
    if dir.join("Dockerfile").exists() || dir.join("docker-compose.yml").exists() || dir.join("docker-compose.yaml").exists() {
        devops.push(ti("Docker", None));
    }
    if dir.join(".github").join("workflows").exists() {
        devops.push(ti("GitHub Actions", None));
    }
    if dir.join("k8s").exists() || dir.join("kubernetes").exists() || dir.join("helm").exists() {
        devops.push(ti("Kubernetes", None));
    }
    if dir.join("terraform").exists() || dir.join("main.tf").exists() {
        devops.push(ti("Terraform", None));
    }

    TechBreakdown { language, version, frameworks, databases, orms, testing, devops }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_detect_nextjs_with_version() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("package.json"),
            r#"{"version":"1.0.0","dependencies":{"next":"14.2.3","react":"18.3.1","prisma":"5.10","pg":"8.11"}}"#,
        ).unwrap();
        let result = detect_tech_breakdown(dir.path().to_str().unwrap());
        assert_eq!(result.version.as_deref(), Some("1.0.0"));
        assert_eq!(result.frameworks[0].name, "Next.js");
        assert_eq!(result.frameworks[0].version.as_deref(), Some("14.2.3"));
        assert_eq!(result.orms[0].name, "Prisma");
        assert_eq!(result.databases[0].name, "PostgreSQL");
    }

    #[test]
    fn test_detect_docker() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Dockerfile"), "FROM node:20").unwrap();
        fs::write(dir.path().join("package.json"), "{}").unwrap();
        let result = detect_tech_breakdown(dir.path().to_str().unwrap());
        assert_eq!(result.devops[0].name, "Docker");
    }
}

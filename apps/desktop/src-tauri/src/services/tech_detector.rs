/// Detailed technology detection beyond the primary stack.
/// Detects frameworks, databases, ORMs, and testing tools from project files.
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechBreakdown {
    pub language: Option<String>,
    pub frameworks: Vec<String>,
    pub databases: Vec<String>,
    pub orms: Vec<String>,
    pub testing: Vec<String>,
    pub devops: Vec<String>,
}

/// Read file content safely, returning empty string on failure
fn read_file(path: &Path) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

/// Check if a string contains any of the given keywords (case-insensitive)
fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    let lower = haystack.to_lowercase();
    needles.iter().any(|n| lower.contains(n))
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

    // --- Node.js ecosystem ---
    let pkg_path = dir.join("package.json");
    if pkg_path.exists() {
        language = Some("Node.js / JavaScript".to_string());
        let pkg = read_file(&pkg_path);

        // Frameworks
        if contains_any(&pkg, &["\"next\""]) { frameworks.push("Next.js".to_string()); }
        else if contains_any(&pkg, &["\"nuxt\""]) { frameworks.push("Nuxt.js".to_string()); }
        else if contains_any(&pkg, &["\"react\""]) { frameworks.push("React".to_string()); }
        else if contains_any(&pkg, &["\"vue\""]) { frameworks.push("Vue.js".to_string()); }
        else if contains_any(&pkg, &["\"@angular/core\""]) { frameworks.push("Angular".to_string()); }
        else if contains_any(&pkg, &["\"svelte\""]) { frameworks.push("Svelte".to_string()); }
        if contains_any(&pkg, &["\"express\""]) { frameworks.push("Express".to_string()); }
        if contains_any(&pkg, &["\"fastify\""]) { frameworks.push("Fastify".to_string()); }
        if contains_any(&pkg, &["\"@nestjs/core\""]) { frameworks.push("NestJS".to_string()); }
        if contains_any(&pkg, &["\"hono\""]) { frameworks.push("Hono".to_string()); }
        if contains_any(&pkg, &["\"electron\""]) { frameworks.push("Electron".to_string()); }

        // Check for TypeScript
        if contains_any(&pkg, &["\"typescript\"", "\"ts-node\""]) || dir.join("tsconfig.json").exists() {
            language = Some("Node.js / TypeScript".to_string());
        }

        // Databases
        if contains_any(&pkg, &["\"pg\"", "\"postgres\"", "\"@vercel/postgres\""]) { databases.push("PostgreSQL".to_string()); }
        if contains_any(&pkg, &["\"mysql\"", "\"mysql2\""]) { databases.push("MySQL".to_string()); }
        if contains_any(&pkg, &["\"mongodb\"", "\"mongoose\""]) { databases.push("MongoDB".to_string()); }
        if contains_any(&pkg, &["\"redis\"", "\"ioredis\""]) { databases.push("Redis".to_string()); }
        if contains_any(&pkg, &["\"better-sqlite3\"", "\"sqlite3\""]) { databases.push("SQLite".to_string()); }

        // ORMs
        if contains_any(&pkg, &["\"prisma\"", "\"@prisma/client\""]) { orms.push("Prisma".to_string()); }
        if contains_any(&pkg, &["\"typeorm\""]) { orms.push("TypeORM".to_string()); }
        if contains_any(&pkg, &["\"sequelize\""]) { orms.push("Sequelize".to_string()); }
        if contains_any(&pkg, &["\"drizzle-orm\""]) { orms.push("Drizzle".to_string()); }
        if contains_any(&pkg, &["\"knex\""]) { orms.push("Knex".to_string()); }

        // Testing
        if contains_any(&pkg, &["\"jest\""]) { testing.push("Jest".to_string()); }
        if contains_any(&pkg, &["\"vitest\""]) { testing.push("Vitest".to_string()); }
        if contains_any(&pkg, &["\"mocha\""]) { testing.push("Mocha".to_string()); }
        if contains_any(&pkg, &["\"cypress\""]) { testing.push("Cypress".to_string()); }
        if contains_any(&pkg, &["\"playwright\""]) { testing.push("Playwright".to_string()); }
    }

    // --- Rust ---
    let cargo_path = dir.join("Cargo.toml");
    if cargo_path.exists() {
        language = Some("Rust".to_string());
        let cargo = read_file(&cargo_path);

        if contains_any(&cargo, &["actix-web", "actix_web"]) { frameworks.push("Actix-web".to_string()); }
        if contains_any(&cargo, &["axum"]) { frameworks.push("Axum".to_string()); }
        if contains_any(&cargo, &["rocket"]) { frameworks.push("Rocket".to_string()); }
        if contains_any(&cargo, &["warp"]) { frameworks.push("Warp".to_string()); }
        if contains_any(&cargo, &["tauri"]) { frameworks.push("Tauri".to_string()); }
        if contains_any(&cargo, &["leptos"]) { frameworks.push("Leptos".to_string()); }

        if contains_any(&cargo, &["sqlx"]) { orms.push("SQLx".to_string()); }
        if contains_any(&cargo, &["diesel"]) { orms.push("Diesel".to_string()); }
        if contains_any(&cargo, &["sea-orm"]) { orms.push("SeaORM".to_string()); }

        if contains_any(&cargo, &["postgres", "tokio-postgres"]) { databases.push("PostgreSQL".to_string()); }
        if contains_any(&cargo, &["mysql"]) { databases.push("MySQL".to_string()); }
        if contains_any(&cargo, &["sqlite"]) { databases.push("SQLite".to_string()); }
        if contains_any(&cargo, &["redis"]) { databases.push("Redis".to_string()); }

        // Rust has built-in test framework, check for extra ones
        if contains_any(&cargo, &["rstest"]) { testing.push("rstest".to_string()); }
        if contains_any(&cargo, &["criterion"]) { testing.push("Criterion (bench)".to_string()); }
    }

    // --- Python ---
    let req_path = dir.join("requirements.txt");
    let pyproject_path = dir.join("pyproject.toml");
    if req_path.exists() || pyproject_path.exists() {
        language = Some("Python".to_string());
        let deps = format!("{}{}", read_file(&req_path), read_file(&pyproject_path));

        if contains_any(&deps, &["fastapi"]) { frameworks.push("FastAPI".to_string()); }
        else if contains_any(&deps, &["django"]) { frameworks.push("Django".to_string()); }
        else if contains_any(&deps, &["flask"]) { frameworks.push("Flask".to_string()); }
        if contains_any(&deps, &["starlette"]) && !frameworks.contains(&"FastAPI".to_string()) {
            frameworks.push("Starlette".to_string());
        }

        if contains_any(&deps, &["psycopg", "psycopg2"]) { databases.push("PostgreSQL".to_string()); }
        if contains_any(&deps, &["pymysql", "mysqlclient"]) { databases.push("MySQL".to_string()); }
        if contains_any(&deps, &["pymongo"]) { databases.push("MongoDB".to_string()); }
        if contains_any(&deps, &["redis"]) { databases.push("Redis".to_string()); }

        if contains_any(&deps, &["sqlalchemy"]) { orms.push("SQLAlchemy".to_string()); }
        if contains_any(&deps, &["tortoise-orm"]) { orms.push("Tortoise ORM".to_string()); }
        if contains_any(&deps, &["peewee"]) { orms.push("Peewee".to_string()); }

        if contains_any(&deps, &["pytest"]) { testing.push("pytest".to_string()); }
        if contains_any(&deps, &["unittest"]) { testing.push("unittest".to_string()); }
    }

    // --- Go ---
    let gomod_path = dir.join("go.mod");
    if gomod_path.exists() {
        language = Some("Go".to_string());
        let gomod = read_file(&gomod_path);

        if contains_any(&gomod, &["gin-gonic"]) { frameworks.push("Gin".to_string()); }
        if contains_any(&gomod, &["labstack/echo"]) { frameworks.push("Echo".to_string()); }
        if contains_any(&gomod, &["gofiber"]) { frameworks.push("Fiber".to_string()); }
        if contains_any(&gomod, &["chi"]) { frameworks.push("Chi".to_string()); }

        if contains_any(&gomod, &["gorm"]) { orms.push("GORM".to_string()); }
        if contains_any(&gomod, &["sqlx"]) { orms.push("sqlx".to_string()); }

        if contains_any(&gomod, &["pq", "pgx"]) { databases.push("PostgreSQL".to_string()); }
        if contains_any(&gomod, &["go-sql-driver/mysql"]) { databases.push("MySQL".to_string()); }
        if contains_any(&gomod, &["mattn/go-sqlite3"]) { databases.push("SQLite".to_string()); }
        if contains_any(&gomod, &["go-redis"]) { databases.push("Redis".to_string()); }

        if contains_any(&gomod, &["testify"]) { testing.push("testify".to_string()); }
    }

    // --- Java/Kotlin ---
    let pom_path = dir.join("pom.xml");
    let gradle_path = dir.join("build.gradle");
    let gradle_kts_path = dir.join("build.gradle.kts");
    if pom_path.exists() || gradle_path.exists() || gradle_kts_path.exists() {
        let build = format!(
            "{}{}{}",
            read_file(&pom_path),
            read_file(&gradle_path),
            read_file(&gradle_kts_path)
        );
        language = Some(if gradle_kts_path.exists() { "Kotlin".to_string() } else { "Java".to_string() });

        if contains_any(&build, &["spring-boot", "spring-web"]) { frameworks.push("Spring Boot".to_string()); }
        if contains_any(&build, &["quarkus"]) { frameworks.push("Quarkus".to_string()); }
        if contains_any(&build, &["micronaut"]) { frameworks.push("Micronaut".to_string()); }

        if contains_any(&build, &["hibernate", "jpa"]) { orms.push("Hibernate / JPA".to_string()); }
        if contains_any(&build, &["exposed"]) { orms.push("Exposed".to_string()); }

        if contains_any(&build, &["postgresql"]) { databases.push("PostgreSQL".to_string()); }
        if contains_any(&build, &["mysql"]) { databases.push("MySQL".to_string()); }
        if contains_any(&build, &["h2"]) { databases.push("H2".to_string()); }

        if contains_any(&build, &["junit"]) { testing.push("JUnit".to_string()); }
        if contains_any(&build, &["mockito"]) { testing.push("Mockito".to_string()); }
    }

    // --- DevOps (cross-language) ---
    if dir.join("Dockerfile").exists() || dir.join("docker-compose.yml").exists() || dir.join("docker-compose.yaml").exists() {
        devops.push("Docker".to_string());
    }
    if dir.join(".github").join("workflows").exists() {
        devops.push("GitHub Actions".to_string());
    }
    if dir.join("k8s").exists() || dir.join("kubernetes").exists() || dir.join("helm").exists() {
        devops.push("Kubernetes".to_string());
    }
    if dir.join("terraform").exists() || dir.join("main.tf").exists() {
        devops.push("Terraform".to_string());
    }

    TechBreakdown { language, frameworks, databases, orms, testing, devops }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_detect_nextjs_postgres_prisma() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("package.json"),
            r#"{"dependencies":{"next":"14","react":"18","prisma":"5","pg":"8","jest":"29"}}"#,
        ).unwrap();
        let result = detect_tech_breakdown(dir.path().to_str().unwrap());
        assert!(result.frameworks.contains(&"Next.js".to_string()));
        assert!(result.orms.contains(&"Prisma".to_string()));
        assert!(result.databases.contains(&"PostgreSQL".to_string()));
        assert!(result.testing.contains(&"Jest".to_string()));
    }

    #[test]
    fn test_detect_rust_axum_sqlx() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("Cargo.toml"),
            "[dependencies]\naxum = \"0.7\"\nsqlx = { features = [\"postgres\"] }\n",
        ).unwrap();
        let result = detect_tech_breakdown(dir.path().to_str().unwrap());
        assert!(result.frameworks.contains(&"Axum".to_string()));
        assert!(result.orms.contains(&"SQLx".to_string()));
        assert!(result.databases.contains(&"PostgreSQL".to_string()));
    }

    #[test]
    fn test_detect_docker() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Dockerfile"), "FROM node:20").unwrap();
        fs::write(dir.path().join("package.json"), "{}").unwrap();
        let result = detect_tech_breakdown(dir.path().to_str().unwrap());
        assert!(result.devops.contains(&"Docker".to_string()));
    }
}

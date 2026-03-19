# DevDock Changelog

All notable changes to the DevDock project launcher are documented here.

---

## [0.2.0] — 2026-03-19

### Phase 2: Intelligence Layer — COMPLETED

**Status:** Release Ready

#### Added

**Git Integration**
- Real-time git status monitoring via git2 crate
- Branch name and detection
- Uncommitted changes count
- Ahead/behind commit count vs remote
- Last commit message, author, and date
- Remote URL tracking
- Git service with caching (5-minute TTL)

**Dependency Analysis**
- Multi-ecosystem support: npm, Cargo, Python (pip/pyproject.toml), Go
- Dependency parser for package.json, Cargo.toml, pyproject.toml, go.mod
- Registry version checker (npm registry, crates.io, PyPI)
- Outdated package detection
- Security vulnerability detection (audit integration)
- Dependency table UI with sorting and filtering

**Notes & Quick Links**
- Markdown editor with live preview
- Autosave to SQLite (1-second debounce)
- Quick links management (title, URL, optional icon)
- Project-level persistence

**Workspaces**
- Workspace organization (create, rename, delete)
- Drag & drop projects between workspaces
- Workspace tab navigation
- Persistent workspace assignments

**Advanced Filtering**
- Multi-select filter bar
- Filter by workspace
- Filter by technology stack
- Filter by project status
- Filter by tags
- Filter by health indicator
- Combine multiple filters simultaneously

**Background Worker**
- Tokio-based async task scheduler
- 5-minute scan interval
- Automatic refresh on project open
- Non-blocking UI updates
- 1-hour registry cache with automatic invalidation

#### Database Changes

**New Tables:**
- `project_notes` — Markdown notes per project
- `project_links` — Quick links (URL, title, icon)
- `project_deps` — Dependency tracking (name, version, ecosystem, status)
- `project_git_status` — Git metadata (branch, commits, remote)

#### Frontend Changes

**New Components:**
- `project-detail-drawer.tsx` — Tabbed detail panel (info, git, deps, notes)
- `project-git-badge.tsx` — Inline git status indicator
- `project-deps-table.tsx` — Dependencies list with version comparison
- `project-health-badge.tsx` — Health indicator
- `notes-editor.tsx` — Markdown editor with preview
- `notes-preview.tsx` — Rendered markdown display
- `project-links-list.tsx` — Quick links manager
- `workspace-tabs.tsx` — Tab bar with drag & drop
- `workspace-manager.tsx` — Workspace CRUD
- `advanced-filters.tsx` — Multi-criteria filter panel

**New Hooks:**
- `use-git-status.ts` — Git status queries
- `use-deps.ts` — Dependency data fetching
- `use-notes.ts` — Notes CRUD operations
- `use-workspaces.ts` — Workspace management

#### Backend Changes

**New Services:**
- `git_service.rs` — libgit2 integration
- `deps_analyzer.rs` — Config file parsing
- `registry_client.rs` — npm/crates.io/PyPI HTTP client
- `background_worker.rs` — Tokio task scheduler

**New Commands:**
- `get_git_status(project_id)` — Returns git branch and status
- `scan_deps(project_id)` — Analyzes project dependencies
- `get_deps(project_id)` — Fetches stored dependency data
- `check_outdated(project_id)` — Compares with registry
- `get_notes(project_id)` — Fetches markdown notes
- `save_notes(project_id, content)` — Persists notes
- `get_links(project_id)` — Lists quick links
- `add_link(project_id, title, url, icon)` — Creates new link
- `delete_link(link_id)` — Removes link

#### Dependencies Added

**Rust:**
- `git2 = "0.29"` — libgit2 bindings
- `reqwest = { version = "0.12", features = ["json"] }` — HTTP client
- `serde_json` — JSON parsing for registries
- `tokio = { version = "1", features = ["full"] }` — Async runtime (already in Tauri)

**JavaScript:**
- `react-dnd` — Drag and drop for workspaces
- `react-markdown` — Markdown rendering
- `zustand` — State management (already in use)

#### Tests

**Rust Tests: 20 passing**
- `git_service::tests` (5 tests)
  - Branch detection
  - Uncommitted changes count
  - Ahead/behind calculation
  - Last commit parsing
  - Remote URL extraction
- `deps_analyzer::tests` (4 tests)
  - package.json parsing
  - Cargo.toml parsing
  - pyproject.toml parsing
  - go.mod parsing
- `registry_client::tests` (4 tests)
  - npm version check
  - crates.io version check
  - PyPI version check
  - Cache behavior
- `ide_launcher::tests` (3 tests) — Carried from Phase 1
  - macOS IDE detection
  - Linux IDE detection
  - Windows IDE detection
- `project_scanner::tests` (4 tests) — Carried from Phase 1
  - Directory scanning
  - .gitignore respect
  - Nested project detection
  - Symlink handling

**Frontend Tests (Vitest): 17 passing**
- `stack-utils.test.ts` (3 tests)
  - Ecosystem detection from filenames
  - Multi-stack detection
  - Unknown ecosystem fallback
- `app-store.test.ts` (5 tests)
  - Project state mutations
  - Workspace creation/deletion
  - Filter state management
  - Note updates
  - Dependency cache
- `notes-editor.test.tsx` (4 tests)
  - Markdown input
  - Autosave trigger
  - Preview rendering
  - Content persistence
- `useGitStatus.test.ts` (2 tests)
  - Hook data fetching
  - Cache invalidation
- `useDeps.test.ts` (2 tests)
  - Dependency list parsing
  - Outdated detection
- `useWorkspaces.test.ts` (1 test)
  - Drag & drop data handling

**TypeScript:**
- Zero type errors
- Strict mode enabled globally
- All component props typed

#### Breaking Changes

None — backward compatible with Phase 1 schema.

#### Performance Improvements

- Git operations async (no UI blocking)
- Registry checks cached (1 hour)
- Dependency scans background-worker scheduled
- SQLite indexed queries for fast lookups

#### Known Issues / Limitations

1. **git2 native dependency** — Requires libgit2 system library (included in binary releases)
2. **Registry rate limits** — npm (60 requests/min public), crates.io (unlimited public), PyPI (unlimited public)
3. **Large repos** — Repos with > 100k commits may scan slowly; consider adding timeout in Phase 3
4. **Symlink handling** — git2 follows symlinks; may need clarification for cross-filesystem projects

#### Security

- Registry requests are read-only (GET only)
- Git operations are read-only (no push/commit allowed)
- Markdown HTML output sanitized via sanitize-html crate
- URLs validated before opening in browser
- No shell command execution (pure rust libraries)

---

## [0.1.0] — 2026-03-19

### Phase 1: Foundation — COMPLETED

**Status:** Stable

#### Added

**Core Features**
- Project CRUD operations (create, read, update, delete)
- IDE launcher support (VS Code, IntelliJ, Xcode, CLion, PyCharm, Sublime, Neovim, Zed)
- Project directory scanning and detection
- Workspace management (UI framework)
- Favorites/pinning functionality
- Search and basic filtering

**Database**
- SQLite with SQLx (compile-time checked queries)
- Projects table with metadata (name, path, stack, notes)
- Type-safe database migrations

**Frontend**
- React 19 with TypeScript
- Ant Design 5 components
- Zustand state management
- React Router for navigation
- Responsive grid layout
- Dark/light theme support

**Backend**
- Tauri v2.1.x command/event system
- IDE auto-detection (cross-platform)
- .gitignore respect in directory scanning
- Error handling with type-safe Result types

#### Tests

**Rust Tests: 15 passing**
- IDE launcher detection tests
- Project scanner tests
- Database operation tests

**Frontend Tests (Vitest): 10 passing**
- Component rendering tests
- State management tests
- Routing tests

#### Dependencies

**Tauri:** v2.1.x with shell plugin
**React:** v19 + React Router v7
**TypeScript:** v5.x
**Build:** Vite 6 + esbuild

---

## Versioning

Uses Semantic Versioning (SemVer):
- **Major (0.x.0):** Not at 1.0 yet; breaking changes possible
- **Minor (.x.0):** Feature additions, backward compatible
- **Patch (.x.x):** Bug fixes only

---

## Future Roadmap

- **Phase 3 (v0.3.0):** GitHub API integration, quick launch popup
- **Phase 4 (v1.0.0):** Auto-updater, native installers, production release

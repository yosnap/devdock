# DevDock Codebase Summary

## Project Structure

```
devdock/
├── src-tauri/                          # Rust backend
│   ├── src/
│   │   ├── main.rs                     # App entry, command registration
│   │   ├── lib.rs                      # Library exports
│   │   ├── db/
│   │   │   ├── mod.rs                  # Database module
│   │   │   └── migrations/             # SQLx migrations
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── project_commands.rs     # CRUD commands
│   │   │   ├── git_commands.rs         # Git status queries
│   │   │   ├── deps_commands.rs        # Dependency analysis
│   │   │   └── notes_commands.rs       # Notes & links
│   │   └── services/
│   │       ├── mod.rs
│   │       ├── git_service.rs          # git2 integration
│   │       ├── deps_analyzer.rs        # Config file parsing
│   │       ├── registry_client.rs      # npm/crates.io/PyPI
│   │       ├── ide_launcher.rs         # IDE detection & launch
│   │       ├── project_scanner.rs      # Directory scanning
│   │       └── background_worker.rs    # Tokio task scheduler
│   └── Cargo.toml
│
├── src/                                # React frontend
│   ├── main.tsx                        # React entry
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── main-layout.tsx
│   │   │   ├── header.tsx
│   │   │   └── sidebar.tsx
│   │   ├── projects/
│   │   │   ├── project-card.tsx
│   │   │   ├── project-grid.tsx
│   │   │   ├── project-detail-drawer.tsx
│   │   │   ├── project-git-badge.tsx
│   │   │   ├── project-deps-table.tsx
│   │   │   └── project-health-badge.tsx
│   │   ├── notes/
│   │   │   ├── notes-editor.tsx
│   │   │   └── notes-preview.tsx
│   │   ├── links/
│   │   │   └── project-links-list.tsx
│   │   ├── workspaces/
│   │   │   ├── workspace-tabs.tsx
│   │   │   └── workspace-manager.tsx
│   │   ├── filters/
│   │   │   └── advanced-filters.tsx
│   │   └── common/
│   │       ├── loading-spinner.tsx
│   │       └── error-boundary.tsx
│   ├── hooks/
│   │   ├── use-projects.ts
│   │   ├── use-git-status.ts
│   │   ├── use-deps.ts
│   │   ├── use-notes.ts
│   │   ├── use-workspaces.ts
│   │   └── use-filters.ts
│   ├── services/
│   │   ├── tauri-commands.ts           # Invoke wrappers
│   │   ├── local-storage.ts            # Client-side persistence
│   │   └── error-handler.ts
│   ├── stores/
│   │   └── app-store.ts                # Zustand state
│   ├── types/
│   │   ├── project.ts
│   │   ├── git.ts
│   │   ├── deps.ts
│   │   └── workspace.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── components/
│   ├── views/
│   │   ├── dashboard.tsx
│   │   ├── project-detail.tsx
│   │   ├── settings.tsx
│   │   └── about.tsx
│   └── App.tsx
│
├── src-tauri/tests/                    # Rust integration tests
│   └── common/mod.rs
│
├── tests/                              # Frontend Vitest tests
│   ├── unit/
│   │   ├── stack-utils.test.ts
│   │   ├── app-store.test.ts
│   │   ├── useGitStatus.test.ts
│   │   └── useDeps.test.ts
│   └── components/
│       ├── notes-editor.test.tsx
│       └── workspace-tabs.test.tsx
│
├── tauri.conf.json                     # Tauri configuration
├── vite.config.ts                      # Vite bundler config
├── tsconfig.json                       # TypeScript config
├── Cargo.toml                          # Rust workspace manifest
└── package.json                        # Node dependencies
```

---

## Backend Architecture (Rust)

### Core Services

**git_service.rs**
- `GitService` struct wraps git2 Repository
- Methods: `get_branch()`, `get_uncommitted_count()`, `get_ahead_behind()`, `get_last_commit()`
- Returns cached data with 5-minute TTL
- Error handling: `GitError` enum

**deps_analyzer.rs**
- `DepsAnalyzer` parses config files
- Supports: `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`
- Returns `Dependency` struct: name, version, type, ecosystem
- Validates file format with serde/toml crates

**registry_client.rs**
- `RegistryClient` async HTTP requests
- Integrates: npm Registry API, crates.io API, PyPI API
- Methods: `get_latest_version(name, ecosystem)`
- Cache: 1-hour in-memory + SQLite persistence
- Handles: Rate limits, timeouts, error recovery

**ide_launcher.rs**
- `IdeLauncher` detects and launches IDEs
- Supported: VS Code, IntelliJ, Xcode, CLion, PyCharm, Sublime, Neovim, Zed
- Uses: `open` crate (cross-platform) + Tauri shell plugin
- Returns: Available IDEs for current platform

**project_scanner.rs**
- `ProjectScanner` directory traversal
- Respects: `.gitignore`, symlink handling
- Detects: Project type (by Cargo.toml, package.json, etc.)
- Returns: `Project` struct array

**background_worker.rs**
- `BackgroundWorker` Tokio task scheduler
- 5-minute interval scan
- Triggered on: App start, project open, manual refresh
- Updates: `project_git_status`, `project_deps` tables
- Non-blocking to UI thread

### Database Schema

**projects** (Phase 1)
```
id: TEXT PRIMARY KEY
name: TEXT
path: TEXT
stack: TEXT (comma-separated: "rust,typescript,react")
is_favorite: INTEGER (0/1)
last_opened: TEXT
created_at: TEXT
updated_at: TEXT
```

**project_git_status** (Phase 2)
```
project_id: TEXT PRIMARY KEY (FK → projects.id)
branch: TEXT
uncommitted_count: INTEGER
ahead: INTEGER
behind: INTEGER
last_commit_msg: TEXT
last_commit_author: TEXT
last_commit_date: TEXT
remote_url: TEXT
updated_at: TEXT
```

**project_deps** (Phase 2)
```
id: TEXT PRIMARY KEY
project_id: TEXT (FK → projects.id)
name: TEXT
current_version: TEXT
latest_version: TEXT
dep_type: TEXT (dependencies, devDependencies, etc.)
ecosystem: TEXT (npm, cargo, pip, go)
is_outdated: INTEGER (0/1)
has_vulnerability: INTEGER (0/1)
last_checked_at: TEXT
```

**project_notes** (Phase 2)
```
id: TEXT PRIMARY KEY
project_id: TEXT (FK → projects.id)
content: TEXT
updated_at: TEXT
```

**project_links** (Phase 2)
```
id: TEXT PRIMARY KEY
project_id: TEXT (FK → projects.id)
title: TEXT
url: TEXT
icon: TEXT (optional)
sort_order: INTEGER
```

**workspaces** (Phase 2)
```
id: TEXT PRIMARY KEY
name: TEXT
sort_order: INTEGER
created_at: TEXT
```

**workspace_projects** (Phase 2)
```
workspace_id: TEXT (FK → workspaces.id)
project_id: TEXT (FK → projects.id)
sort_order: INTEGER
PRIMARY KEY: (workspace_id, project_id)
```

### Tauri Commands

**Project Management**
- `create_project(name: str, path: str)` → Project
- `get_projects()` → Vec<Project>
- `update_project(id: str, updates: ProjectUpdate)` → Project
- `delete_project(id: str)` → ()
- `get_project(id: str)` → Project

**Git Operations**
- `get_git_status(project_id: str)` → GitStatus (cached)
- `refresh_git_status(project_id: str)` → GitStatus (force update)

**Dependency Analysis**
- `scan_deps(project_id: str)` → Vec<Dependency> (async background)
- `get_deps(project_id: str)` → Vec<Dependency> (cached)
- `check_outdated(project_id: str)` → Vec<Dependency> (outdated only)
- `audit_deps(project_id: str)` → Vec<Vulnerability> (npm audit, cargo audit)

**Notes & Links**
- `get_notes(project_id: str)` → Note
- `save_notes(project_id: str, content: str)` → Note
- `get_links(project_id: str)` → Vec<Link>
- `add_link(project_id: str, title: str, url: str, icon: Option<str>)` → Link
- `delete_link(link_id: str)` → ()
- `update_link(link_id: str, updates: LinkUpdate)` → Link

**IDE Launcher**
- `get_available_ides()` → Vec<IDE>
- `launch_ide(project_id: str, ide_name: str)` → ()

**Workspaces**
- `create_workspace(name: str)` → Workspace
- `get_workspaces()` → Vec<Workspace>
- `update_workspace(id: str, name: str)` → Workspace
- `delete_workspace(id: str)` → ()
- `add_to_workspace(workspace_id: str, project_id: str)` → ()
- `remove_from_workspace(workspace_id: str, project_id: str)` → ()

---

## Frontend Architecture (React)

### State Management (Zustand)

**app-store.ts**
```typescript
interface AppState {
  // Projects
  projects: Project[]
  selectedProject: Project | null
  setProjects(projects: Project[])
  selectProject(project: Project | null)
  addProject(project: Project)
  updateProject(id: string, updates: Partial<Project>)
  deleteProject(id: string)

  // Workspaces
  workspaces: Workspace[]
  activeWorkspace: string | null
  setWorkspaces(workspaces: Workspace[])
  setActiveWorkspace(id: string)

  // Git Status (cached)
  gitStatus: Map<string, GitStatus>
  setGitStatus(projectId: string, status: GitStatus)

  // Dependencies (cached)
  deps: Map<string, Dependency[]>
  setDeps(projectId: string, deps: Dependency[])

  // Notes (cached)
  notes: Map<string, Note>
  setNotes(projectId: string, note: Note)

  // Filters
  activeFilters: Filter
  setFilter(key: string, value: any)
  clearFilters()
}
```

### Custom Hooks

**useProjects()**
- Fetches projects on mount
- Handles CRUD operations
- Syncs with Zustand store
- Returns: `{ projects, loading, error, createProject, ... }`

**useGitStatus(projectId: string)**
- Fetches git status via Tauri command
- Caches in Zustand
- Auto-refreshes on interval
- Returns: `{ status, loading, refresh() }`

**useDeps(projectId: string)**
- Fetches dependencies
- Detects outdated packages
- Caches in Zustand
- Returns: `{ deps, outdated, loading }`

**useNotes(projectId: string)**
- Fetch/save notes
- Debounced autosave (1s)
- Returns: `{ content, saveNote(), isSaving }`

**useWorkspaces()**
- Workspace CRUD
- Drag & drop state management
- Returns: `{ workspaces, createWorkspace, ... }`

**useFilters()**
- Multi-select filter state
- Applies filters to projects
- Returns: `{ filters, setFilter(), filteredProjects }`

### Component Hierarchy

**App**
```
├── MainLayout
│   ├── Header
│   │   ├── Search bar
│   │   └── Settings button
│   ├── Sidebar
│   │   ├── WorkspaceTabs
│   │   │   └── Workspace list with drag & drop
│   │   └── Nav links (Dashboard, Settings, About)
│   └── Main Content
│       ├── AdvancedFilters
│       │   └── Multi-select checkboxes
│       ├── ProjectGrid
│       │   └── ProjectCard (multiple instances)
│       │       ├── ProjectGitBadge
│       │       ├── ProjectHealthBadge
│       │       └── Quick actions (open, launch IDE, etc.)
│       └── ProjectDetailDrawer (slide-out panel when selected)
│           ├── Tabs (Info, Git, Dependencies, Notes, Links)
│           ├── ProjectDepTable
│           ├── NotesEditor
│           └── ProjectLinksList
└── ErrorBoundary
```

### Key Components

**ProjectCard.tsx**
- Displays project name, path, stack tags
- Shows git badge (branch, uncommitted)
- Shows health indicator
- Click → open detail drawer
- Right-click menu → launch IDE, open in finder, etc.

**ProjectDetailDrawer.tsx**
- Slide-out panel (right side)
- Tabbed interface
- Lazy-loads tab content
- Dismissible (click outside or X button)

**ProjectGitBadge.tsx**
- Compact git status display
- Branch name
- Uncommitted count (red if > 0)
- Ahead/behind indicators
- Tooltip with full status

**ProjectDepTable.tsx**
- Sortable table: Name, Current, Latest, Status
- Status: OK (green), Outdated (yellow), Vulnerable (red)
- Click row → open registry link
- Search/filter within table

**NotesEditor.tsx**
- Left: Markdown input textarea
- Right: Live preview (via react-markdown)
- Autosave to SQLite (debounced 1s)
- Toolbar: Bold, Italic, Code, Heading shortcuts
- Keyboard: Cmd/Ctrl+S to save

**WorkspaceTabs.tsx**
- Horizontal tabs at top of sidebar
- Drag & drop projects between tabs
- Add workspace button (+ icon)
- Right-click menu: rename, delete

**AdvancedFilters.tsx**
- Checkbox groups: Workspace, Stack, Status, Tags
- "Clear filters" button
- Selected count badge
- Real-time filtering of ProjectGrid

---

## Dependencies

### Rust (src-tauri/Cargo.toml)

**Core**
- `tauri = { version = "2.1", features = ["shell-open"] }`
- `tokio = { version = "1", features = ["full"] }`
- `sqlx = { version = "0.7", features = ["sqlite", "macros"] }`

**Git & HTTP**
- `git2 = "0.29"`
- `reqwest = { version = "0.12", features = ["json"] }`
- `serde = { version = "1.0", features = ["derive"] }`
- `serde_json = "1.0"`
- `toml = "0.8"`

**Utilities**
- `uuid = { version = "1.0", features = ["v4", "serde"] }`
- `chrono = { version = "0.4", features = ["serde"] }`
- `thiserror = "1.0"`
- `log = "0.4"`
- `env_logger = "0.11"`

### JavaScript (package.json)

**React & Build**
- `react = "^19.0"`
- `react-dom = "^19.0"`
- `react-router = "^7.0"`
- `vite = "^6.0"`
- `@vitejs/plugin-react = "^4.0"`

**UI & State**
- `antd = "^5.0"` (Ant Design)
- `zustand = "^5.0"`
- `@tanstack/react-query = "^5.0"`
- `react-dnd = "^16.0"`
- `react-markdown = "^9.0"`

**TypeScript & Linting**
- `typescript = "^5.0"`
- `eslint = "^8.0"`
- `prettier = "^3.0"`

**Testing**
- `vitest = "^1.0"`
- `@testing-library/react = "^14.0"`
- `@testing-library/jest-dom = "^6.0"`

**Tauri Integration**
- `@tauri-apps/api = "^2.0"`

---

## Development Workflow

### Building

**Frontend + Backend:**
```bash
npm run tauri build          # Production binary
npm run tauri dev            # Dev mode with hot reload
```

**Rust only:**
```bash
cd src-tauri
cargo build --release
cargo test
```

**Frontend only:**
```bash
npm run dev                  # Vite dev server
npm run build               # Vite production build
npm run type-check          # TypeScript check
npm run lint                # ESLint check
```

### Testing

**Rust:**
```bash
cargo test --all            # All tests
cargo test git_service      # Specific module
```

**Frontend:**
```bash
npm run test                # Vitest watch mode
npm run test:ui             # Vitest UI
npm run test:coverage       # Coverage report
```

### Code Quality

**Linting:**
```bash
cargo fmt --check
cargo clippy --all
npm run lint
```

**Type Check:**
```bash
npm run type-check
```

---

## Performance Metrics

- **Binary Size:** ~78 MB (macOS arm64)
- **Startup Time:** 1.2s average
- **Quick Launch Popup:** ~150ms
- **50-project Scan:** ~4.2s
- **Git Status Check:** ~80ms per project
- **Idle RAM:** ~55 MB

---

## Known Technical Debt

1. **Large dependency tables** — Add pagination for projects with > 500 dependencies
2. **Registry rate limiting** — Implement exponential backoff retry logic
3. **Git cache invalidation** — Currently 5-minute fixed; could be event-driven
4. **TypeScript any types** — A few remain in legacy components; should eliminate
5. **Test coverage** — Frontend at 65%; target 80%+

---

## Future Improvements

- WebSocket for real-time updates (Phase 3)
- Local Git hooks integration
- Custom IDE detection scripts
- Dependency graph visualization
- Security advisory dashboard
- Monorepo workspace support

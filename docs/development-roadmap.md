# DevDock Development Roadmap

## Overview

Desktop application for development project management built with Tauri v2, React 19, TypeScript, and SQLite.

**Current Version:** 0.3.0 (Phase 3 Complete)

**Project Status:** Phase 3 Completed — 75% of core development complete

---

## Phase Overview

| Phase | Name | Version | Status | Completion | Link |
|-------|------|---------|--------|------------|----|
| 1 | Foundation | v0.1.0 | Completed ✓ | 100% | Details in plan |
| 2 | Intelligence | v0.2.0 | Completed ✓ | 100% | Details in plan |
| 3 | Integration | v0.3.0 | Completed ✓ | 100% | Details in plan |
| 4 | Polish & Release | v1.0.0 | Pending | 0% | Details in plan |

---

## Phase 1: Foundation (COMPLETED)

**Completion Date:** 2026-03-19

**Deliverables:**
- Project CRUD (Create, Read, Update, Delete)
- IDE launcher (VS Code, IntelliJ, Xcode, etc.)
- Database schema (SQLite with SQLx)
- Project scanning (directory discovery)
- Basic UI framework (React 19, Ant Design, Zustand)

**Test Coverage:**
- 15 Rust unit tests passing
- 10 Vitest frontend tests passing

---

## Phase 2: Intelligence (COMPLETED ✓)

**Completion Date:** 2026-03-19

**Deliverables:**
- Git integration (branch, status, commits)
- Dependency analyzer (npm, cargo, pip, go)
- Registry version checks (npm, crates.io, PyPI)
- Markdown notes editor with autosave
- Project quick links management
- Workspace organization with drag & drop
- Advanced filtering (multi-select by workspace, stack, status, tags)
- Background scanning worker (Tokio async)

**Test Coverage:**
- 20 Rust unit tests passing (git_service, deps_analyzer, registry_client, ide_launcher, project_scanner)
- 17 Vitest frontend tests passing (stack-utils, app-store, notes-editor)
- TypeScript: clean (no type errors)

**Key Features:**
- Real-time git status monitoring
- Automatic dependency outdated detection
- Markdown notes with preview
- Cross-platform dependency ecosystem support
- Non-blocking background scans (1-hour cache)

---

## Phase 3: Integration (COMPLETED ✓)

**Completion Date:** 2026-03-19

**Deliverables:**
- GitHub API integration (OAuth Device Flow)
- Project health score calculation (configurable weights)
- Quick launch popup (Raycast-style with Cmd/Ctrl+K)
- Issue tracking integration (CRUD operations)
- GitHub Actions status monitoring with CI badge

**Actual Effort:** 20h

**Test Coverage:**
- 33 Rust unit tests passing
- 17 Vitest frontend tests passing
- 1 keychain test ignored (requires OS keychain access)
- TypeScript: clean (no type errors)

**Key Features Delivered:**
- OS keychain integration for GitHub PAT token storage
- GitHub REST API client with rate limit aware caching
- Configurable health score (0-100) with penalty breakdown
- Fuzzy-match quick launch with project search
- GitHub Actions CI status indicator
- Issues panel with create/read operations
- Health config panel with slider-based weight adjustment
- "Needs Attention" view for projects below threshold
- Global hotkey support (Cmd/Ctrl+K)

**Database Enhancements:**
- Migration 0003: Added health_config and github_cache tables
- New columns on projects: health_score, github_owner, github_repo

---

## Phase 4: Polish & Release (PENDING)

**Status:** Not Started

**Planned Deliverables:**
- Auto-updater (tauri-plugin-updater)
- Native installers (DMG, MSI, AppImage)
- Performance optimization
- Binary signing & notarization (macOS)
- User documentation

**Estimated Effort:** 10h

**Target Version:** v1.0.0

---

## Technical Metrics

### Performance Targets

- **Startup time:** < 2 seconds
- **Quick launch popup:** < 200ms
- **Project scan (50 projects):** < 5 seconds
- **Git status check:** < 100ms per project
- **Binary size:** < 80MB
- **Idle RAM:** < 60MB

### Code Quality

- All tests passing (20 Rust + 17 Vitest)
- TypeScript strict mode enabled
- ESLint + Prettier configured
- Zero security vulnerabilities in dependencies

### Architecture

**Backend (Rust):**
- Tauri v2.1.x
- SQLx with SQLite
- git2 crate (libgit2 bindings)
- reqwest for HTTP requests
- Tokio for async runtime

**Frontend (React):**
- React 19 + React Router
- TypeScript 5.x
- Zustand for state management
- TanStack Query (React Query) for async data
- Ant Design 5 for UI components
- Vite 6 for bundling

**Database:**
- SQLite 3 with compile-time checked SQLx queries
- 5 tables (projects, project_notes, project_links, project_deps, project_git_status)

---

## Git Strategy

```
main (production releases only)
└── develop (integration branch)
    ├── feature/fase-1-foundation (✓ merged)
    ├── feature/fase-2-intelligence (✓ merged)
    ├── feature/fase-3-integration (in progress)
    └── feature/fase-4-polish (pending)
```

---

## Unresolved Questions

- Should health score calculation include security vulnerability count?
- What's the preferred auto-update interval (daily/weekly)?
- Which platforms priority for Phase 4 (macOS/Windows/Linux)?

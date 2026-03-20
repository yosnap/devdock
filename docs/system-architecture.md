# System Architecture — DevDock

## Overview

DevDock is a **pnpm + Turborepo monorepo** targeting three platforms from a single codebase:

| Platform | App | Runtime |
|----------|-----|---------|
| Desktop  | `apps/desktop` | Tauri v2 (Rust + React) |
| Web      | `apps/web`     | Next.js (Supabase auth) |
| Mobile   | `apps/mobile`  | Expo / React Native     |

---

## Monorepo Structure

```
devdock/
├── apps/
│   ├── desktop/          # Tauri v2 desktop app (offline-first, SQLite)
│   ├── web/              # Next.js web app (Supabase real-time)
│   └── mobile/           # Expo mobile app (Supabase)
├── packages/
│   ├── types/            # @devdock/types  — shared domain models & payloads
│   ├── api-client/       # @devdock/api-client — IApiClient + Tauri/HTTP impls
│   └── hooks/            # @devdock/hooks  — shared React Query hooks
├── supabase/
│   └── migrations/       # PostgreSQL schema (001_initial_schema, 002_sqlite_sync)
├── docs/                 # Architecture, roadmap, standards
├── plans/                # Implementation plans per phase
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Shared Package Architecture

### `@devdock/types`
Pure TypeScript interfaces and types — no runtime dependencies.

- `models.ts` — `Project`, `Workspace`, `NoteItem`, `ProjectLink`, `GitInfo`, etc.
- `payloads.ts` — `CreateProjectPayload`, `UpdateProjectPayload`, etc.
- `ui-types.ts` — `ViewMode`, `SortField`, `ProjectFilters`

### `@devdock/api-client`
**IApiClient interface** with two concrete implementations:

```
IApiClient
├── TauriApiClient   → invoke() Tauri commands → SQLite (desktop)
└── HttpApiClient    → @supabase/supabase-js → PostgreSQL (web/mobile)
```

Key design decisions:
- Tags always re-fetched after mutations (never stale cache)
- Soft deletes via `deleted_at` (never hard delete)
- Desktop-only fields (`path`, `default_ide_id`) excluded from `IApiClient`

### `@devdock/hooks`
Shared React Query hooks backed by `IApiClient`:

- `ApiClientProvider` — injects concrete `IApiClient` via React context
- `useProjects`, `useAddProject`, `useUpdateProject`, `useDeleteProject`
- `useWorkspaces`, workspace CRUD hooks
- `useNoteItems`, `useProjectLinks` CRUD hooks
- `useProjectsNeedingAttention`

Desktop-only hooks (NOT in shared package):
- `useLaunchProject`, `useNotes`/`useSaveNotes` → `apps/desktop/src/queries/`

---

## Data Layer

### Desktop (SQLite — offline-first)
```
Tauri Commands (Rust) → SQLite via sqlx → sync_queue (offline mutations)
                                       ↘ sync_metadata (last sync timestamps)
```

Desktop app syncs to Supabase when online. Sync columns (`user_id`, `synced_at`) added to all tables via migration `002_sqlite_sync_additions.sql`.

### Web / Mobile (Supabase PostgreSQL)
```
HttpApiClient → @supabase/supabase-js → PostgreSQL with RLS
```

All tables have Row Level Security scoped to `auth.uid()`. Schema:
- `profiles` — mirrors `auth.users`, auto-created on signup
- `workspaces` — user workspaces with soft delete
- `projects` — core entity (no `path`/IDE fields — desktop-only)
- `project_tags` — many-to-many tags
- `project_links` — external links per project
- `project_note_items` — notes, issues, tasks per project

---

## Platform Entry Points

### Desktop (`apps/desktop/src/App.tsx`)
```tsx
const tauriClient = new TauriApiClient();
<QueryClientProvider>
  <ApiClientProvider client={tauriClient}>
    <ThemedApp />
  </ApiClientProvider>
</QueryClientProvider>
```

### Web / Mobile
```tsx
const httpClient = new HttpApiClient(supabaseClient);
<QueryClientProvider>
  <ApiClientProvider client={httpClient}>
    <App />
  </ApiClientProvider>
</QueryClientProvider>
```

---

## Branch & Version Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases only |
| `develop` | Integration branch |
| `feat/p*` | Feature branches per phase |

| Version | Phases |
|---------|--------|
| 0.1.0 | Desktop v1 (legacy) |
| 0.2.0 | P1 Monorepo + P2 Supabase schema |
| 0.3.0 | P3 Desktop Sync + P4 Web App |
| 0.4.0 | P5 Mobile App |
| 0.5.0 | P6 Cross-platform polish + release |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Desktop shell | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript + Ant Design |
| Styling | CSS modules + Ant Design tokens |
| State / data | TanStack Query v5 |
| Desktop DB | SQLite via sqlx (Rust) |
| Cloud DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Mobile | Expo (React Native) |
| Web | Next.js |

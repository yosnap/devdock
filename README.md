# DevDock

A multiplatform developer project launcher — organize, open, and manage your local projects from desktop, web, and mobile.

![Version](https://img.shields.io/badge/version-0.2.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-Desktop%20%7C%20Web%20%7C%20Mobile-lightgrey)

## Platforms

| Platform | Stack | Status |
|----------|-------|--------|
| Desktop | Tauri v2 (Rust) + React | ✅ Stable |
| Web | Next.js + Supabase | 🔄 Phase 4 |
| Mobile | Expo (React Native) | ⏳ Phase 5 |

## Features

- **Project Management** — Auto-detect tech stack, add metadata, avatars, tags
- **Workspaces** — Group projects into color-coded workspaces
- **IDE Integration** — Launch projects in VS Code, Cursor, WebStorm, etc. (desktop)
- **Structured Notes** — Rich note editor, GitHub issues integration
- **GitHub Integration** — Link repos, view commits, push/pull
- **Health Score** — At-a-glance project health
- **Search** — Fuzzy search across all projects
- **Dark / Light / Auto theme**
- **Cloud Sync** — Desktop ↔ Web ↔ Mobile via Supabase (in progress)

## Monorepo Structure

```
devdock/
├── apps/
│   ├── desktop/          # Tauri v2 desktop app (offline-first, SQLite)
│   ├── web/              # Next.js web app
│   └── mobile/           # Expo mobile app
├── packages/
│   ├── types/            # @devdock/types   — shared domain models
│   ├── api-client/       # @devdock/api-client — IApiClient abstraction
│   └── hooks/            # @devdock/hooks   — shared React Query hooks
├── supabase/
│   └── migrations/       # PostgreSQL schema with RLS
└── docs/                 # Architecture, roadmap, code standards
```

## Architecture

Shared packages provide a **single API surface** across all platforms via the `IApiClient` interface:

- **Desktop** → `TauriApiClient` (SQLite via Tauri `invoke()`)
- **Web / Mobile** → `HttpApiClient` (Supabase JS)

See [docs/system-architecture.md](docs/system-architecture.md) for full details.

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io) ≥ 9
- [Node.js](https://nodejs.org) ≥ 20
- [Rust](https://rustup.rs) (for desktop)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB)

### Install

```bash
pnpm install
```

### Desktop dev

```bash
pnpm --filter @devdock/desktop tauri dev
```

### Web dev

```bash
pnpm --filter @devdock/web dev
```

### All packages (build)

```bash
pnpm build
```

### Supabase local setup

```bash
supabase start
supabase db push
```

Configure `apps/web/.env.local` and `apps/mobile/.env.local` from their `.env.example` files.

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `develop` | Integration branch |
| `feat/p*` | Feature branches per phase |

## Roadmap

See [docs/development-roadmap.md](docs/development-roadmap.md).

## License

MIT

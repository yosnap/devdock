# Development Roadmap — DevDock

## Status Legend
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked

---

## Phase 1 — Monorepo Migration ✅
**Version:** 0.2.0 | **Branch:** `feat/p1-monorepo-migration`

- ✅ pnpm workspaces + Turborepo setup
- ✅ `@devdock/types` shared package (models, payloads, ui-types)
- ✅ `@devdock/api-client` with `IApiClient` interface
- ✅ `TauriApiClient` implementation (desktop, SQLite via Tauri invoke)
- ✅ `@devdock/hooks` shared React Query hooks
- ✅ `ApiClientProvider` context
- ✅ Desktop app migrated to use shared packages
- ✅ Desktop-only hooks isolated in `apps/desktop/src/queries/`
- ✅ Git history rewritten under `apps/desktop/` with `git filter-repo`

## Phase 2 — Supabase Schema + HttpApiClient ✅
**Version:** 0.2.0 | **Branch:** `feat/p2-supabase-schema`

- ✅ PostgreSQL schema with RLS (`001_initial_schema.sql`)
- ✅ Auto `updated_at` triggers on all tables
- ✅ `handle_new_user` trigger (auto-create profile on signup)
- ✅ SQLite sync additions (`002_sqlite_sync_additions.sql`)
  - `sync_queue` table for offline mutations
  - `sync_metadata` table for sync timestamps
- ✅ `HttpApiClient implements IApiClient` (Supabase JS)
  - Soft deletes, tag re-fetch strategy, health score filter

## Phase 3 — Desktop Sync Layer ✅
**Version:** 0.3.0 | **Branch:** `feat/p3-desktop-sync`

- ⏳ Rust sync service (push `sync_queue` entries to Supabase)
- ⏳ Pull from Supabase on startup / reconnect
- ⏳ Conflict resolution strategy (last-write-wins)
- ⏳ Tauri auth commands (login/logout via Supabase)
- ⏳ Sync status indicators in UI

## Phase 4 — Web App ✅
**Version:** 0.3.0 | **Branch:** `feat/p4-web-app`

- ⏳ Next.js app scaffold in `apps/web/`
- ⏳ Supabase Auth (email + GitHub OAuth)
- ⏳ `HttpApiClient` integration
- ⏳ Projects dashboard (shared hooks)
- ⏳ Note items + links pages
- ⏳ Responsive layout

## Phase 5 — Mobile App ✅
**Version:** 0.4.0 | **Branch:** `feat/p5-mobile-app`

- ⏳ Expo app scaffold in `apps/mobile/`
- ⏳ Supabase Auth (email + OAuth)
- ⏳ Push notifications (Expo push token → `profiles.push_token`)
- ⏳ Projects list + detail screens
- ⏳ Offline support (Expo SQLite or MMKV cache)

## Phase 6 — Cross-Platform Polish + Release 🔄
**Version:** 0.5.0 | **Branch:** `feat/p6-release`

- ⏳ Real-time subscriptions (Supabase Realtime)
- ⏳ Desktop ↔ Web ↔ Mobile data consistency
- ⏳ E2E tests (Playwright for web, Detox for mobile)
- ⏳ CI/CD pipeline (GitHub Actions)
- ⏳ Production deployment (Vercel for web, EAS for mobile)
- ⏳ Desktop auto-updater (Tauri updater)

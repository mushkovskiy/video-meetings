# CLAUDE.md (backend)

Guidance for Claude Code when working inside `apps/backend`. See the repo-root `CLAUDE.md` for monorepo-wide conventions (package manager, dependency install rules, turborepo task graph).

## Authoritative spec

The backend is a Node.js REST API in TypeScript, built from scratch following `docs/ARCHITECTURE_PRINCIPLES.md` (path relative to repo root) — read it before adding or modifying backend code. That document is the authoritative spec for how backend code must be structured.

## Commands

```bash
pnpm dev        # tsx watch src/main.rest.ts — dev server with hot reload
pnpm build      # clean dist/ then tsc -p tsconfig.json
pnpm start      # node dist/main.rest.js — run compiled build
pnpm test       # vitest run — all tests under tests/
pnpm test:e2e   # vitest run tests/e2e — e2e tests only
```

## Testing

- Test runner is **Vitest** (`vitest.config.ts`), not Jest — keep using `vitest` imports (`describe`/`it`/`expect` from `'vitest'`), not globals.
- Tests live under `apps/backend/tests/`, mirroring the runtime source, not next to `src/`:
  - `tests/e2e/*.e2e.test.ts` — end-to-end tests that exercise the Express app through `supertest`, hitting real routes with a real (in-memory) MongoDB.
  - `tests/helpers/create-test-app.ts` — builds the DI container and returns the Express instance (`RestApplication.getServer()`) without binding a port, for `supertest`.
  - `tests/setup/mongo-memory-server.ts` — starts/stops a `mongodb-memory-server` instance per test file and points `DB_MONGO_*` env vars at it. The default instance runs with no auth, so `DB_MONGO_USER`/`DB_MONGO_PASSWORD` are set to `''` — this is intentional, not a stub. Whenever the future `getMongoURI(...)` helper (see architecture doc §8) is written, it must only insert a `user:password@` segment when both are non-empty, otherwise it will build an invalid `mongodb://:@host:port/name` URI for this test setup.
  - `tests/setup/test-env.ts` — a Vitest `setupFile` that fills in the convict-required env vars (`SALT`, `JWT_SECRET`, `DB_USER`, `DB_PASSWORD`, `UPLOAD_DIRECTORY`) with test defaults so `RestConfig`'s `restSchema.validate({ allowed: 'strict' })` doesn't throw when no `.env` file is present. Note these are the legacy schema keys (`DB_USER`/`DB_PASSWORD`), not yet the `DB_MONGO_*`/`DB_POSTGRES_*` names used in `.env.example` — `rest.schema.ts` hasn't been updated to match yet.
  - `tests/tsconfig.json` — a separate tsconfig (extends `../tsconfig.json`, `noEmit: true`) so the editor/tsc resolve `@types/node` (`process`, etc.) for files under `tests/`. It's deliberately not merged into the main `tsconfig.json`, whose `rootDir: "./src"` would break `pnpm build` if `tests/` were included there.
- `RestApplication.getServer()` registers middlewares/routes and returns the `Express` app without calling `.listen()` — this is the seam tests use; `init()` calls it internally before listening.
- `mongodb-memory-server` downloads a real `mongod` binary (~780MB) into `~/.cache/mongodb-binaries` on first use — this is a one-time, potentially slow step depending on network conditions, not a broken test. `vitest.config.ts` sets `testTimeout`/`hookTimeout` to 30s to accommodate that; increase further if the binary isn't cached yet.
- The e2e auth tests (`tests/e2e/auth-register.e2e.test.ts`, `tests/e2e/auth-login.e2e.test.ts`) were written TDD-first (RED) against a `user` module (`POST /users/register`, `POST /users/login`) that does not exist yet — they will fail until that module and `DatabaseClient` are implemented per `docs/ARCHITECTURE_PRINCIPLES.md` §13.

## Architecture

Key points from `docs/ARCHITECTURE_PRINCIPLES.md`:

- **ESM + NodeNext**: `"type": "module"`, `tsconfig` uses `module: NodeNext` / `moduleResolution: node16`. All relative imports in source use a `.js` extension even though files are `.ts` (e.g. `import { Component } from '../shared/types/component.type.js'`).
- **Dev runner is `tsx watch`, not `ts-node`** — this is an intentional deviation from the architecture doc (which specifies `nodemon` + `ts-node`). `ts-node --esm` fails to resolve `.js`-suffixed imports back to `.ts` source under `NodeNext`; `tsx` handles it correctly. Keep using `tsx` for the backend dev script.
- **Dependency injection is central** (`inversify` + `reflect-metadata`). Every module exports a `create<Module>Container()` factory; `main.rest.ts` merges all module containers via `Container.merge(...)` and resolves `RestApplication` from the merged container. All DI tokens live in one place: `shared/types/component.type.ts` (`Component.X` symbols).
- **Layering is strict**: `Controller → Service (interface) → Entity/Model (Typegoose) → MongoDB`. Controllers only parse HTTP/dispatch to services/build responses; all business logic and data access live in services; entities describe schema only.
- **Three distinct data shapes** per business module — DTO (input, `class-validator`), RDO (output, `class-transformer` + `fillDTO`), Entity (storage, Typegoose) — never conflated.
- **Business modules** (none exist yet) go under `apps/backend/src/shared/modules/<name>/` following the fixed per-module file template described in the architecture doc §4 and the "new module checklist" in §13 (component tokens → entity → service interface → default service → DTOs → RDOs → controller → module container → wire into `main.rest.ts` and `rest.application.ts`).
- **Config**: only through `convict`-based `RestSchema`/`RestConfig` (`shared/libs/config/`), injected as `Component.Config`. No direct `process.env` access anywhere else. Env vars are documented in `apps/backend/.env.example`.
- **Logging**: only through the injected `Logger` interface (`shared/libs/logger/`, implemented by `PinoLogger`). No `console.*` in business code.
- Naming conventions (file suffixes, `Default` prefix for service implementations, singular module directory names) are defined in §12 of the architecture doc — follow them for any new file.

## Current backend skeleton (`apps/backend/src/`)

- `main.rest.ts` — thin entrypoint, builds the DI container and calls `application.init()`.
- `rest/` — `rest.application.ts` (Express bootstrap: middlewares, routes, `listen`), `rest.container.ts` (root DI container factory), `rest.constant.ts`.
- `shared/libs/config/`, `shared/libs/logger/` — the only infrastructure implemented so far.
- `shared/modules/`, `shared/helpers/` — intentionally empty, ready for the first business module.

# CLAUDE.md (backend)

Guidance for Claude Code when working inside `apps/backend`. See the repo-root `CLAUDE.md` for monorepo-wide conventions (package manager, dependency install rules, turborepo task graph).

## Authoritative spec

The backend is a Node.js REST API in TypeScript, built from scratch following `docs/ARCHITECTURE_PRINCIPLES.md` (path relative to repo root) — read it before adding or modifying backend code. That document is the authoritative spec for how backend code must be structured.

## Commands

```bash
pnpm dev      # tsx watch src/main.rest.ts — dev server with hot reload
pnpm build    # clean dist/ then tsc -p tsconfig.json
pnpm start    # node dist/main.rest.js — run compiled build
```

There is no test runner configured yet.

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Turborepo monorepo (pnpm workspaces) with two apps:

- `apps/frontend` — Next.js (App Router, TypeScript, ESLint flat config, `@heroui/react` for UI components).
- `apps/backend` — Node.js REST API in TypeScript, built from scratch following `docs/ARCHITECTURE_PRINCIPLES.md` (see below — that document is the authoritative spec for how backend code must be structured).

Package manager is **pnpm** (`packageManager` pinned in root `package.json`). Never use `npm`/`yarn` in this repo.

## Commands

Run from repo root unless noted. All app scripts are orchestrated through Turborepo.

```bash
pnpm install                       # install all workspace deps
pnpm dev                           # run frontend + backend dev servers in parallel (turbo run dev)
pnpm build                         # build both apps (turbo run build)
pnpm lint                          # lint both apps (turbo run lint)
pnpm format                        # prettier --write across the repo
pnpm format:check                  # prettier --check across the repo
```

Per-app (useful for targeting a single app or running a script not wired into `turbo.json`):

```bash
pnpm --filter frontend <script>    # e.g. pnpm --filter frontend dev
pnpm --filter backend <script>     # e.g. pnpm --filter backend build
```

Backend-specific (`apps/backend`):

```bash
pnpm dev      # tsx watch src/main.rest.ts — dev server with hot reload
pnpm build    # clean dist/ then tsc -p tsconfig.json
pnpm start    # node dist/main.rest.js — run compiled build
```

There is no test runner configured yet.

### Adding dependencies

Always install into the workspace package that needs it, never into the repo root — the root `package.json` is for monorepo-wide tooling only (currently `turbo`, `prettier`).

```bash
pnpm add <pkg> --filter frontend
pnpm add <pkg> --filter backend
pnpm add -D <pkg> -w              # only for tooling shared by the whole monorepo
```

pnpm may prompt to approve build scripts for new deps (`ERR_PNPM_IGNORED_BUILDS`) — this is recorded in `pnpm-workspace.yaml` under `allowBuilds`.

## Architecture

### Backend (`apps/backend`)

The backend must follow `docs/ARCHITECTURE_PRINCIPLES.md` — read it before adding or modifying backend code. Key points:

- **ESM + NodeNext**: `"type": "module"`, `tsconfig` uses `module: NodeNext` / `moduleResolution: node16`. All relative imports in source use a `.js` extension even though files are `.ts` (e.g. `import { Component } from '../shared/types/component.type.js'`).
- **Dev runner is `tsx watch`, not `ts-node`** — this is an intentional deviation from the architecture doc (which specifies `nodemon` + `ts-node`). `ts-node --esm` fails to resolve `.js`-suffixed imports back to `.ts` source under `NodeNext`; `tsx` handles it correctly. Keep using `tsx` for the backend dev script.
- **Dependency injection is central** (`inversify` + `reflect-metadata`). Every module exports a `create<Module>Container()` factory; `main.rest.ts` merges all module containers via `Container.merge(...)` and resolves `RestApplication` from the merged container. All DI tokens live in one place: `shared/types/component.type.ts` (`Component.X` symbols).
- **Layering is strict**: `Controller → Service (interface) → Entity/Model (Typegoose) → MongoDB`. Controllers only parse HTTP/dispatch to services/build responses; all business logic and data access live in services; entities describe schema only.
- **Three distinct data shapes** per business module — DTO (input, `class-validator`), RDO (output, `class-transformer` + `fillDTO`), Entity (storage, Typegoose) — never conflated.
- **Business modules** (none exist yet) go under `apps/backend/src/shared/modules/<name>/` following the fixed per-module file template described in the architecture doc §4 and the "new module checklist" in §13 (component tokens → entity → service interface → default service → DTOs → RDOs → controller → module container → wire into `main.rest.ts` and `rest.application.ts`).
- **Config**: only through `convict`-based `RestSchema`/`RestConfig` (`shared/libs/config/`), injected as `Component.Config`. No direct `process.env` access anywhere else. Env vars are documented in `apps/backend/.env.example`.
- **Logging**: only through the injected `Logger` interface (`shared/libs/logger/`, implemented by `PinoLogger`). No `console.*` in business code.
- Naming conventions (file suffixes, `Default` prefix for service implementations, singular module directory names) are defined in §12 of the architecture doc — follow them for any new file.

Current backend skeleton (`apps/backend/src/`):
- `main.rest.ts` — thin entrypoint, builds the DI container and calls `application.init()`.
- `rest/` — `rest.application.ts` (Express bootstrap: middlewares, routes, `listen`), `rest.container.ts` (root DI container factory), `rest.constant.ts`.
- `shared/libs/config/`, `shared/libs/logger/` — the only infrastructure implemented so far.
- `shared/modules/`, `shared/helpers/` — intentionally empty, ready for the first business module.

### Frontend (`apps/frontend`)

Standard Next.js App Router app (`src/app/`), TypeScript, ESLint 9 flat config extending `eslint-config-next`. No architecture doc constrains this app beyond what Next.js itself expects.

### Turborepo task graph (`turbo.json`)

- `dev` — uncached, persistent (long-running dev servers).
- `build` — depends on `^build` (upstream workspace builds first); outputs `dist/**` and `.next/**` (excluding `.next/cache/**`) are cached.
- `lint` — depends on `^lint`.

### Shared repo-wide config

- Prettier (`.prettierrc.json`) and ESLint are configured per-app but should stay stylistically consistent (both apps wire in `eslint-config-prettier` to avoid conflicts between ESLint and Prettier).
- `docs/ARCHITECTURE_PRINCIPLES.md` is a reference document, not a source file — it's excluded from `pnpm format` via `.prettierignore` and should not be reformatted/edited casually.

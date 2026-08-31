# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Turborepo monorepo (pnpm workspaces) with two apps:

- `apps/frontend` — Next.js (App Router, TypeScript, ESLint flat config, `@heroui/react` for UI components). See `apps/frontend/CLAUDE.md` for details.
- `apps/backend` — Node.js REST API in TypeScript, built from scratch following `docs/ARCHITECTURE_PRINCIPLES.md` (the authoritative spec for how backend code must be structured). See `apps/backend/CLAUDE.md` for details.

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

See `apps/backend/CLAUDE.md` and `apps/frontend/CLAUDE.md` for each app's own scripts (e.g. backend's `tsx watch` dev runner).

### Adding dependencies

Always install into the workspace package that needs it, never into the repo root — the root `package.json` is for monorepo-wide tooling only (currently `turbo`, `prettier`).

```bash
pnpm add <pkg> --filter frontend
pnpm add <pkg> --filter backend
pnpm add -D <pkg> -w              # only for tooling shared by the whole monorepo
```

pnpm may prompt to approve build scripts for new deps (`ERR_PNPM_IGNORED_BUILDS`) — this is recorded in `pnpm-workspace.yaml` under `allowBuilds`.

## Architecture

### Turborepo task graph (`turbo.json`)

- `dev` — uncached, persistent (long-running dev servers).
- `build` — depends on `^build` (upstream workspace builds first); outputs `dist/**` and `.next/**` (excluding `.next/cache/**`) are cached.
- `lint` — depends on `^lint`.

### Shared repo-wide config

- Prettier (`.prettierrc.json`) and ESLint are configured per-app but should stay stylistically consistent (both apps wire in `eslint-config-prettier` to avoid conflicts between ESLint and Prettier).
- `docs/ARCHITECTURE_PRINCIPLES.md` is a reference document, not a source file — it's excluded from `pnpm format` via `.prettierignore` and should not be reformatted/edited casually.

### Keeping documentation in sync with architecture

Whenever a change alters the project's architecture — new/removed apps or packages, changes to the Turborepo task graph, new cross-app conventions, or a deviation from `docs/ARCHITECTURE_PRINCIPLES.md` — update the relevant documentation in the same change:

- This root `CLAUDE.md` for repo-wide structure and commands.
- `apps/frontend/CLAUDE.md` / `apps/backend/CLAUDE.md` for app-specific architecture.
- `docs/ARCHITECTURE_PRINCIPLES.md` when the backend's structural rules themselves change (not routine edits — see note above).

Do not leave documentation describing a structure that no longer matches the code.

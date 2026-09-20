# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Turborepo monorepo (pnpm workspaces) with two apps:

- `apps/frontend` — Next.js (App Router, TypeScript, ESLint flat config, `@heroui/react` for UI components). See `apps/frontend/CLAUDE.md` for details.
- `apps/backend` — Node.js REST API in TypeScript, built from scratch following `docs/ARCHITECTURE_PRINCIPLES.md` (the authoritative spec for how backend code must be structured). See `apps/backend/CLAUDE.md` for details.

Package manager is **pnpm** (`packageManager` pinned in root `package.json`). Never use `npm`/`yarn` in this repo.

## Git workflow

Never run `git commit` (or `git push`) until the user has reviewed the changes and explicitly asked for the commit. Prepare/stage changes and describe what would be committed, then wait for the user's go-ahead — do not commit proactively as part of finishing a task, even if the user asked for the underlying work to be done.

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

Testing is per-app (no root-level aggregate script yet, but wired into `turbo.json`'s `test`/`test:e2e` tasks):

```bash
pnpm --filter backend test         # vitest run — backend unit/e2e tests
pnpm --filter backend test:e2e     # vitest run tests/e2e — backend e2e only
pnpm --filter frontend test:e2e    # playwright test — frontend e2e
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

## Frontend dev server

The frontend dev server is always already running — never start it yourself (no `pnpm dev`, `pnpm --filter frontend dev`, etc.) when working on `apps/frontend`. Just use it as-is (e.g. for Playwright MCP checks).

## UI changes — mandatory verification

After changing any existing interface (component, page, form, layout) or creating a new one in `apps/frontend`, the task is **not considered done** until all of the following happen, in the same change:

1. Run the Playwright MCP tools (`mcp__playwright__*`) against the running dev server to actually exercise the changed/new UI (navigate, interact, screenshot/snapshot as relevant).
2. Invoke the `ui-ux-pro-max` skill to review the interface.
3. Fix every remark/issue raised by the Playwright check and by the skill.

Only after Playwright MCP has been run, the skill has been run, and all resulting remarks have been fixed should the UI work be reported as complete.

## Architecture

### Turborepo task graph (`turbo.json`)

- `dev` — uncached, persistent (long-running dev servers).
- `build` — depends on `^build` (upstream workspace builds first); outputs `dist/**` and `.next/**` (excluding `.next/cache/**`) are cached.
- `lint` — depends on `^lint`.
- `test` / `test:e2e` — uncached (`cache: false`); run each app's own `test`/`test:e2e` script (backend: Vitest; frontend: Playwright).

### Shared repo-wide config

- Prettier (`.prettierrc.json`) and ESLint are configured per-app but should stay stylistically consistent (both apps wire in `eslint-config-prettier` to avoid conflicts between ESLint and Prettier).
- `docs/ARCHITECTURE_PRINCIPLES.md` is a reference document, not a source file — it's excluded from `pnpm format` via `.prettierignore` and should not be reformatted/edited casually.

### Keeping documentation in sync with architecture

Whenever a change alters the project's architecture — new/removed apps or packages, changes to the Turborepo task graph, new cross-app conventions, or a deviation from `docs/ARCHITECTURE_PRINCIPLES.md` — update the relevant documentation in the same change:

- This root `CLAUDE.md` for repo-wide structure and commands.
- `apps/frontend/CLAUDE.md` / `apps/backend/CLAUDE.md` for app-specific architecture.
- `docs/ARCHITECTURE_PRINCIPLES.md` when the backend's structural rules themselves change (not routine edits — see note above).

Do not leave documentation describing a structure that no longer matches the code.

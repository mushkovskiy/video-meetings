# CLAUDE.md (frontend)

Guidance for Claude Code when working inside `apps/frontend`. See the repo-root `CLAUDE.md` for monorepo-wide conventions (package manager, dependency install rules, turborepo task graph).

## Architecture

Standard Next.js App Router app (`src/app/`), TypeScript, ESLint 9 flat config extending `eslint-config-next`. No architecture doc constrains this app beyond what Next.js itself expects.

UI components use `@heroui/react` — check the `heroui-react` skill for component usage patterns before building UI from scratch.

There is no test runner configured yet.

# CLAUDE.md (frontend)

Guidance for Claude Code when working inside `apps/frontend`. See the repo-root `CLAUDE.md` for monorepo-wide conventions (package manager, dependency install rules, turborepo task graph).

## Architecture

Standard Next.js App Router app (`src/app/`), TypeScript, ESLint 9 flat config extending `eslint-config-next`. No architecture doc constrains this app beyond what Next.js itself expects.

UI components use `@heroui/react` — check the `heroui-react` skill for component usage patterns before building UI from scratch.

## Testing

- E2E test runner is **Playwright** (`playwright.config.ts`, `test:e2e` script). Specs live under `apps/frontend/e2e/`.
- `playwright.config.ts` boots the app itself via `webServer` (`pnpm dev` on `http://localhost:3000`) — no need to start the dev server manually before running `pnpm test:e2e`.
- `e2e/register.spec.ts` and `e2e/login.spec.ts` were written TDD-first (RED) against pages/routes (`/register`, `/login`, `/dashboard`) and `data-testid` selectors (e.g. `register-email-input`, `register-submit-button`, `login-error`, `dashboard-welcome`) that don't exist yet — they define the contract for those pages and will fail until they're built.
- Chromium browser binaries for Playwright must be installed once via `pnpm exec playwright install chromium` (large download, not part of `pnpm install`).

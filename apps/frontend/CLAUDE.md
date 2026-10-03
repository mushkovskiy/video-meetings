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

## Meeting page and recording upload

- Route `src/app/meetings/[meetingId]/page.tsx` (client component, `useParams` + `useRequireSession`) shows the meeting and a "Запись" card. Dashboard items (`meeting-list-item.tsx`) link to it.
- Logic lives in hooks, formatting/validation in `src/lib/recording.ts`: `useMeeting`, `useRecording` (`undefined` = loading, `null` = no recording; `getRecording` maps `404` to `null`), `useRecordingUpload` (validates, uploads with progress, exposes `error`).
- **Upload uses `XMLHttpRequest`, not `fetch`** (`uploadRecording` in `lib/api.ts`): `fetch` can't report upload progress. Don't set `Content-Type` manually — the browser adds the multipart boundary. `request()` hard-codes `application/json`, so it can't be used for `FormData`.
- `lib/recording.ts` duplicates the backend limits (formats `mp3/wav/m4a/mp4/webm`, 100 MiB — MiB on both sides). Keep it in sync with `apps/backend/src/shared/modules/recording/recording.controller.ts` and `UPLOAD_MAX_RECORDING_SIZE`. A rejected file is never sent; the reason is shown in the card.
- "Загружается" exists only on the client; the server statuses are `processing` / `done` / `failed` (labels in `RECORDING_STATUS_LABELS`). Until replacement lands (phase 6) the picker is hidden once a recording exists, except for a `failed` recording, which shows the failure and a «Загрузить заново» picker (the backend accepts a re-upload only in that state).
- **Status polling** (`useRecording`): while `status === 'processing'` it polls `GET .../recording` every 3 s via a `setTimeout` chain (no overlapping requests), pauses while the tab is hidden (immediate poll on return), backs off (×2, up to ×8) on network errors without touching the status on screen, and stops on `done`/`failed`/unmount. No SSE/WebSocket on purpose. `setRecording` accepts `null`. A `done` recording shows its transcript as plain text (`whitespace-pre-wrap`, scrollable, focusable) — never `dangerouslySetInnerHTML`.
- `next.config.ts` sets `experimental.proxyTimeout` (10 min; default 30 s would cut off slow uploads through the `/api` rewrite). **If a `proxy.ts` (formerly `middleware.ts`) is ever added, `experimental.proxyClientMaxBodySize` (default 10 MB) starts applying and silently truncates uploads — raise it above 100 MB first.**
- `e2e/support.ts` holds the shared seeding helpers (`registerUser`, `signIn`, `seedMeeting`, `audioFile`). `e2e/recording-processing.spec.ts` mocks `GET .../recording` with `page.route` and uses `page.clock` (`install` + `runFor(3000)`) instead of waiting for real poll intervals. In `meeting-recording.spec.ts` the dev backend would really try to transcribe the dummy bytes and fail within a second, so the reload test pins the reported status with `keepProcessing`.
- `e2e/meeting-recording.spec.ts` seeds a user and a meeting through the `/api` proxy and signs in by writing the session to `localStorage` in an init script, so it needs the backend (and MongoDB) running like `login`/`register` specs do. One happy path hits the real API; error cases (`413`) mock the response with `page.route`. A file over 100 MiB isn't uploaded in e2e (Playwright caps in-memory buffers at 50 MB) — the client size rule is covered by the same validation path as the format rule.

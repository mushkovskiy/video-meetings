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
  - `tests/setup/mongo-memory-server.ts` — starts/stops a `mongodb-memory-server` instance per test file and points `DB_MONGO_*` env vars at it. The default instance runs with no auth, so `DB_MONGO_USER`/`DB_MONGO_PASSWORD` are set to `''` — this is intentional, not a stub. `getMongoURI(...)` (`shared/helpers/database.helper.ts`) only inserts a `user:password@` segment when both are non-empty, so it builds a valid URI for this test setup.
  - `tests/setup/test-env.ts` — a Vitest `setupFile` that fills in the convict-required env vars (`SALT`, `JWT_SECRET`, `DB_USER`, `DB_PASSWORD`, `UPLOAD_DIRECTORY`) with test defaults so `RestConfig`'s `restSchema.validate({ allowed: 'strict' })` doesn't throw when no `.env` file is present. `DB_USER`/`DB_PASSWORD` are unused legacy keys now that `rest.schema.ts` uses `DB_MONGO_*`/`DB_POSTGRES_*` names matching `.env.example` — harmless since convict only reads env vars it declares.
  - `tests/tsconfig.json` — a separate tsconfig (extends `../tsconfig.json`, `noEmit: true`) so the editor/tsc resolve `@types/node` (`process`, etc.) for files under `tests/`. It's deliberately not merged into the main `tsconfig.json`, whose `rootDir: "./src"` would break `pnpm build` if `tests/` were included there.
- `RestApplication.getServer()` registers middlewares/routes/exception filters and returns the `Express` app without calling `.listen()` — this is the seam tests use; `init()` calls it internally before listening.
- `RestConfig` calls `restSchema.load({})` before `restSchema.validate(...)` — `convict(...)` captures `process.env` at schema-build time (module import), which can happen before `mongodb-memory-server` overrides `DB_MONGO_*` in a test file's `beforeAll`; `.load({})` forces convict to re-read the current `process.env`. Keep this if `rest.schema.ts`/`rest.config.ts` are ever refactored, or DB e2e tests will intermittently try to authenticate against the real `.env` credentials instead of the in-memory instance.
- `mongodb-memory-server` downloads a real `mongod` binary (~780MB) into `~/.cache/mongodb-binaries` on first use — this is a one-time, potentially slow step depending on network conditions, not a broken test. `vitest.config.ts` sets `testTimeout`/`hookTimeout` to 30s to accommodate that; increase further if the binary isn't cached yet.
- The e2e auth tests (`tests/e2e/auth-register.e2e.test.ts`, `tests/e2e/auth-login.e2e.test.ts`) exercise the `user` module (`POST /users/register`, `POST /users/login`) and are green.
- The e2e meeting tests (`tests/e2e/meetings-create.e2e.test.ts`, `tests/e2e/meetings-list.e2e.test.ts`, `tests/e2e/meetings-get-by-id.e2e.test.ts`) exercise the `meeting` module (`POST /meetings`, `GET /meetings`, `GET /meetings/:id`, all behind auth) and are green. Contract: create requires `title`/`scheduledAt`, `description` optional; list/get-by-id are scoped to the authenticated owner, 403 on another user's meeting, 404 on a missing one, 400 on a malformed id. `tests/helpers/register-and-login.ts` registers a throwaway user via the existing `user` module and returns their JWT for these tests.
- `apps/backend/http/*.http` — manual request collections for the VS Code "REST Client" extension (`humao.rest-client`), one file per flow (`health.http`, `auth-register.http`, `auth-login.http`), each defining its own `@baseUrl`. Keep these in sync whenever a route's contract changes.

## Architecture

Key points from `docs/ARCHITECTURE_PRINCIPLES.md`:

- **ESM + NodeNext**: `"type": "module"`, `tsconfig` uses `module: NodeNext` / `moduleResolution: node16`. All relative imports in source use a `.js` extension even though files are `.ts` (e.g. `import { Component } from '../shared/types/component.type.js'`).
- **Dev runner is `tsx watch`, not `ts-node`** — this is an intentional deviation from the architecture doc (which specifies `nodemon` + `ts-node`). `ts-node --esm` fails to resolve `.js`-suffixed imports back to `.ts` source under `NodeNext`; `tsx` handles it correctly. Keep using `tsx` for the backend dev script.
- **Dependency injection is central** (`inversify` + `reflect-metadata`). Every module exports a `create<Module>Container()` factory. Deviation from the architecture doc's example: `rest.container.ts`'s `createRestApplicationContainer()` merges the base container with `createUserContainer()` internally via `Container.merge(...)` (rather than `main.rest.ts` merging module containers itself), so both `main.rest.ts` and `tests/helpers/create-test-app.ts` can resolve a fully-wired `RestApplication` from that single factory. All DI tokens live in one place: `shared/types/component.type.ts` (`Component.X` symbols).
- **Layering is strict**: `Controller → Service (interface) → Entity/Model (Typegoose) → MongoDB`. Controllers only parse HTTP/dispatch to services/build responses; all business logic and data access live in services; entities describe schema only.
- **Three distinct data shapes** per business module — DTO (input, `class-validator`), RDO (output, `class-transformer` + `fillDTO`), Entity (storage, Typegoose) — never conflated.
- **Business modules** go under `apps/backend/src/shared/modules/<name>/` following the fixed per-module file template described in the architecture doc §4 and the "new module checklist" in §13 (component tokens → entity → service interface → default service → DTOs → RDOs → controller → module container → wire into `rest.container.ts` and `rest.application.ts`). Two modules are implemented:
  - `user` (`shared/modules/user/`): `POST /users/register` and `POST /users/login`, backed by `UserEntity` (Typegoose, `passwordHash` via `node:crypto` HMAC-SHA256 salted with `Config.get('SALT')`) and JWT issuance via `jose`'s `SignJWT` signed with `Config.get('JWT_SECRET')`.
  - `meeting` (`shared/modules/meeting/`): `POST /meetings`, `GET /meetings`, `GET /meetings/:id`, all guarded by `PrivateRouteMiddleware` and scoped to the authenticated owner (`MeetingEntity.ownerId` vs `req.tokenPayload.id`).
- **Auth middleware** (`shared/libs/middleware/`): `ParseTokenMiddleware` is registered globally in `RestApplication.registerMiddlewares()` (constructed inline with `Config.get('JWT_SECRET')`, mirroring how `ValidateDtoMiddleware` is constructed per-route rather than injected) — it verifies a `Bearer` JWT via `jose`'s `jwtVerify` and sets `req.tokenPayload` (typed by `shared/types/token-payload.type.ts`, declared on `Express.Request` in `shared/types/express.d.ts`), silently leaving it unset on a missing/invalid token rather than rejecting the request itself. `PrivateRouteMiddleware` (401 if `req.tokenPayload` is unset) and `ValidateObjectIdMiddleware(param)` (400 if `req.params[param]` isn't a valid Mongo ObjectId, via `mongoose`'s `Types.ObjectId.isValid`) are instantiated per-route in controllers, same pattern as `ValidateDtoMiddleware`.
- **Config**: only through `convict`-based `RestSchema`/`RestConfig` (`shared/libs/config/`), injected as `Component.Config`. No direct `process.env` access anywhere else. Env vars are documented in `apps/backend/.env.example`. Schema keys are `DB_MONGO_HOST`/`DB_MONGO_PORT`/`DB_MONGO_NAME`/`DB_MONGO_USER`/`DB_MONGO_PASSWORD` (not the legacy `DB_HOST`/`DB_USER`/etc.), matching `.env.example`.
- **Logging**: only through the injected `Logger` interface (`shared/libs/logger/`, implemented by `PinoLogger`). No `console.*` in business code.
- **Database**: `DatabaseClient` (`shared/libs/database/database-client.interface.ts`), implemented by `MongoDatabaseClient` (wraps `mongoose.connect`/`disconnect`). `shared/helpers/database.helper.ts`'s `getMongoURI(host, port, name, user, password)` builds the connection string and only inserts a `user:password@` segment when both are non-empty (required for the auth-less `mongodb-memory-server` test setup). `RestApplication` connects lazily and idempotently (fire-and-forget in `getServer()`, awaited in `init()`) so `supertest`-driven tests don't need to await a real `.listen()`.
- **REST scaffolding** (`shared/libs/rest/`): `BaseController` (abstract; `addRoute`, `ok`/`created`/`noContent`/`send`, wraps handlers/middlewares in `express-async-handler`), `HttpError` (carries `httpStatusCode`/`message`/`detail`), `AppExceptionFilter` (single exception filter registered last in the middleware chain; maps `HttpError` to its status code, anything else to `500`). `shared/libs/middleware/ValidateDtoMiddleware` runs `class-validator` against a DTO class and forwards a `400 HttpError` with the combined constraint messages on failure.
- Naming conventions (file suffixes, `Default` prefix for service implementations, singular module directory names) are defined in §12 of the architecture doc — follow them for any new file.

## Current backend skeleton (`apps/backend/src/`)

- `main.rest.ts` — thin entrypoint, builds the DI container and calls `application.init()`.
- `rest/` — `rest.application.ts` (Express bootstrap: middlewares, `/users` routes, exception filters, `listen`), `rest.container.ts` (root DI container factory, merges in `createUserContainer()`), `rest.constant.ts`.
- `shared/libs/config/`, `shared/libs/logger/`, `shared/libs/database/`, `shared/libs/rest/`, `shared/libs/middleware/` — infrastructure.
- `shared/modules/user/` — the `user` business module (see above).
- `shared/helpers/` — `common.helper.ts` (`fillDTO`), `database.helper.ts` (`getMongoURI`).

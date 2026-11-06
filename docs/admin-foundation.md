# Admin foundation runbook

All commands run from `lenis/`, the Git and npm workspace root. The original storefront remains in `src/` and the admin is separate in `admin/`. Development requires Node 22.13+; the Docker image uses Node 24. Stop host development servers before starting Compose services using the same ports (3001 and 5174).

```sh
npm install
npm run env:init
npm run db:generate
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml exec -it api npm run seed:owner
```

Open http://localhost:5174/admin/. The seed prompts for the real owner's name and email, then asks for a hidden password. Press Enter at the password prompt to generate a cryptographically random password printed once. The owner must change it on first login. No account is created by migration or `env:init`. The seed refuses a second initial owner; additional staff are created through the owner's Team screen.

On Windows with PostgreSQL installed, `npm run dev:local` starts a persistent local development database and both applications without Docker. See [the Windows local runbook](ADMIN-LOCAL-WINDOWS.md). It prefers drive E for database storage, binds to loopback, and preserves data on shutdown. Run `npm run seed:owner` in a second terminal to create the real owner.

For host development using a Docker database, start only PostgreSQL, then migrate and start two terminals:

```sh
docker compose -f docker-compose.dev.yml up -d postgres
npm run db:migrate
npm run seed:owner
npm run dev:server
# Separate terminal:
npm run dev:admin
# Storefront, when needed:
npm run dev
```

The health endpoint is `/api/health`. Zod-generated OpenAPI is at http://localhost:3001/api/docs only when `NODE_ENV=development`. Admin API responses are `no-store` and `noindex`. The SPA includes a `noindex,nofollow` meta tag.

`npm run env:init` creates `.env` exclusively and preserves an existing file. Passwords, database credentials and the TOTP encryption key must never be committed. Keep the encryption key backed up securely: rotating it without decrypting and migrating existing TOTP secrets makes them unusable. `SESSION_SECRET` signs CSRF cookies and hashes staff IPs. Changing it invalidates CSRF signatures. Owner 2FA remains optional in A; `REQUIRE_OWNER_2FA=true` can gate owner access, with mandatory rollout scheduled for F.

Cookies use HttpOnly, SameSite=Lax, an absolute 12-hour lifetime and a 30-minute idle expiry. Secure is enabled by `COOKIE_SECURE=true` and required in production. Local HTTP development explicitly uses `COOKIE_SECURE=false`. Production config rejects HTTP origins. `TRUST_PROXY` defaults to false; enable it only behind an isolated trusted reverse proxy. No production deployment or HTTPS setup is provided in A.

Every admin state-changing request, including login, requires an allowed Origin and a signed CSRF cookie matching `X-CSRF-Token`. Get `/api/admin/auth/csrf` before login. Login and password change rotate the session. The database stores SHA-256 session token hashes, never the cookie's bearer token. Account changes revoke sessions. A last-active-owner guard prevents deactivation or demotion of the final active owner. Staff deletion means deactivation, preserving history.

TOTP secrets are encrypted using AES-256-GCM; enrollment expires after 10 minutes. A consumed TOTP counter cannot be reused. After enabling TOTP, sign in with a fresh code, not the code just used for enrollment. An owner can reset a staff member's TOTP and all their sessions. Passwords use argon2id, 64 MiB memory, three iterations and parallelism one. Local common-pattern checking does not provide a complete breached-password corpus; a self-hosted corpus check remains an item for Phase F.

Audit writes occur in the same transaction as admin business mutations. Passwords and secret material are removed from audit payloads; IP fields hold keyed hashes only. The migration installs a trigger rejecting UPDATE and DELETE of audit records. Automatic session expiry/idle bookkeeping is internal housekeeping rather than a business mutation. No content, customers, revenue or analytics are seeded.

```sh
npm run build
npm run build:all
npm run typecheck
npm run lint
npm test
npm run test:ui
npm audit
```

API integration tests require actual PostgreSQL and create an isolated random schema that is dropped afterward. They never erase an existing database. To run with Docker 16:

```sh
# Set TEST_POSTGRES_PASSWORD to a freshly generated random value in the shell.
docker compose -f docker-compose.test.yml up -d --wait
# Set TEST_DATABASE_URL to postgresql://aljeel_test:<that-password>@localhost:5433/aljeel_test
npm run test:integration
docker compose -f docker-compose.test.yml down
```

On Windows, `powershell -File scripts/admin/test-postgres.ps1` creates a temporary cluster, runs integration tests and deletes only that generated cluster. It prefers local PostgreSQL 16, otherwise uses installed 18; set `TEST_PG_BIN` to select another binary directory. The report names the version actually tested. This is a test fallback, not a production database change.

The Phase A browser suite mocks API responses to verify shell layout, translations, navigation restrictions, modal keyboard handling and no horizontal overflow at 360px and 1280px. It is not a live end-to-end auth test. Live full E2E is scheduled for F. Screenshots are in the ignored `test-results/` directory.

Install Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome. Read the dependency audit in the phase report. Prisma CLI advisory chains involving deepmerge-ts and mysql2 are development tooling; application database access remains PostgreSQL only. Recheck these advisories when upgrading Prisma.

Later phases provide business CRUD, file processing, analytics, backups, HTTPS, an Arabic owner guide and E2E. Root/storefront build warnings and dependency advisories are documented honestly in the phase report.

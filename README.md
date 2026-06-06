# Monolith Engine

Monolith Engine is a Next.js 16 operations platform that combines HRMS, attendance, notifications, and appraisal management workflows in a single application. It uses the App Router, Prisma with PostgreSQL, and credential-based authentication through NextAuth.

## Architecture Overview

### Application shape

- `src/app`
  - Next.js App Router entrypoints.
  - Route groups:
    - `(auth)` for login and setup pages.
    - `(dashboard)` for authenticated application screens.
    - `api` for route handlers.
- `src/components`
  - Shared UI and feature-facing React components.
- `src/lib`
  - Cross-cutting infrastructure such as auth, Prisma, RBAC, email, navigation, and clock helpers.
- `src/modules`
  - Feature modules:
    - `core` for users, roles, and organisation structure.
    - `attendance` for punches, leave, OT, holidays, and reports.
    - `ams` for appraisal cycles, criteria, workflow, scoring, and jobs.
    - `notifications` for in-app notifications and email queue handling.
    - `hrms` for salary structure calculations.
- `prisma`
  - Prisma schema, migrations, and seed script.

### Runtime architecture

- Frontend: Next.js 16 App Router with React 19.
- Auth: NextAuth credentials provider backed by the `User` table.
- Database: PostgreSQL accessed through Prisma and `@prisma/adapter-pg`.
- Background-style jobs:
  - `/api/cron/appraisal-trigger`
  - `/api/cron/email-flush`
- Middleware-like request gate:
  - `src/proxy.ts` redirects unauthenticated users away from protected routes.

### Data model overview

The Prisma schema includes:

- Organisation structure: `Organisation`, `Branch`, `Department`, `Division`
- RBAC: `Role`, `Permission`, `RolePermission`, `UserRole`
- Users and employment: `User`, `EmploymentRecord`, `Document`
- Notifications: `Notification`, `NotificationActivity`, `EmailQueue`
- Attendance: `AttendancePunch`, `LeaveType`, `LeaveBalance`, `LeaveRequest`, `Holiday`, `OTEntry`
- Appraisal management: `AppraisalCycle`, `AppraisalCriterion`, `Appraisal`, `AppraisalReviewer`, `SelfAssessment`, `ReviewerRating`, `ManagementReview`, `AppraisalMeeting`, `MeetingMinute`, `HikeDecision`, `AppraisalAuditLog`, `OrgAppraisalSettings`
- System utilities: `SystemClock`

## Requirements

- Node.js 20+
- npm
- PostgreSQL 16+ or any compatible Postgres instance

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Copy `.env.example` to `.env` and replace the sample values with your own.

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

### 3. Start PostgreSQL

You can use your own Postgres instance or start one with Docker Compose:

```bash
docker compose up -d postgres
```

Default Compose database settings:

- Database: `monolith_engine`
- User: `monolith`
- Password: `monolith_secret`
- Port: `5432`

### 4. Run Prisma migrations

```bash
npm run db:migrate
```

### 5. Start the application

```bash
npm run dev
```

Open `http://localhost:3000`.

### 6. Complete first-time setup

The application expects the first organisation and platform admin to be created through the setup flow:

1. Visit `http://localhost:3000/setup`
2. Create the first organisation and platform admin user

This step creates:

- The first `Organisation`
- A platform admin `User`
- Initial system role records: `Admin`, `HR`, `Manager`, `TL`, `Director`, `Employee`

### 7. Seed permissions and appraisal defaults

After the organisation exists, run:

```bash
npm run db:seed
```

This seed script:

- Upserts the permission catalog
- Syncs system role permissions for the first organisation
- Seeds default appraisal settings
- Seeds the self-assessment template
- Seeds default appraisal criteria for `SELF`, `REVIEWER`, and `MANAGEMENT`

## Environment Variables

The application reads the following environment variables.

### Database

- `DATABASE_URL`
  - PostgreSQL connection string used by Prisma and runtime database access.

### Authentication

- `NEXTAUTH_SECRET`
  - Secret used by NextAuth JWT/session handling.
- `NEXTAUTH_URL`
  - Base application URL, for example `http://localhost:3000`.

### Email

- `EMAIL_PROVIDER`
  - Supported values: `resend`, `smtp`
- `EMAIL_FROM`
  - Sender email address
- `RESEND_API_KEY`
  - Required when `EMAIL_PROVIDER=resend`
- `SMTP_HOST`
  - Required when `EMAIL_PROVIDER=smtp`
- `SMTP_PORT`
  - SMTP port, usually `587`
- `SMTP_SECURE`
  - `true` or `false`
- `SMTP_USER`
  - SMTP username
- `SMTP_PASS`
  - SMTP password

### Cron security

- `CRON_SECRET`
  - Required by:
    - `/api/cron/appraisal-trigger`
    - `/api/cron/email-flush`
  - The caller must send this value in the `x-cron-secret` header.

### Docker-specific build behavior

- `DOCKER_BUILD`
  - When set to `true`, Next.js builds with `output: "standalone"`.
  - This matters because the Dockerfile copies `.next/standalone`.

## Prisma Commands

### Generate Prisma client

```bash
npm run db:generate
```

### Create and apply a development migration

```bash
npm run db:migrate
```

This runs `prisma migrate dev`.

### Push schema changes without creating a migration

```bash
npm run db:push
```

### Open Prisma Studio

```bash
npm run db:studio
```

## Seed Commands

### Main seed

```bash
npm run db:seed
```

### Utility scripts

The repository also contains utility scripts under `scripts/`:

- `scripts/seed-users.ts`
- `scripts/check-users.ts`
- `scripts/test-bcrypt.ts`

Run them with `tsx` if needed, for example:

```bash
npx tsx scripts/seed-users.ts
```

Use these carefully; they are helper scripts, not part of the main bootstrap flow.

## Development Commands

### Start the dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Start the production server locally

```bash
npm run start
```

### Run ESLint

```bash
npm run lint
```

### Run tests

```bash
npm run test
```

Note: the `test` script is configured, but the repository may not currently contain test files.

## Docker Build Instructions

The Dockerfile is a multi-stage Node 20 Alpine build that:

1. Installs dependencies with `npm ci`
2. Runs `npx prisma generate`
3. Runs `npm run build`
4. Copies the standalone Next.js output into a minimal runtime image

### Build the image

Because `next.config.ts` only enables standalone output when `DOCKER_BUILD=true`, build with that environment variable set:

PowerShell:

```powershell
$env:DOCKER_BUILD="true"
docker build -t monolith-engine .
Remove-Item Env:DOCKER_BUILD
```

macOS/Linux:

```bash
DOCKER_BUILD=true docker build -t monolith-engine .
```

### Run the image

```bash
docker run --rm -p 3000:3000 ^
  -e DATABASE_URL="postgresql://..." ^
  -e NEXTAUTH_SECRET="..." ^
  -e NEXTAUTH_URL="http://localhost:3000" ^
  -e EMAIL_PROVIDER="smtp" ^
  -e EMAIL_FROM="noreply@example.com" ^
  -e SMTP_HOST="..." ^
  -e SMTP_PORT="587" ^
  -e SMTP_SECURE="false" ^
  -e SMTP_USER="..." ^
  -e SMTP_PASS="..." ^
  -e CRON_SECRET="..." ^
  monolith-engine
```

### Docker Compose

The repository includes `docker-compose.yml` with:

- `postgres` service
- `app` service

Start both services:

```bash
docker compose up --build
```

If the app image build fails because `.next/standalone` is missing, see the troubleshooting section below.

## Deployment Instructions

### Recommended deployment model

This project is best suited for deployment as a containerized Next.js server with a managed PostgreSQL database.

### Before deploying

1. Provision a PostgreSQL database
2. Set all required environment variables
3. Apply Prisma migrations against the target database
4. Ensure `NEXTAUTH_URL` matches the public application URL
5. Ensure cron callers can send `x-cron-secret`

### Deployment checklist

1. Install dependencies

```bash
npm ci
```

2. Generate Prisma client

```bash
npm run db:generate
```

3. Apply migrations

For local and development environments, the repository provides:

```bash
npm run db:migrate
```

Note: `npm run db:migrate` is currently `prisma migrate dev`. This is appropriate for development. The repository does not currently define a dedicated production migration script such as `prisma migrate deploy`, so add one before formal production rollout.

4. Build the application

```bash
npm run build
```

5. Start the server

```bash
npm run start
```

### First deploy bootstrap

For a fresh production environment:

1. Deploy the app with database connectivity
2. Open `/setup`
3. Create the first organisation and platform admin
4. Run:

```bash
npm run db:seed
```

This ensures the permission catalog, role-permission mappings, and AMS defaults are present.

### Cron endpoints

The application exposes two secured cron endpoints:

- `GET /api/cron/appraisal-trigger`
- `GET /api/cron/email-flush`

Both require:

- Header: `x-cron-secret: <CRON_SECRET>`

## Troubleshooting

### `prisma generate` or runtime queries fail with database connection errors

Check:

- `DATABASE_URL` is valid
- PostgreSQL is reachable from your machine or container
- SSL settings in the connection string match your provider requirements

### `db:seed` only seeds permissions and skips role/appraisal defaults

This happens when no organisation exists yet. Create the first organisation through `/setup`, then rerun:

```bash
npm run db:seed
```

### Docker build fails because `.next/standalone` is missing

`next.config.ts` only enables standalone output when `DOCKER_BUILD=true`. Rebuild with:

PowerShell:

```powershell
$env:DOCKER_BUILD="true"
docker build -t monolith-engine .
```

macOS/Linux:

```bash
DOCKER_BUILD=true docker build -t monolith-engine .
```

### Docker Compose app build fails for the same reason

The current Dockerfile expects standalone output. If Compose fails during image assembly, rebuild with `DOCKER_BUILD=true` available to the build environment, or update the Docker build configuration to pass it explicitly.

### Login redirects back to `/login`

Check:

- `NEXTAUTH_SECRET` is set
- `NEXTAUTH_URL` matches the app URL
- The browser is receiving the NextAuth session cookie
- Protected routes are not being blocked by missing cookies in `src/proxy.ts`

### Email notifications are not being sent

Check:

- `EMAIL_PROVIDER` is set correctly
- Resend credentials are present when using `resend`
- SMTP host, port, username, and password are correct when using `smtp`
- `EMAIL_FROM` is valid for your provider

### Cron endpoints return `401 Unauthorized`

Send the `x-cron-secret` header and make sure its value exactly matches `CRON_SECRET`.

### Prisma client appears out of date after schema changes

Regenerate the client:

```bash
npm run db:generate
```

If you are in development, restart the app after Prisma changes.

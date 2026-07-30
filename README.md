# Adarsh Shipping and Services Management Software

Monolith Engine is a Next.js 16 and Prisma application for internal business operations across shipping, customs, HR, accounting, CRM, communication, attendance, LMS, and task management.

## Included modules

- Dashboard and notifications
- CHA workflows and job filing
- CRM and mobile CRM support
- HRMS and attendance tracking
- Accounting and expense management
- AMS, LMS, todo, and admin utilities
- Google Workspace communication tooling

## Tech stack

- Next.js 16 App Router
- React 19
- Prisma with PostgreSQL
- NextAuth
- Tailwind CSS 4
- Vitest

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file and add the required database, auth, mail, and Google Workspace credentials.

3. Generate the Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

4. Seed local data if needed:

```bash
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

Development uses Webpack by default because the Next.js 16 Turbopack dev
server is unstable for this Windows workspace. Turbopack remains available for
explicit diagnostics with `npm run dev:turbopack`.

## Common scripts

```bash
npm run dev
npm run dev:turbopack
npm run build
npm run start
npm run lint
npm run test
npm run audit:structure
npm run audit:unused
npm run quality
npm run db:generate
npm run db:migrate
npm run db:seed
npm run catalogue:update
npm run catalogue:check
```

## Project structure

```text
src/app/    Next.js routes and route-private composition
src/components/ui/  Canonical Monolith primitives
src/components/{data-display,forms,layout,navigation,feedback,providers}/  Shared UI ownership
src/modules/ Feature-owned business logic and components
prisma/     Database schema, migrations, and seed data
public/     Static assets
mobile/     Android client source
scripts/    Import, bootstrap, and maintenance scripts
docs/       Product and feature documentation
```

## CHA Production Edition

Set `APP_EDITION=cha` to run only the CHA production surface.

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run build
npm run start
```

Optional test admin bootstrap: `npm run db:bootstrap:cha-admin`

Related docs: [CHA_PRODUCTION_SCOPE.md](CHA_PRODUCTION_SCOPE.md), [DEPLOYMENT.md](DEPLOYMENT.md), [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md), [SECURITY.md](SECURITY.md), [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md), [TESTING.md](TESTING.md)

## Notes

- This repository should contain source code, docs, and intentionally versioned assets only.
- Local recordings, generated analysis output, scratch files, and Codex artifacts are ignored.
- See `docs/refactor/code-organization.md` before adding shared components or scripts.

## Checklist Main email automation

- CHA Checklist Main customer emails now queue automatically when a checklist moves into customer approval.
- Configure Resend with `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`.
- Deliver queued mail by calling `GET /api/cron/email-flush` with the `x-cron-secret` header set to `CRON_SECRET`.
- To test without sending real emails, complete the CHA checklist approval flow locally and inspect the `EmailQueue` table without running the cron flush, or run `npm test` to exercise the queueing path with mocked delivery.

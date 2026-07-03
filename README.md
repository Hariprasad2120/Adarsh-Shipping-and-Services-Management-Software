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

## Common scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run db:generate
npm run db:migrate
npm run db:seed
npm run catalogue:update
npm run catalogue:check
```

## Project structure

```text
src/        Application routes, modules, UI, and server logic
prisma/     Database schema, migrations, and seed data
public/     Static assets
mobile/     Android client source
scripts/    Import, bootstrap, and maintenance scripts
docs/       Product and feature documentation
```

## Notes

- This repository should contain source code, docs, and intentionally versioned assets only.
- Local recordings, generated analysis output, scratch files, and Codex artifacts are ignored.

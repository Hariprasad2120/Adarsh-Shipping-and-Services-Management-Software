# Vercel Deployment

## Architecture

The repository remains a single Next.js 16 App Router monolith.

- Frontend routes render through Next.js on Vercel.
- API endpoints remain under `src/app/api/**` as Vercel-backed Node route handlers.
- Prisma continues to talk directly to PostgreSQL using the existing `@prisma/adapter-pg` setup.
- Scheduled work runs through Vercel Cron hitting `/api/cron/**`.
- Google Workspace, email, biometric SQL Server, and other integrations stay external.
- HR DOCX/PDF automation must run through an external worker exposed via `DOCUMENT_AUTOMATION_URL` when deployed serverlessly.

## Vercel project configuration

- Framework preset: `Next.js`
- Root directory: repository root
- Install command: `npm install`
- Build command: `npm run build`
- Output setting: default Next.js output
- Node version: `20.x`

`vercel.json` is intentionally Hobby-safe and does not register Vercel-managed crons.

- Use `vercel.json` as-is when deploying on a Hobby account and trigger the cron endpoints from an external scheduler.
- Use `vercel.pro.json` as the schedule reference when deploying on a Pro account that supports high-frequency Vercel Cron Jobs.

## Environment variables

Required core variables:

- `APP_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `CRON_SECRET`

Required for Google auth/integrations:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_WORKSPACE_DOMAIN`
- `GOOGLE_CHAT_LINK_SECRET`

Required when using email:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY` or SMTP equivalents

Required for SQL Server biometric sync:

- `ESSL_DATABASE_URL` or `ESSL_DB_*`

Required for serverless HR letter automation:

- `DOCUMENT_AUTOMATION_URL`
- `DOCUMENT_AUTOMATION_TOKEN`

Storage-related variables currently supported by code, but still backed by local paths unless refactored further:

- `CUSTOMER_PORTAL_UPLOAD_ROOT`
- `ACCOUNTING_BANK_STATEMENT_UPLOAD_ROOT`

## Database setup

1. Provision PostgreSQL reachable from Vercel.
2. Set `DATABASE_URL`.
3. Run migrations:

```bash
npx prisma migrate deploy
```

4. If seed data is required:

```bash
npm run db:seed
```

## Storage

Current status:

- CHA filing documents already prefer Google Drive-backed storage.
- Customer portal uploads, accounting bank statement imports, HR letter artifacts, and some CRM recording paths still assume durable local filesystem storage and must be moved to external object storage before those features are production-safe on Vercel.

## Background processing

- Use an external scheduler for `/api/cron/**` on Hobby, or Vercel Cron on Pro.
- Do not run `scripts/justdial-worker.ts` on Vercel.
- Use `/api/cron/justdial-import` instead.

## Cron jobs

Default deployment path:

- Hobby: configure an external scheduler to call the protected cron routes below with `Authorization: Bearer ${CRON_SECRET}` or `x-cron-secret: ${CRON_SECRET}`.
- Pro: copy the schedules from `vercel.pro.json` into the active `vercel.json` before deploying, or configure the equivalent schedules in the Vercel dashboard.

Required schedules:

- `/api/cron/appraisal-trigger`
- `/api/cron/email-flush`
- `/api/cron/tracking-alerts`
- `/api/cron/google-chat-retry`
- `/api/cron/leave-approval-reminders`
- `/api/cron/crm-reminders`
- `/api/cron/justdial-import`
- `/api/cron/todo-reminders`
- `/api/cron/cha-filing-query-reminders`
- `/api/cron/leave-expiry`
- `/api/cron/leave-accrual`

Schedule map:

| Path | Schedule |
| --- | --- |
| `/api/cron/appraisal-trigger` | `0 19 * * *` |
| `/api/cron/email-flush` | `*/5 * * * *` |
| `/api/cron/tracking-alerts` | `*/10 * * * *` |
| `/api/cron/google-chat-retry` | `*/10 * * * *` |
| `/api/cron/leave-approval-reminders` | `0 * * * *` |
| `/api/cron/crm-reminders` | `*/30 * * * *` |
| `/api/cron/justdial-import` | `*/30 * * * *` |
| `/api/cron/todo-reminders` | `*/15 * * * *` |
| `/api/cron/cha-filing-query-reminders` | `30 4 * * *` |
| `/api/cron/leave-expiry` | `45 18 * * *` |
| `/api/cron/leave-accrual` | `15 19 1 * *` |

All cron routes require `CRON_SECRET`.

## Webhooks

Update external dashboards to point at:

- `/api/google-chat/webhook`

If Google Chat uses the alternate route, `/api/google-chat` delegates to the same webhook handler.

## Authentication

Update allowed origins / callbacks to include:

- `https://<your-project>.vercel.app`
- your custom production domain
- `${APP_URL}/api/auth/callback/google`
- `${APP_URL}/api/communication/oauth/callback`

## Deployment

```bash
vercel
vercel --prod
```

For Hobby deployments, leave `vercel.json` unchanged.

For Pro deployments that want Vercel-managed crons, replace `vercel.json` with the contents of `vercel.pro.json` before running `vercel --prod`.

## Verification

Run the smoke test against a deployment:

```bash
DEPLOYMENT_URL=https://your-deployment.vercel.app node scripts/vercel-smoke-test.mjs
```

Optional authenticated coverage:

```bash
DEPLOYMENT_URL=https://your-deployment.vercel.app SMOKE_TEST_EMAIL=user@example.com SMOKE_TEST_PASSWORD='your-password' node scripts/vercel-smoke-test.mjs
```

## Remaining external requirements

- PostgreSQL
- Google OAuth / Workspace app configuration
- Email provider configuration
- SQL Server connectivity for biometric sync if used
- External Windows-capable document automation service for HR DOCX/PDF workflows
- Durable remote storage for file-backed subsystems that still write to disk
- External scheduler for cron routes when using the Vercel Hobby plan

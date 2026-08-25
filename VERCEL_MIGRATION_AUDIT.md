# Vercel Migration Audit

Audit date: August 20, 2026

Safest target architecture: keep the existing Next.js 16 App Router monolith and deploy it natively on Vercel. Route handlers stay in `src/app/api/**`; server rendering, auth, and Prisma remain in-process. Subsystems that depend on persistent disk or Windows automation require external infrastructure instead of local runtime state.

| Feature / subsystem | Current implementation | Vercel compatibility | Required change | Verification |
| --- | --- | --- | --- | --- |
| App shell and frontend routes | Next.js 16 App Router under `src/app/**` | Compatible | Native Vercel Next.js deployment | VERIFIED by source audit |
| API routes | Next.js route handlers under `src/app/api/**` | Compatible | Native Vercel Node runtime | VERIFIED by source audit |
| Auth core | NextAuth v5 credentials + Google OAuth in `src/lib/auth.ts` | Compatible | Set `AUTH_SECRET`/`NEXTAUTH_SECRET`, HTTPS URL, Google callback URLs | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Session enforcement | DB-backed opaque sessions in `UserSession` via `src/lib/session-service.ts` | Compatible | None beyond DB + secrets | VERIFIED by source audit |
| Customer portal auth | Separate DB-backed auth/session flow in `src/modules/customer-portal/**` | Compatible | Use production app URL and secrets | VERIFIED after app URL hardening |
| Database access | Prisma 7 + `pg` adapter in `src/lib/db.ts` | Compatible | Use pooled PostgreSQL; serverless pool size already defaults to `1` | VERIFIED by source audit |
| Database migrations | Prisma migrations in `prisma/migrations/**` | Compatible | Run `prisma migrate deploy` before or during deploy | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Health endpoint | `GET /api/health` | Compatible | None | VERIFIED by source audit |
| Cron endpoints | `src/app/api/cron/**` | Compatible | Trigger from external scheduler on Hobby or Vercel Cron on Pro; protect with `CRON_SECRET` | VERIFIED after Hobby-safe Vercel config and schedule reference added |
| Google Workspace OAuth | Gmail/Calendar/Drive/Chat integration via `src/lib/workspace-oauth.ts` and `src/lib/auth.ts` | Compatible | Configure Google OAuth credentials and callback/origin URLs | VERIFIED after app URL hardening |
| Google Chat webhook | `POST /api/google-chat/webhook` with bearer verification | Compatible | Keep Node runtime; update Chat app/webhook target URL | VERIFIED by source audit |
| Gmail APIs | Route handlers under `/api/communication/mail/**` | Compatible | Google scopes + refresh token encryption key | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Chat SSE | `GET /api/communication/chat/sse` uses `ReadableStream` + intervals | Conditionally compatible | Keep Node runtime; validate connection duration against plan/runtime limits | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Notifications/email queue | DB-backed queue + `/api/cron/email-flush` | Compatible | Cron schedule + email provider config | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Resend/SMTP mail | `src/lib/email.ts` | Compatible | Provide provider secrets | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| CHA job workspace/Drive | Google Drive-backed file flows in `src/modules/cha/service.ts` / provisioning libs | Compatible | Google Drive credentials and shared drive/folder IDs | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| CHA customer portal document uploads | Local filesystem under `storage/customer-portal-uploads` | Not compatible as-is | Move persistence to external object storage or mounted service | BLOCKED — code still assumes local persistent disk |
| Accounting bank statement imports | Local filesystem under `storage/accounting-banking-imports` | Not compatible as-is | Move persistence to external object storage or DB/blob-backed storage | BLOCKED — code still assumes local persistent disk |
| HR letter generated previews/docx/pdf | Local files under `public/import-output/letters/**` | Not compatible as-is | Use external object storage if artifacts must persist across invocations | BLOCKED — code still assumes local persistent disk |
| HR letter DOCX/PDF generation | PowerShell/Word automation in `scripts/*.ps1`, called by `src/modules/hrms/letters-service.ts` | Not compatible as-is | Use external document automation worker via `DOCUMENT_AUTOMATION_URL` | VERIFIED WITH INFRASTRUCTURE DEPENDENCY after external automation hook added |
| HR letter template DOCX import/edit save | PowerShell automation in `src/modules/hrms/letter-template-import.ts` | Not compatible as-is | Same external document automation worker | VERIFIED WITH INFRASTRUCTURE DEPENDENCY after external automation hook added |
| HR letter asset/template upload routes | `/api/hrms/letters/assets/upload`, `/api/hrms/letters/templates/upload` | Partially compatible | Runtime works, but persistence must move off local disk for production durability | BLOCKED — local persistent disk dependency remains |
| CRM call recordings playback/download | Reads `recording.filePath` from local disk in `/api/crm/recordings/[id]/**` | Not compatible as-is | Store recordings in external object storage or remote media URL only | BLOCKED — code still supports local file paths |
| Recording transcription | `src/lib/transcription.ts` reads local recording files when present | Not compatible as-is | Read from durable remote media store instead of ephemeral disk | BLOCKED — local file path dependency remains |
| Justdial scheduler | Long-running worker script `scripts/justdial-worker.ts` plus cron route `/api/cron/justdial-import` | Worker not compatible; cron route is compatible | Use cron route on Vercel, do not rely on the standalone worker process | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Biometric sync | SQL Server via `mssql` and `ESSL_*` env vars | Compatible | Reachable SQL Server from Vercel or private connectivity | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Webhooks with signature verification | Google Chat webhook present; other signed flows audit light | Compatible | Keep raw auth headers intact; no edge conversion | VERIFIED by source audit |
| Static assets | Next `public/**` | Compatible | None | VERIFIED by source audit |
| Mobile APIs | `src/app/api/mobile/**` | Compatible | Same auth/storage caveats as recording uploads and tracking | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Realtime presence/in-memory rate limits | Some in-memory Maps/intervals in security and SSE flows | Partially compatible | Accept per-instance semantics or move to shared store if strict global behavior is required | VERIFIED WITH INFRASTRUCTURE DEPENDENCY |
| Hard-coded localhost/base URLs | Several server flows referenced `NEXTAUTH_URL` or localhost fallbacks | Compatible after hardening | Centralized `getAppUrl()` usage for server-generated links | VERIFIED after code changes |
| Build/install flow | `npm install`, `npm run build`, Prisma generate | Compatible | Ensure env vars required at build/runtime are set in Vercel | VERIFIED by source audit |

## Feature verification rollup

- `VERIFIED`: native Next.js frontend/backend, Prisma connection model, auth/session model, health endpoint, cron endpoint structure, app URL hardening.
- `VERIFIED WITH INFRASTRUCTURE DEPENDENCY`: Google OAuth/Workspace, cron scheduling, email delivery, SQL Server connectivity, Drive-backed CHA workspace, Justdial scheduled import path, SSE runtime duration, external document automation.
- `BLOCKED`: subsystems that still persist durable files to local disk, plus CRM local-recording playback/transcription paths until they are moved to durable remote storage.

## API route families discovered

- Auth/session: `/api/auth/**`, `/api/customer-portal/auth/**`
- Communication: `/api/communication/**`, `/api/google-chat/**`
- Cron: `/api/cron/**`
- HRMS/attendance/leave: `/api/hrms/**`, `/api/attendance/**`, `/api/leave/**`
- CRM/accounting/CHA: `/api/crm/**`, `/api/accounting/**`, `/api/cha/**`
- Customer portal: `/api/customer-portal/**`
- Admin/org/users/roles/notifications: `/api/admin/**`, `/api/org/**`, `/api/users/**`, `/api/roles/**`, `/api/notifications/**`
- Mobile: `/api/mobile/**`

## Highest-risk Vercel gaps still requiring follow-up

1. Durable file storage abstraction for customer-portal uploads, bank statement imports, HR letter artifacts, and CRM call recordings.
2. External Windows-capable document automation service for HR DOCX/PDF generation and template import/save flows.
3. End-to-end validation of long-lived SSE chat behavior under the chosen Vercel plan/runtime limits.

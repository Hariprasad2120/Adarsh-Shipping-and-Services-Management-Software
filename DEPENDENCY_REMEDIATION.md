# DEPENDENCY_REMEDIATION

Tracks the intentional dependency-security plan for Monolith Stage 1
(finding **MON-S1-017**). "Patch now, plan majors separately" was the agreed
approach — this file holds the "separately".

Audited with `npm audit --omit=dev` (production dependency tree).

Update: `xlsx` / SheetJS has been removed and replaced with `exceljs` for
spreadsheet import/export paths. GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9
should no longer appear in the dependency audit unless `xlsx` is reintroduced.

---

## Done in Stage 1 cluster 1 (checkpoint: request-integrity)

| Package | Before | After | Advisory addressed |
|---|---|---|---|
| `next` | 16.2.6 | **16.2.12** | Middleware/Proxy bypass in App Router + Turbopack (HIGH). Stayed on the 16.2.x line — 16.3.3 regresses the Turbopack + Tailwind v4 PostCSS transform and fails `next build`. |
| `next-auth` | ^5.0.0-beta.31 | **5.0.0-beta.32** | Pulls patched `@auth/core`. |
| `@auth/core` | 0.41.2 (transitive) | **0.41.3** (via `overrides`) | **CRITICAL** — email normalizer homoglyph `@` bypass (account-linking / enumeration primitive). |
| `postcss` | 8.4.31 (nested under `next`) | **^8.5.26** (via `overrides`) | `</style>` stringify XSS + `sourceMappingURL` path-traversal `.map` disclosure (HIGH). Build verified green. |
| `undici` | 7.28.0 (via `isomorphic-dompurify` → `jsdom`) | **^7.29.0** (via `overrides`) | Response desync, cache poisoning, CRLF, cookie attribute injection (HIGH). |
| `sharp` | 0.34.5 (via `next`) | **^0.35.4** (via `overrides`) | libvips CVE-2026-33327/33328/35590/35591 (HIGH). |
| `valibot` | 1.2.0 (via `prisma` → `@prisma/dev`) | **^1.4.2** (via `overrides`) | `record()` inherited-property `flatten()` throw (MODERATE). |

Result: `npm audit --omit=dev` went from **18 vulnerabilities (2 critical, 12 high)**
to **5 (0 critical, 5 high)**. `next build` passes (497/497 static pages).

`overrides` block now in `package.json`:

```jsonc
"overrides": {
  "@auth/core": "0.41.3",
  "undici": "^7.29.0",
  "sharp": "^0.35.4",
  "valibot": "^1.4.2",
  "postcss": "^8.5.26"
}
```

---

## Residual — deferred, with rationale and plan

### 1. `xlsx` (SheetJS) — HIGH, **no fixed version on npm**
- **Advisories:** Prototype Pollution (GHSA-4r6h-8v6p-xvw6), ReDoS (GHSA-5pgg-2g8v-p4x9).
- **Exposure:** used to parse/generate spreadsheets in
  `admin/data-tools`, CHA masters, CRM masters + rate-response parser, HRMS
  employee-directory export, payroll import/export, and three `scripts/*`.
  Parsing **attacker-influenced** files (payroll import, CRM rate responses,
  CHA masters) is the real risk surface; pure export paths are not.
- **Interim mitigation (cluster: request-integrity follow-up — NOT yet done):**
  1. Route every `XLSX.read`/`XLSX.readFile` through one wrapper that runs with a
     hardened prototype (`Object.freeze(Object.prototype)` in the worker) and
     enforces a max byte size + parse timeout.
  2. Move parsing of user-uploaded workbooks to an isolated worker / subprocess.
  3. Add `validateUpload(kind:"spreadsheet")` (magic-byte + size) at every
     upload entry point before the bytes reach `xlsx`.
- **Planned fix (post Stage-1 core):** migrate reads to `exceljs` (maintained,
  no known criticals) and writes to `exceljs` or `write-excel-file`. Estimated
  1–2 days across ~10 call sites; needs golden-file tests for each importer.
- **Owner action required:** confirm whether the SheetJS **Pro / self-hosted**
  build (which carries the fixes) is licensable for this deployment as a faster
  path than the `exceljs` migration.

### 2. `nodemailer` — HIGH, fix only in a **major** bump (7.x → 9.x)
- **Advisories:** SMTP command injection via unsanitized `envelope.size`
  (GHSA-2mzp-…); CRLF in transport `name` option → EHLO/HELO injection
  (GHSA-vvjj-xcjg-gr5g).
- **Exposure:** `src/lib/email.ts` only, and only when `EMAIL_PROVIDER=smtp`
  (default is Resend). `createTransport` sets **no** `name` and `sendMail` passes
  **no** `envelope` — neither vulnerable field is caller-reachable today, so the
  practical risk is low. `to`/`from` come from validated addresses.
- **Interim mitigation:** none required beyond keeping `envelope`/`name` unset;
  a code comment + this note guard against regressions.
- **Planned fix:** bump to `nodemailer@^9` in its own PR with a manual SMTP
  send-path smoke test (Gmail Workspace SMTP + a generic host). Low blast radius
  (one file). Target: alongside the auth/session cluster (email is exercised
  there by password-reset work anyway).

### 3. `prisma` / `@prisma/config` / `deepmerge-ts` — HIGH, **build-time only**
- **Advisory:** `deepmerge-ts` stack exhaustion on recursive object graphs
  (GHSA-…), reached via `prisma` → `@prisma/dev` → `@prisma/config`.
- **Exposure:** the Prisma **CLI** (`prisma generate`, `prisma migrate`) at build
  / dev time. **Not** in the Next.js server runtime or the deployed bundle
  (`@prisma/client` + `@prisma/adapter-pg` are the runtime packages and are
  unaffected). `npm audit`'s "fix" is `prisma@6.12.0`, a **major downgrade**
  from the pinned 7.8.0 — rejected.
- **Decision:** **ACCEPTED RISK (build-time)**. No untrusted input reaches the
  Prisma CLI's config merge during our build.
- **Planned fix:** bump `prisma` when a `7.x` release ships the patched
  `@prisma/config` / `deepmerge-ts`. Tracked by the CI `security:audit` gate
  (below), which will flag the day a non-major fix appears.

---

## CI gate (implemented — Stage 1 §24)

`scripts/security-audit-gate.mjs` (run by `.github/workflows/security.yml`):

- Parses `npm audit --omit=dev --json` and **fails** on any `high`/`critical`
  in the production tree that is **not** on the triaged allow-list.
- Allow-list entries carry a `reason` and a `reviewBy` date; once the date
  passes, the entry stops suppressing and the gate fails until re-triaged.
- `npm audit` (full, incl. dev) also runs as a non-blocking report.
- The two coverage scanners (`scan-route-auth-coverage`,
  `scan-tenant-scope-coverage`), the security unit tests, `eslint`, `tsc` and a
  `gitleaks` secret-scan run in the same workflow.

### Current allow-list (also encoded in the gate script)

| Advisory / package | Reason | Review by |
|---|---|---|
| `nodemailer` (6 GHSAs incl. GHSA-vvjj-xcjg-gr5g) | Fix needs `nodemailer@9` (major); no caller-controlled `name`/`envelope`; default provider is Resend | 2026-11-30 |
| `@prisma/config` / `prisma` / `deepmerge-ts` GHSA-ggr8-5vv4-36mx | Build-time Prisma CLI only; not in the Next.js runtime bundle | 2027-03-31 |
| `shadcn` → `cosmiconfig` → `js-yaml` (3 GHSAs) | `shadcn` CLI is a build-time tool; **should be moved from `dependencies` to `devDependencies`** (concurrent UI work added it) | 2027-01-31 |

> Note: a concurrent shadcn/UI migration added `shadcn`, `react-aria-components`,
> `tailwind-merge`, `clsx`, `tw-animate-css` to `dependencies` and pulled in
> `js-yaml` transitively. `shadcn` (the CLI) belongs in `devDependencies`;
> flagged here for that team to fix.

---

## Notes

- `next-auth` remains on a **beta** (`5.0.0-beta.32`). This is the current
  supported v5 line for Auth.js; moving off beta means waiting for the v5 GA.
  Staying on v5 avoids a v4→v5 breaking migration. Re-evaluate at each beta/RC.
- Do **not** run `npm audit fix --force` — it proposes `next@16.3.3` (breaks
  build) and `prisma@6.12.0` (major downgrade).
- Re-run `npm audit --omit=dev` after any `npm install`; the `overrides` block is
  load-bearing for the security posture.

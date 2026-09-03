# IDENTITY ARCHITECTURE — Monolith

> Authentication, authorization, and user lifecycle. Stage 1 delivered the IAM
> core (`AUTHENTICATION.md`, `SESSION_SECURITY.md`, `SECURITY_ARCHITECTURE.md`);
> Stage 2 adds the per-org membership lifecycle and sets the extension path for
> enterprise SSO / SCIM.

---

## 1. Authentication (Stage 1 — unchanged)

- Local credentials (bcrypt), Google sign-in (OAuth), MFA / TOTP, passkeys /
  WebAuthn, password reset with single-use hashed tokens.
- Server-side sessions (`UserSession`), rotation on privilege change, step-up
  auth, device / IP labelling, `SecurityEvent` audit stream.
- Organisation auth policy: `Organisation.requireMfa`, allowed methods,
  session policy — a per-org minimum that cannot be weakened below the platform
  baseline.
- Bootstrap: `/api/setup` is bootstrap-once (blocks once a platform admin
  exists) and `SETUP_SECRET`-gated in production. No open `/setup` takeover path.

---

## 2. Authorization

- One centralised capability system: `Permission` global catalogue, `Role`
  (org-scoped), `RolePermission`, `UserRole`; evaluated via `loadCaps` / `can` /
  `requirePermission` in `src/lib/rbac.ts`; client mirror `useCan` / `Caps`.
- No duplicate permission systems.
- Stage 2 consumers use permission keys, not role-name matching:
  - Approval engine `approverMode: "PERMISSION"` gates a level by `can(userId, key)`.
  - Custom fields gate value read / write by `readPermission` / `writePermission`.
- Separation of duties: the approval engine's `requireDistinctApprover` blocks a
  user approving their own request or filling two slots on one request.

---

## 3. User lifecycle (Stage 2 — spec §30)

Per-organisation lifecycle on `OrganisationMembership.status`:

```
INVITED ──▶ ACTIVE ──▶ SUSPENDED ──▶ ACTIVE
   │          │            │
   │          ├──▶ DEACTIVATED ──▶ ACTIVE
   ▼          ▼            ▼
 (ARCHIVED — terminal, from any state)
```

- `canTransition(from, to)` / `assertTransition` enforce the table
  (`membership-lifecycle.ts`, pure, unit-tested).
- Only `ACTIVE` may act in the org (`isActiveMembership`).
- `setMembershipStatus` records `deactivatedAt`; deactivation is expected to
  stop authentication and revoke sessions for that org (wiring pending).
- Historical business / audit records are **preserved** when a member leaves —
  no cascade delete of business data.

**Pending:** session validation and RBAC still key off `User.orgId`. The
membership row is authoritative only once `validateSession` / `rbac.ts` /
`tenant.ts` resolve the active membership and reject non-ACTIVE.

---

## 4. Enterprise SSO — extension path (spec §28)

Google is one identity provider, not a schema assumption. To add OIDC / Entra ID
/ SAML without re-architecting:

- Introduce `OrgIdentityProvider(orgId, kind, config)` — `kind` ∈
  `oidc | saml | google | microsoft`.
- Auth callback resolves `(provider, subject)` → linked `User`; linking uses the
  existing OAuth-linking flow (`src/lib/oauth-linking.ts`).
- Domain verification: `OrgDomain(orgId, domain, verifiedAt, method)` — DNS TXT
  challenge. Membership is **never** granted on the `@domain` string alone; it
  requires a verified domain **and** an authorised auto-join policy.
- `Organisation.requireMfa` / allowed-methods policy continues to apply.

Not implemented in Stage 2 — documented backlog.

---

## 5. SCIM 2.0 — extension path (spec §29)

Not implemented. Architecture path:

- `ServiceAccount` / API-key credential (see `API_SECURITY.md`) with a
  `scim:provision` scope.
- `/scim/v2/Users` + `/scim/v2/Groups` endpoints mapping SCIM resources to
  `User` + `OrganisationMembership` + `UserRole`.
- Operations: create user (INVITED membership), update, deactivate
  (`DEACTIVATED`), group assignment (`UserRole`).
- No partial / fake endpoint will be shipped to claim support.

---

## 6. Service accounts & API credentials (spec §9 / §10)

Not implemented in Stage 2. Requirements captured in `API_SECURITY.md`:
org-owned, explicit scopes, expiry, rotation, last-used tracking, revocation,
audit logging; secret shown once, stored as an irreversible hash.

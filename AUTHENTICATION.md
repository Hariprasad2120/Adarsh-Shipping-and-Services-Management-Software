# AUTHENTICATION

Local password, Google sign-in, MFA and password reset. Implementation lives in
`src/lib/auth.ts`, `src/lib/mfa/*`, `src/lib/password-reset*.ts`,
`src/lib/oauth-linking.ts`.

---

## 1. Local email + password

- Hash: **bcrypt, cost 12** (`bcryptjs`). Argon2id was evaluated; bcrypt(12) is
  retained for this deployment (no native build in the serverless target) and
  is ASVS-acceptable. Migration path: hash on write, re-hash on next successful
  login if the algorithm changes.
- **Policy** (target, `password-reset` enforces the length floor today):
  minimum 12 characters, large maximum, paste + password-manager friendly,
  Unicode-safe, no forced composition rules, no routine expiry. Breach-list
  blocking (HIBP k-anonymity or a bundled top-N) is a tracked follow-up.
- Administrators never see passwords. Reset issues a token; it does not reveal
  or set a value an admin can read.
- `authorize()` order: parse → per-`email+IP` lockout check → user lookup →
  `bcrypt.compare` → (MFA, §3) → `createSession`. Unknown user and wrong
  password take the **same path and timing** (no enumeration).

## 2. Google sign-in (OIDC via Auth.js)

- Auth.js handles state, PKCE and nonce. We do **not** use the Google access
  token as a Monolith session — Google authenticates the identity, Monolith
  mints its own server session.
- `signIn` callback:
  1. `assessOAuthProfile(profile)` — **requires `email_verified === true`**;
     if `GOOGLE_WORKSPACE_DOMAIN` is set, the email domain **and** the `hd`
     claim must match; email is normalised (trim + lowercase).
  2. The user must already exist, be active, and have an `orgId`
     (admin-provisioned). Self-signup via Google is not allowed.
  3. **Identity binding:** the verified `sub` is stored in `IdentityLink
     (provider="google", providerAccountId=sub)`. If that `sub` is already
     linked to a *different* Monolith user → **reject** + `OAUTH_IDENTITY_CONFLICT`.
     First success for a provisioned account creates the link.
- Rejections are audited as `LOGIN_FAILURE` with the reason code; the user sees
  a generic error.
- The `redirect` callback clamps the post-login target through
  `safeRedirectPath` (no open redirect).

## 3. Multi-factor authentication (TOTP)

RFC 6238, SHA-1, 6 digits, 30-second period, ±1 step skew. Compatible with
Google Authenticator, Microsoft Authenticator, 1Password, Authy, etc.

### Enrolment (`mfa-actions.ts` → `mfa/service.ts`)
1. **Re-authenticate** (step-up: re-enter password).
2. `beginEnrollment` — generate a 160-bit secret, store it **AES-256-GCM
   encrypted** (`MFA_ENCRYPTION_KEY`) on a `PENDING` `AuthenticationFactor`.
3. Show the QR (`otpauth://…`) **and** the manual Base32 code.
4. `confirmEnrollment(otp)` — the factor only becomes `ACTIVE` after a **valid
   OTP**. On success, 10 **recovery codes** are generated, shown once, and
   stored as `sha256(code + pepper)` hashes (`MfaRecoveryCode`).

### Login with MFA
Password OK + an `ACTIVE` factor → `authorize()` throws `MfaRequiredError`
(client shows the OTP field) → resubmit with `totp` → `verifyMfa` accepts a
live TOTP **or** a one-time recovery code (consumed on use) → session created
with `mfaVerified: true`.

### Management
`enable` · `verify` · `disable` · `regenerate recovery codes` · factor
inventory (`listFactors`). **Disable / regenerate require step-up.**
Regenerating invalidates the previous code set.

### Enforcement
- `Organisation.requireMfa = true` → all org members must have MFA.
- `User.isPlatformAdmin` → MFA is **mandatory** (`isMfaRequiredForUser`).

### Recovery / lost device
Sign in with a recovery code, then re-enrol a new authenticator (which rotates
the secret and issues fresh codes). If all codes are exhausted and the device
is lost, an org/platform admin disables MFA for the user after out-of-band
identity verification (audited).

### Passkeys / WebAuthn
`AuthenticationFactor` is shaped so a `type: "webauthn"` factor (null
`secretEnc`, credential columns added later) can be added without a database
redesign. Not implemented in Stage 1; TOTP is not removed when it is.

## 4. Step-up re-authentication (`src/lib/step-up.ts`)

Required (fresh strong auth within a per-action window) for: disable/reset MFA,
add/remove a factor, regenerate recovery codes, change password, change primary
email, change admin privileges, change org auth policy, generate API
credentials. Freshness is read from `UserSession.strongAuthAt`, stamped at login
and on a successful step-up password check.

## 5. Password reset (local accounts only)

`POST /api/auth/password/forgot` → `POST /api/auth/password/reset`.

- **Token:** 32 random bytes (base64url), stored **only** as `sha256`,
  **30-minute** TTL, **single use**.
- **Delivery:** email via the configured provider (Resend / SMTP). The link
  origin is **always `APP_URL`** — never a request `Host` header
  (host-poisoning defence). The raw token is never logged.
- **Generic response:** `forgot` returns a byte-identical body for *unknown
  email*, *Google-only account*, *rate-limited*, and *invalid input* — nothing
  reveals whether an account exists or how it authenticates. Google-only users
  are guided (in general product copy) to Google account recovery.
- **Abuse protection:** per-IP (5 / 15 min) and per-email (3 / hour) via the
  shared rate-limit store; every request audited (`PASSWORD_RESET_REQUESTED`).
- **On reset:** set the new bcrypt hash, consume the token, invalidate **all**
  outstanding tokens, **revoke every active session** for the user, audit
  (`PASSWORD_RESET_COMPLETED`). The user is **not** signed in automatically —
  they must authenticate with the new password (and MFA, if enabled).

## 6. Bootstrap / special accounts

`scripts/bootstrap-special-accounts.ts` — emails come from
`SPECIAL_ROOT_ACCOUNT_EMAIL` / `SPECIAL_CHA_TEST_EMAIL`; the script refuses to
run without a real `SPECIAL_ACCOUNTS_INITIAL_PASSWORD` (≥12 chars). No
hardcoded identity or default password.

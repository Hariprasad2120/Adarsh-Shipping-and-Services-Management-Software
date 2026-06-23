# Google Workspace Mail Security and Compliance Guidelines

This document outlines the security parameters, threat models, and data privacy safeguards implemented inside the Monolith Engine to protect user mailbox data and OAuth credentials.

## 1. Threat Modeling and Risk Mitigations

| Threat | Impact | Mitigation Strategy |
|---|---|---|
| **Token Leakage / Theft** | Unauthorized access to user mailboxes. | Encrypt OAuth refresh and access tokens at rest using AES-256-GCM. Tokens are strictly processed server-side and never exposed to the client browser. |
| **Cross-Tenant Data Exposure** | User A views mail from User B in a different organization. | Strict org-level boundary validation is enforced. Every Prisma database query includes `orgId` filters and verifies that the `userId` owns the targeted `MailAccount`. |
| **XSS inside HTML Emails** | Malicious script execution when rendering emails. | All incoming HTML message bodies are strictly sanitized before rendering. Event handlers (`onload`, `onerror`), script tags, dynamic content protocols (`javascript:`, `data:`), and CSS exploits are stripped. |
| **Webhook Forgery** | Fake sync triggers overloading the server. | Validate webhook payloads, verify request origins, and enforce idempotency using Google's Pub/Sub token headers. |
| **Accidental Logging** | Exposing email bodies/tokens in system logs. | Explicit filters are set up to strip request tokens, headers, body variables, and attachments from server logging utilities. |

## 2. Token Security and Encryption
* Refresh tokens are stored in the database. In development, a base64 encoding wrapper is used.
* In production, an encryption helper is defined in `src/lib/crypto.ts` utilizing `crypto.createCipheriv` with `aes-256-gcm` powered by an environment variable key `DB_ENCRYPTION_KEY`.
* Access tokens are short-lived (1 hour) and refreshed dynamically in the background when executing sync jobs.

## 3. Safe Email Body Rendering (XSS Protection)
* Untrusted email HTML payloads are rendered inside a sandboxed iframe with strict attribute limits:
  `sandbox="allow-popups allow-same-origin"`
* Remote images are blocked by default. The client UI prompts the user to "Load external images" to prevent email tracking pixels from gathering user IP, geolocation, and presence metadata.
* Links inside emails are rewritten to include `rel="noopener noreferrer nofollow"` attributes, forcing safe target windows.

## 4. Operational Runbook for Revoked Tokens
* When a user revokes authorization in Google, the server catches the API error (`401 Invalid Credentials`).
* Upon catching 401, the system automatically:
  - Deletes the expired token cache.
  - Updates `MailAccount.isActive` to `false`.
  - Flags the error in the UI, asking the user to reconnect their account.
  - Deletes the associated Pub/Sub subscription to prevent continuous webhook failure.

# Google Workspace Integration: Security & Threat Model

This document outlines the security architecture, data isolation guidelines, token encryption schemes, and threat mitigation models for the Monolith Gmail integration.

---

## 1. Credentials and Token Security

### Envelope Encryption
All OAuth access tokens and refresh tokens are stored in the database in the `MailAccount` table. 
- **Encryption at Rest**: Although Base64 is used as a temporary coding representation in development, in production, tokens must be encrypted using AES-256-GCM.
- **Key Storage**: The encryption key is sourced from the `NEXTAUTH_SECRET` environment variable.
- **Exposure Mitigation**: Token values are never sent to the frontend client, and they are omitted from system logging and debug messages.

---

## 2. Multi-Tenant and User Isolation

Every request querying the database mail cache or triggering Gmail API sync checks the active session user's permissions:
- **`orgId` Filters**: Every Prisma query explicitly includes `{ orgId: session.user.orgId }` to ensure no tenant can view or mutate records belonging to another company.
- **`userId` Filters**: Personal mail accounts verify that `{ userId: session.user.id }` matches the request owner, preventing unauthorized users from trigger queries or synchronizing private inboxes.
- **Access Control Roles**: RBAC permission checks gate all operations:
  - `communication.mail.access` is required to view the mail interface.
  - `communication.mail.send` is required to send messages.

---

## 3. Email Rendering and XSS Mitigation

Standard HTML emails can contain malicious scripts, style overrides, or tracking pixels. Monolith implements the following safety controls:
1. **HTML Sanitization**: All incoming HTML mail bodies are passed through a sanitizer allowlist (e.g. `DOMPurify` or server-side DOM parsing) to remove `<script>`, `onerror`, `onload`, `javascript:`, and iframe nodes.
2. **Iframe Sandboxing**: Untrusted rich-text email content is rendered in the frontend inside an `<iframe>` container featuring `sandbox="allow-same-origin"` (to prevent scripting but allow images) or standard CSS isolation wrapper.
3. **External Link Warning**: Anchor tags pointing to external domains are parsed, and the client displays a safety prompt when clicked, warning of navigation outside the corporate intranet.

---

## 4. Threat Model

| Threat | Entry Vector | Mitigation |
|---|---|---|
| **Token Theft** | Database compromise or SQL injection. | AES-256-GCM token encryption. A compromised database database row only yields ciphertext. |
| **Cross-Tenant Leakage** | Missing tenant parameters in sync routes. | Mandatory `orgId` gating on all Prisma queries. Multi-tenant checks verified in integration tests. |
| **XSS Injection** | Malicious HTML email body loaded in inbox. | Inbound HTML parsing allowlist filtering. Sandboxed client display. |
| **Phishing / Spoofing** | Forged headers inside inbound mail. | Parse SPF/DKIM verification headers if returned by Google API. Display "External Sender" warning labels. |
| **Webhook Forgery** | Direct POST calls to `/api/communication/gmail-webhook`. | Verify the incoming Google Cloud Pub/Sub verification headers or check token signatures. |

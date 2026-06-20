# Antigravity Master Prompt: Full Gmail Ecosystem Inside Monolith Engine

You are a principal software architect and senior full-stack engineer with deep experience in Next.js, TypeScript, Google Workspace APIs, OAuth 2.0, email protocols, secure multi-tenant SaaS systems, real-time synchronization, background jobs, PostgreSQL, Prisma, Redis, queues, and enterprise UI/UX.

Your task is to inspect the complete existing Monolith Engine repository and then design, implement, test, and document a production-ready **Mail and Workspace Communication module** that gives users a Gmail-class experience inside Monolith Engine.

This is not a static Gmail UI clone. Build a fully functional Google-connected mail client using supported Google APIs, with secure synchronization, real-time mailbox updates, complete compose/read/manage workflows, Workspace integrations, role-aware administration, and deep integration with Monolith Engine modules.

Do not stop after creating a plan, mock UI, sample data, placeholder buttons, or partially wired screens. Implement the feature end to end, run migrations, configure APIs, add tests, run the application, fix errors, and verify all critical workflows.

## 1. Core Product Goal

Create a first-class communication workspace inside Monolith Engine where a user can:

- Click **Continue with Google**.
- Sign in using their Google or Google Workspace account.
- Grant the required permissions through Google's official OAuth consent flow.
- Return to Monolith Engine with their Gmail mailbox connected.
- Continue using the connected account without repeated sign-in while authorization remains valid.
- Read, search, compose, send, reply, forward, organize, and manage Gmail from Monolith Engine.
- Access connected Google Chat, Calendar, Meet, Contacts, Tasks, and Drive workflows from the same communication interface where supported by official APIs.
- Connect and switch between multiple Google accounts.
- Disconnect an account and revoke stored access safely.

The authenticated Google account must remain the source of truth for Gmail data. Do not attempt to scrape Gmail, automate the Gmail website, reuse captured Gmail HTML/JavaScript, collect Google passwords, or imitate unsupported private Google endpoints.

## 2. Mandatory Discovery Before Editing

Before implementation:

1. Read the entire repository structure.
2. Identify the framework, routing model, authentication system, ORM, database, API conventions, background-job system, real-time transport, state management, component library, design tokens, notification system, audit-log system, file storage, permission model, and testing tools.
3. Locate all existing communication, notification, employee, CRM, HRMS, AMS, task, calendar, document, and settings modules.
4. Identify reusable patterns and integrate with them instead of creating a disconnected application.
5. Review the supplied Gmail screenshot and captured source only to understand expected information density, navigation, and common workflows.
6. Create `docs/google-workspace-mail-implementation.md` containing:
   - current architecture findings;
   - supported Google API capability matrix;
   - unsupported or restricted Gmail UI features;
   - required Google Cloud configuration;
   - OAuth scopes with justification;
   - database and synchronization design;
   - phased implementation checklist;
   - security and compliance requirements;
   - test and rollout strategy.

After writing the document, immediately continue with implementation.

## 3. Google Authentication and Authorization

Use Google's official OAuth 2.0 authorization-code flow for a server-side web application and OpenID Connect for identity.

Implement:

- A single **Continue with Google** entry point.
- Authorization Code flow with PKCE where supported by the selected library.
- Exact redirect URI validation.
- `state` validation against CSRF.
- `nonce` validation for identity tokens.
- Server-side authorization-code exchange.
- Offline access and secure refresh-token handling.
- Incremental authorization when optional Workspace features are opened.
- Account chooser and multi-account connection.
- Reauthorization when permissions change or a token is revoked.
- Token refresh with locking to prevent refresh races.
- Google Cross-Account Protection support if practical in the existing stack.
- Disconnect flow that revokes Google authorization, removes subscriptions, and deletes or cryptographically erases stored tokens.

Never send refresh tokens to the browser. Encrypt tokens at rest using envelope encryption or the repository's established secret-management system. Do not log tokens, authorization codes, email bodies, attachments, or sensitive OAuth responses.

Use the minimum scopes required for each capability. Do not request every scope merely because it exists. Define scope bundles such as:

- Identity and basic profile.
- Core Gmail access.
- Gmail settings administration.
- Contacts.
- Calendar and Meet event creation.
- Tasks.
- Drive attachment picker/export.
- Google Chat.

If the deployment is exclusively for Adarsh Shipping's Google Workspace organization, support an **Internal** OAuth application configuration. Keep ordinary per-user OAuth as the default. Add service-account domain-wide delegation only for explicitly approved administrator functions that require it, never as a shortcut for normal user consent.

Provide:

- `.env.example` entries;
- Google Cloud Console setup instructions;
- authorized origin and redirect URI instructions;
- API enablement checklist;
- OAuth consent screen setup;
- test-user/internal-user configuration;
- scope verification notes;
- Pub/Sub setup;
- webhook verification;
- key rotation procedure.

## 4. Mail Information Architecture

Integrate the module into the existing Monolith Engine shell and design system. Do not copy Google's trademarks, logo, proprietary source code, or exact visual identity. Build a familiar, efficient, Gmail-class interface branded for Monolith Engine and Adarsh Shipping.

Primary navigation:

- Mail
- Chat
- Meet
- Contacts
- Calendar
- Tasks
- Files

Mail navigation:

- Compose
- Inbox
- Starred
- Snoozed
- Important
- Sent
- Scheduled
- Drafts
- All Mail
- Spam
- Trash
- Categories
- User labels
- Create/manage labels
- More/less expansion

Support a collapsible navigation rail, keyboard-accessible tooltips, unread counts, user avatar/account switcher, connection status, sync status, notifications, settings, help, and responsive layouts.

Desktop should support compact/high-density lists. Tablet and mobile must have complete workflows, not a broken desktop layout squeezed into a smaller viewport.

## 5. Inbox and Message List

Implement a production-quality inbox with:

- Threaded conversation view as the default.
- Optional message-centric view if supported by the chosen architecture.
- Sender/avatar, recipient context, subject, snippet, labels, category, attachment indicator, date/time, unread state, importance, star, and draft status.
- Pagination or cursor-based infinite loading.
- Selection: one, page, all matching search results.
- Bulk actions.
- Refresh/sync.
- Density modes.
- Reading pane: none, right, or below.
- Hover actions.
- Drag and drop to labels/folders where appropriate.
- Optimistic updates with rollback and user-visible errors.
- Empty, loading, offline, reconnecting, expired-authorization, rate-limited, and partial-sync states.

Bulk and single-message/thread actions:

- Mark read/unread.
- Star/unstar.
- Mark important/not important.
- Archive/remove Inbox.
- Move to Inbox.
- Apply/remove labels.
- Move to Spam/not Spam.
- Move to Trash.
- Permanently delete where allowed.
- Restore from Trash.
- Snooze using a Monolith-managed scheduler when Gmail API has no equivalent write operation.
- Mute/unmute where API support permits; otherwise document the limitation and provide the closest supported behavior.
- Print a message or full conversation.
- Download original RFC 2822 message.
- View raw headers and security details.
- Create a Monolith task, CRM activity, HR action, AMS action, or internal reminder from an email.

Preserve Gmail thread and message identifiers. Never model a Gmail label as a conventional exclusive folder; messages and threads may have multiple labels.

## 6. Reading and Conversation View

Implement:

- Full thread expansion/collapse.
- Individual message expansion.
- Sender and recipient details.
- To, Cc, Bcc, Reply-To, sent time, message ID, and headers.
- Reply, reply all, and forward.
- Edit subject in a reply.
- Pop-out reading window or route.
- Safe rendering of multipart MIME.
- Plain text and HTML alternatives.
- Inline images referenced through Content-ID.
- Attachment cards and previews.
- Quoted-text collapse.
- Signature separation where practical.
- Link sanitization and safe external navigation.
- Remote-image privacy controls and proxying strategy.
- Phishing/external sender warnings based on available headers and Monolith security rules.
- Block sender workflow using a Monolith filter/rule where direct Gmail parity is unavailable.
- Report phishing flow that records the event and uses supported Google actions only.
- Translation integration only through a configured translation provider; do not pretend this is a Gmail API feature.

Sanitize all HTML email using a proven allowlist sanitizer. Render untrusted HTML in a constrained environment. Prevent scripts, event handlers, dangerous URLs, tracking abuse, CSS escape, credential prompts, and access to the parent application.

## 7. Composer

Build inline, pop-out, minimized, maximized, and full-screen compose modes.

Required features:

- To, Cc, and Bcc chips.
- Contact and Workspace-directory autocomplete.
- Multiple recipients and recipient validation.
- Subject and rich-text body.
- Plain-text mode.
- Formatting toolbar: font, size, bold, italic, underline, text color, alignment, lists, indent, quote, link, remove formatting.
- Undo/redo.
- Emoji picker.
- Inline images.
- File attachments with upload progress, retry, cancel, remove, preview, and size validation.
- Attach from connected Google Drive.
- Signature selection by connected account/send-as identity.
- From/send-as selector.
- Reply-To support where allowed.
- Autosave to Gmail Drafts with debouncing, version conflict handling, and recovery.
- Send now.
- Schedule send through a Monolith server-side scheduler if direct Gmail API support is unavailable.
- Cancel a scheduled send before execution.
- Configurable undo-send delay implemented by queueing the send within Monolith.
- Save and close.
- Discard with confirmation.
- Confidential-mode-like requirements must not be falsely represented as native Gmail Confidential Mode. If needed, implement a separately branded Monolith secure-message feature with an explicit architecture and clear recipient experience.
- Templates/snippets.
- Mail merge only with rate limits, recipient consent, opt-out controls, and anti-abuse safeguards.

Generate valid MIME messages. Correctly handle UTF-8 headers, threading headers, HTML/plain alternatives, inline assets, attachments, replies, and forwards.

## 8. Search

Use Gmail's supported search query syntax for server-side mailbox searches.

Implement:

- Instant search field.
- Recent searches.
- Search suggestions.
- Advanced search panel.
- Filters for sender, recipient, subject, words, excluded words, labels, categories, date range, size, attachments, read/unread, starred, important, spam, trash, and mailbox.
- Search chips.
- Saved searches in Monolith.
- Search-result bulk operations.
- Deep links that restore query and selected thread.
- Search query parsing and validation.
- No full mailbox body indexing in Monolith unless it is explicitly justified, encrypted, access-controlled, retention-managed, and approved.

## 9. Labels, Categories, Filters, and Rules

Labels:

- List system and user labels.
- Create, rename, delete, show/hide, recolor locally, nest visually, apply, remove, and bulk manage.
- Respect immutable system-label restrictions.
- Keep Google label state synchronized.

Categories:

- Display available Gmail category system labels such as Primary, Social, Promotions, Updates, and Forums when present.
- Do not claim that Monolith can reproduce Google's private machine-learning classification.

Filters:

- List, create, and delete Gmail filters using supported Gmail settings endpoints.
- Criteria: from, to, subject, query, negated query, attachment, and size constraints supported by Google.
- Actions: add/remove labels, mark read, star, archive, trash, never spam, forward to verified addresses, and other actions supported by the API.
- Clearly distinguish Google-synced filters from Monolith-only automation rules.

Monolith rules:

- Trigger on incoming email, sender/domain, subject, label, attachment type, related CRM/customer/employee, SLA, and business hours.
- Actions may create tasks, notify users, attach email references to records, request approvals, set follow-up dates, or invoke approved workflows.
- Include rule priority, enable/disable, dry run, execution history, idempotency, retry behavior, and audit logs.

## 10. Gmail Settings

Implement every setting exposed by supported Gmail APIs and permitted scopes:

- Send-as identities and aliases.
- Per-alias display name, reply-to, default status, SMTP configuration where allowed, and signature.
- Vacation responder.
- Language.
- POP settings.
- IMAP settings.
- Auto-forwarding.
- Forwarding addresses and verification status.
- Filters.
- Delegates where supported and only with the required Workspace domain-wide delegated service account.

Also implement Monolith-local preferences:

- Theme.
- Density.
- Reading pane.
- Conversation expansion behavior.
- Notifications.
- Remote image policy.
- Default reply mode.
- Undo-send delay.
- Default signature mapping.
- Keyboard shortcuts.
- Per-account color and display name.
- Sync window and attachment caching policy.

Do not show unsupported Gmail settings as working controls. Build a capability registry so the UI can hide, disable, or explain features based on account type, granted scopes, administrator configuration, and API availability.

## 11. Real-Time Synchronization

Implement a resilient synchronization engine:

- Initial mailbox bootstrap.
- Gmail `watch` registration through Google Cloud Pub/Sub.
- Verified Pub/Sub push endpoint.
- Store the current `historyId`.
- On notification, fetch incremental changes through Gmail History.
- Handle added/deleted messages and added/removed labels.
- Renew each Gmail watch before expiration using a scheduled job.
- Recover from expired/invalid history IDs with a controlled partial or full resync.
- De-duplicate notifications and API results.
- Use idempotent jobs.
- Retry transient failures with exponential backoff and jitter.
- Respect `Retry-After`.
- Protect against notification storms.
- Display last successful sync and current connection health.
- Avoid polling as the primary real-time mechanism.

Use WebSocket, Server-Sent Events, or the repository's established real-time layer to push synchronized changes to open Monolith clients. Update unread counts, lists, thread details, and notifications without page reloads.

## 12. Data Architecture

Create a schema that fits the existing database conventions. At minimum consider:

- `GoogleConnection`
- `GoogleOAuthGrant`
- `GoogleGrantedScope`
- `MailboxSyncState`
- `GmailLabelCache`
- `GmailThreadCache`
- `GmailMessageMetadataCache`
- `GmailDraftState`
- `GmailWatchSubscription`
- `ScheduledEmail`
- `EmailUndoQueue`
- `SavedMailSearch`
- `MailPreference`
- `MailRule`
- `MailRuleExecution`
- `MailRecordLink`
- `CommunicationAuditEvent`

Store only what the product needs. Prefer IDs, headers, snippets, normalized metadata, sync cursors, and Monolith relationships over permanent duplication of full mailbox bodies and attachments.

If bodies or attachments are cached:

- encrypt them at rest;
- use tenant/user-scoped object keys;
- enforce short configurable TTLs;
- remove them on disconnect or retention expiry;
- prevent cross-tenant access;
- record access where appropriate;
- exclude them from logs and analytics.

Use Google IDs as external identifiers and internal UUIDs as primary keys. Enforce unique constraints for idempotency.

## 13. Google Contacts

Integrate the People API:

- List and search contacts.
- Contact autocomplete in composer.
- Create, edit, delete, and restore where supported.
- Contact groups.
- Profile photos.
- Multiple emails, phones, organizations, titles, addresses, notes, and birthdays as supported.
- Incremental contact sync with sync-token expiry recovery.
- Workspace directory search when permitted.
- Contact detail side panel from messages.
- Link a Google contact to an existing CRM lead/contact/customer without duplicating records.
- Explicit conflict resolution and source-of-truth indicators.

## 14. Google Calendar and Meet

Integrate Calendar workflows:

- Calendar list.
- Agenda/day/week/month views using the existing Monolith calendar if one exists.
- Create, edit, move, and delete events.
- Invite attendees.
- RSVP status.
- Availability/free-busy lookup where permitted.
- Reminders.
- Recurring events.
- Time zones.
- Attach Drive files.
- Convert an email into an event.
- Create a Calendar event with a unique Google Meet conference.
- Open/join Meet links.
- Display conference details.

Do not attempt to embed or reproduce the full Google Meet calling client unless an official supported integration is selected. The standard implementation should create and manage Meet-enabled Calendar events and open the official meeting URL.

## 15. Google Chat

Use the official Google Chat API and user authorization where supported.

Implement capabilities only where the API permits them:

- List accessible spaces.
- Search/filter locally among loaded spaces.
- Display space metadata and members where permitted.
- List messages and threads.
- Send, edit, and delete messages according to caller permissions.
- Reply in threads.
- Create supported direct-message or space workflows.
- Display attachments/cards appropriately.
- Link Chat messages to Monolith tasks and records.

Maintain a capability matrix because Chat API behavior differs between user authentication and Chat-app authentication. Never claim complete Google Chat web-client parity when an operation is not publicly exposed.

## 16. Google Tasks

Integrate Google Tasks:

- List task lists.
- Create, edit, delete, reorder, complete, and reopen tasks.
- Notes, due dates, subtasks, and links where supported.
- Convert an email to a task while retaining a stable Gmail deep reference.
- Show Google-synced tasks alongside Monolith tasks with clear source badges.
- Offer explicit copy/link actions instead of silently merging incompatible task models.

## 17. Google Drive and Attachments

Integrate Drive for attachment workflows:

- Google Picker or an approved Drive file selector.
- Attach Drive links or exported files based on permission and size.
- Preview supported files.
- Save Gmail attachments to Drive.
- Preserve file names, MIME types, and access permissions.
- Warn when recipients cannot access a linked Drive file.
- Never broaden Drive sharing silently.

## 18. Monolith Engine Integrations

Add contextual actions throughout Mail:

- CRM: link thread to lead, contact, customer, quotation, sales order, or opportunity; create follow-up; show customer context.
- HRMS: link employee mail, leave request, onboarding document, grievance, or policy acknowledgment with permission checks.
- AMS: link appraisal communications, reviewer responses, meeting schedules, and follow-ups.
- Accounting: attach invoice/payment communication references without exposing financial records to unauthorized users.
- Tasks/To-do: create task from email, assign owner, due date, priority, reminder, and source link.
- Documents: store approved attachment copies through the existing document module.
- Notifications: use the central real-time notification system.
- Audit: record sensitive actions and record-linking changes.

Email access never implies access to the related Monolith record, and Monolith record access never implies access to the user's Gmail mailbox. Enforce both permission systems.

## 19. Offline, Performance, and Reliability

Performance targets:

- Render cached inbox shell quickly.
- Avoid downloading full bodies for list views.
- Fetch message bodies lazily.
- Fetch attachments only on request.
- Virtualize large lists.
- Cache label and profile metadata.
- Batch supported API operations.
- Use cursor-based pagination.
- Avoid N+1 Google API calls.
- Deduplicate concurrent requests.
- Apply optimistic UI only where rollback is reliable.

Implement a limited offline experience:

- Display recently cached metadata and explicitly cached messages.
- Allow draft composition offline.
- Queue safe local changes with visible pending state.
- Reconcile conflicts after reconnection.
- Never display an action as synchronized until Google confirms it.

Handle:

- revoked tokens;
- expired sessions;
- missing scopes;
- Google API quota errors;
- rate limits;
- Pub/Sub delivery duplication;
- deleted threads;
- attachment failures;
- draft version conflicts;
- scheduled-send failures;
- partial API outages;
- account suspension;
- Workspace admin restrictions.

## 20. Security and Compliance

Treat mailbox access as highly sensitive.

Mandatory controls:

- Least-privilege scopes.
- OAuth verification readiness.
- Restricted-scope security assessment readiness where applicable.
- Encryption in transit and at rest.
- Strong token encryption and rotation.
- Strict tenant and user isolation.
- Server-side authorization on every endpoint.
- No insecure direct object references using Gmail IDs.
- CSRF protection.
- XSS-safe mail rendering.
- Content Security Policy.
- SSRF protection for remote content and previews.
- Malware scanning for downloaded/uploaded attachments where infrastructure permits.
- MIME/type verification.
- File size and archive-bomb controls.
- Rate limiting.
- Abuse prevention for sending and automation.
- Audit logs for connect, disconnect, send, delete, settings, delegation, rules, exports, and record linking.
- Configurable retention and cache deletion.
- User data export and deletion handling.
- Privacy policy and Google API Services User Data Policy compliance.
- No advertising use, data brokerage, or model training on mailbox content.

Add a threat model covering token theft, malicious HTML emails, phishing links, poisoned attachments, webhook forgery, cross-tenant leakage, queue replay, compromised administrator accounts, excessive scopes, and accidental exposure through logs.

## 21. API and Service Boundaries

Follow the repository's existing API pattern. Separate:

- OAuth controller/service.
- Google API clients and scope-aware adapters.
- Gmail synchronization service.
- MIME parser/builder.
- Mail query and command services.
- Pub/Sub webhook handler.
- Background jobs.
- Scheduling/undo-send service.
- Cache repository.
- Monolith integration adapters.
- Audit service.

All mutations must be validated, permission-checked, idempotent where required, and mapped to typed domain errors.

Generate typed request/response contracts and API documentation. Never expose raw provider errors directly to end users.

## 22. Accessibility and UX Quality

Meet WCAG 2.2 AA where practical:

- Full keyboard navigation.
- Logical focus order.
- Visible focus states.
- Screen-reader labels.
- Accessible dialogs and menus.
- Correct semantic table/list behavior.
- Keyboard shortcuts with a discoverable shortcut panel and opt-out.
- Sufficient contrast in light and dark themes.
- No white-on-white or dark-on-dark text.
- No clipped controls, overlapping panels, or unreadable buttons.
- Reduced-motion support.
- Proper announcements for sent, archived, deleted, failed, and synchronized actions.

## 23. Testing

Add:

- Unit tests for MIME parsing/building, search query creation, scope checks, encryption wrappers, rule evaluation, and sync reducers.
- Integration tests for OAuth callbacks using mocks, Gmail commands, incremental history synchronization, Pub/Sub verification, scheduled send, undo send, filters, labels, drafts, and token refresh.
- Database tests for tenant isolation, uniqueness, cleanup, and idempotency.
- End-to-end tests for:
  - connect Google account;
  - load inbox;
  - open thread;
  - reply;
  - compose with attachment;
  - save/reopen draft;
  - send;
  - archive and label;
  - search;
  - create filter;
  - create task from email;
  - create Calendar event and Meet link;
  - disconnect account.
- Accessibility tests.
- Responsive browser tests at desktop, tablet, and mobile widths.
- Visual checks in light and dark themes.
- Error-path tests for revoked permission, quota exhaustion, expired history ID, and failed attachment upload.

Do not call real user mailboxes in automated tests. Use fixtures, provider adapters, mocked Google APIs, and a dedicated manually authorized test account only for documented smoke tests.

## 24. Delivery Phases

Implement in this order while keeping the application runnable:

1. Repository discovery, capability matrix, architecture, and Google Cloud setup documentation.
2. OAuth connection, token security, account management, and scope registry.
3. Gmail read-only inbox, labels, threads, MIME rendering, search, and pagination.
4. Gmail mutations, compose, attachments, drafts, replies, forwarding, and sending.
5. Pub/Sub watch, History sync, background jobs, and real-time UI updates.
6. Settings, aliases, signatures, filters, vacation responder, forwarding, POP/IMAP, and permitted admin functions.
7. Contacts, Calendar/Meet, Tasks, Drive, and supported Chat features.
8. Monolith CRM/HRMS/AMS/task/document integrations.
9. Offline behavior, performance optimization, security hardening, accessibility, and complete testing.

Use feature flags for incomplete phases. Never expose an unfinished control as functional.

## 25. Required Deliverables

Deliver all of the following:

- Complete production implementation.
- Database migrations and seed/fixture updates.
- Google Cloud and environment configuration guide.
- OAuth scope and verification guide.
- Pub/Sub setup and watch-renewal instructions.
- API documentation.
- Architecture and data-flow diagrams using Mermaid.
- Security threat model.
- Operational runbook for sync failures and revoked tokens.
- Test suite and test report.
- `docs/google-workspace-mail-implementation.md`.
- `docs/google-workspace-mail-admin-setup.md`.
- `docs/google-workspace-mail-security.md`.
- `docs/google-workspace-mail-api-limitations.md`.
- Final implementation summary listing completed, partially supported, and impossible/unsupported parity items.

## 26. Non-Negotiable Acceptance Criteria

The feature is complete only when:

- A new user can connect a Google account through official Google OAuth.
- A returning user can open Mail without signing in to Google again while their refresh authorization remains valid.
- Inbox data comes from the connected Gmail account, not mock data.
- Threads, labels, unread state, stars, archive, spam, trash, search, drafts, replies, forwarding, attachments, and sending work.
- Gmail changes reach Monolith through Pub/Sub and History synchronization without requiring a reload.
- Monolith changes are confirmed by Gmail and survive a full refresh.
- Multiple connected accounts remain isolated and switch correctly.
- Tokens are encrypted and never exposed to the browser or logs.
- Revocation and disconnect clean up access and subscriptions.
- Light/dark/mobile/desktop interfaces are usable.
- Critical tests pass.
- Unsupported Gmail-private features are clearly documented rather than faked.
- No Gmail scraping, browser automation, copied proprietary code, or password collection is used.

## 27. Required Engineering Behavior

- Do not ask me to manually create routine files or paste code between files.
- Do not rewrite unrelated modules.
- Preserve existing user changes.
- Use existing repository patterns and components.
- Do not hardcode users, labels, messages, scopes, account IDs, tenant IDs, or business rules.
- Do not use sample data in the final connected flows.
- Do not stop at TODO comments.
- Do not silently swallow errors.
- Do not claim feature parity without verifying API support.
- After each phase, run formatting, linting, type checking, tests, migrations, and relevant build commands.
- Start the development server and verify the full user flow in a real browser.
- Inspect console, network, server, worker, and queue errors.
- Fix every issue caused by this implementation before finishing.

Begin now by auditing the repository and the supplied Gmail reference, then create the implementation document and continue directly into the production implementation.

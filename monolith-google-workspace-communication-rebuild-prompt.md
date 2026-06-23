# Master Implementation Prompt: Rebuild Monolith Communication With Google Workspace

You are a principal software architect and senior full-stack engineer experienced with Next.js, TypeScript, PostgreSQL, Prisma, Google Workspace, Gmail API, Google Chat API, Google Drive API, Calendar API, Meet API, OAuth 2.0, service accounts, domain-wide delegation, Pub/Sub, background workers, RBAC, audit logs, and secure enterprise systems.

Inspect the complete Monolith Engine repository and replace the current Communication module with a simple, production-ready **Google Workspace Communication Hub** for Adarsh Shipping & Services.

## CRITICAL OVERRIDE: THIS IS A COMPLETE REPLACEMENT

The existing Communication module has been rejected and must not be used as the product specification.

Do **not** improve, restyle, repair, complete, rename, or reproduce the existing Communication features. Implement only the functionality specified in this document.

The current module may be inspected only for:

- route and dependency discovery;
- finding database relationships that need migration;
- identifying reusable platform infrastructure;
- locating code that must be removed;
- preserving shared authentication, RBAC, audit, notification, layout, and design-system primitives.

The current Communication module must not influence the new product behavior, page list, workflows, information architecture, or acceptance criteria.

### Required replacement procedure

Before implementing new screens:

1. Inventory every existing Communication route, page, component, API route, server action, service, database model, navigation entry, permission, background job, environment variable, test, and cross-module import.
2. Create `docs/communication-module-removal-map.md` with one row per discovered item and one of these decisions:
   - `REMOVE`
   - `MIGRATE`
   - `REUSE AS SHARED INFRASTRUCTURE`
3. Default every old Communication-specific item to `REMOVE`.
4. `MIGRATE` only data or relationships required by this specification.
5. `REUSE AS SHARED INFRASTRUCTURE` only when the item is genuinely shared with other Monolith modules and does not preserve rejected Communication behavior.
6. Remove old navigation and routes before adding the replacement navigation.
7. Implement the new module from this document as the sole source of truth.
8. Search the repository after implementation for old route names, labels, imports, feature flags, API paths, and dead code.
9. Add route tests proving removed pages return `404`, redirect to the correct replacement page, or are otherwise inaccessible.
10. Do not mark the task complete while old and new Communication systems coexist.

### Existing features that must not be recreated automatically

Remove the old implementations of:

- Mail Inbox
- Chat Messenger
- Scheduler Calendar
- Video Meetings
- Drive Storage
- Collaborative Docs
- Custom Forms
- Universal Search
- Communication Admin Console

Only create a replacement for one of these capabilities when this document explicitly defines its Google Workspace-backed behavior. Similar naming does not permit copying the old implementation.

### Scope discipline

When there is a conflict:

1. This document overrides the existing code.
2. The replacement architecture overrides old Communication documentation.
3. The acceptance criteria in this document override old tests.
4. Shared Monolith security and design-system standards still apply.

Do not preserve old functionality merely to avoid deleting code. Do not add compatibility wrappers, legacy tabs, hidden routes, or feature flags unless an active external dependency requires a temporary migration path and that dependency is documented.

The organization uses the Google Workspace domain:

```text
adarshshipping.in
```

The module must connect Monolith Engine with:

- Gmail
- Google Chat direct messages
- Google Chat group spaces
- Google Meet
- Google Calendar
- Google Drive
- Mono AI Assistant
- Monolith job records and document workflows

Do not create a visual-only demo, fake inbox, sample chat, placeholder integration, or unsupported Gmail clone. Implement and verify the real integration with official Google APIs.

## Important Architecture Decision

Do not use IMAP or POP as the primary integration for `@adarshshipping.in`.

- Use the Gmail API with OAuth 2.0 for Gmail because the organization already uses Google Workspace.
- IMAP/SMTP with OAuth may be offered later only as a fallback connector for non-Google email providers.
- Do not request or store users' Google passwords or app passwords.
- Do not scrape Gmail, Google Chat, Drive, Calendar, or Meet.
- Do not automate the Google website with Playwright, Puppeteer, Selenium, browser cookies, or private endpoints.
- Do not iframe Gmail or other Google Workspace pages when Google security headers prevent it.
- Google Workspace remains the source of truth for mail, Chat spaces, messages, meetings, and Drive files.
- Monolith remains the source of truth for jobs, employees, permissions, workflows, approvals, document categories, and audit history.

For users who need every native Google feature, provide secure launch actions that open the exact Gmail thread, Chat space, Drive folder/file, Calendar event, or Meet room in Google Workspace. Inside Monolith, provide the job-aware operational views and actions that can be reliably supported through official APIs.

## 1. Mandatory Discovery And Git Safety

Before editing:

1. Inspect the repository structure and read `AGENTS.md`, `CLAUDE.md`, `design.md`, and all relevant implementation documentation.
2. Check `git status`.
3. Do not discard or overwrite existing user changes.
4. Commit the current working state before this major replacement if there are uncommitted project changes and repository policy permits it.
5. Identify:
   - authentication and session handling;
   - organization, employee, user, role, branch, and department models;
   - job and CHA module models;
   - the existing Communication module;
   - Mono AI Assistant;
   - notification, task, approval, audit, and document systems;
   - Prisma schema and migration conventions;
   - queues, workers, cron jobs, webhooks, SSE, or WebSockets;
   - the established design system and layout components;
   - tests and deployment architecture.
6. Reuse existing services, permission checks, components, and design tokens.
7. Create `docs/google-workspace-communication-architecture.md` containing the discovered architecture, API capability matrix, OAuth scopes, data model, security design, rollout plan, and Google administrator setup.
8. Continue into implementation after writing the document.

## 2. Replace The Current Navigation

Replace the current Communication submenu with:

- Workspace Home
- Mail
- Chat
- Job Spaces
- Meetings
- Calendar
- Job Drive
- Search
- Communication Settings

Remove or migrate the old disconnected pages:

- Mail Inbox
- Chat Messenger
- Scheduler Calendar
- Video Meetings
- Drive Storage
- Collaborative Docs
- Custom Forms
- Universal Search
- Admin Console

Do not leave duplicate or dead communication routes.

Use the existing Monolith sidebar, header, breadcrumb, page padding, color tokens, typography, table components, dialogs, and dark/light themes. Follow `design.md`.

## 3. User Sign-In And Google Account Connection

Create a simple user flow:

1. User signs in to Monolith.
2. User opens Communication.
3. If Google Workspace is not connected, show **Connect Google Workspace**.
4. Start Google's server-side OAuth authorization-code flow.
5. Restrict normal organization connections to approved `@adarshshipping.in` accounts.
6. Show incremental consent only when an optional capability requires another scope.
7. Save encrypted refresh tokens only on the server.
8. Refresh access tokens safely with locking.
9. Allow the user to disconnect and revoke access.
10. Show clear states for connected, authorization expired, permission missing, temporarily unavailable, and disconnected.

The Monolith user must be mapped to:

- Google subject/user ID;
- verified work email;
- Workspace domain/customer ID where available;
- Monolith user ID;
- Monolith employee ID;
- organization ID;
- connection status;
- granted scopes;
- connected and last synchronized timestamps.

Never trust an email address typed into a form as proof of identity.

## 4. Workspace Home

Create one restrained, useful home screen instead of many disconnected products.

Show:

- connected Google account;
- unread mail count and recent important messages;
- recent direct chats and spaces;
- job spaces requiring attention;
- upcoming meetings;
- recent job documents;
- Mono AI entry point;
- Google service health/synchronization state;
- quick actions for Compose, New Chat, Open Job Space, Start Meeting, Upload Job Document, and Search.

Each section must have proper loading, empty, error, expired-authorization, and retry states.

## 5. Gmail Integration

Use Gmail API and the authenticated user's Google identity.

Minimum Monolith mail functions:

- list inbox threads;
- unread/read state;
- open a conversation;
- search using Gmail search syntax;
- compose and send;
- reply, reply all, and forward;
- drafts;
- attachments;
- labels;
- archive;
- star;
- mark read/unread;
- trash and restore;
- pagination;
- deep link to the same thread in native Gmail.

Do not try to reproduce every Gmail setting inside Monolith. Add **Open Full Gmail** for advanced Gmail functionality.

Safely parse MIME messages and sanitize HTML. Never directly inject untrusted email HTML into the Monolith page.

When an email is related to a Monolith job, allow an authorized user to:

- link the email/thread to a job;
- save selected attachments into the correct job Drive folder;
- create a job activity from the email;
- create a task or reminder;
- post a reference to the job's Google Chat space;
- open the linked job.

Store Google message/thread IDs and Monolith relationships, not unnecessary full mailbox copies.

## 6. Internal Employee Communication

Create a Slack/Teams/Zoho Cliq-style experience in Monolith, but use Google Chat as the communication backbone so messages are available in both locations.

Support:

- employee-to-employee direct messages;
- group conversations;
- public organization channels;
- private channels;
- department, branch, team, and project channels;
- named spaces;
- threaded messages;
- mentions;
- reactions where supported;
- file sharing through Google Drive;
- unread indicators;
- pinned or bookmarked items where supported or implemented as Monolith metadata;
- message reply, edit, and delete where supported and permitted;
- channel descriptions, topics, avatars, and member lists;
- channel owners, managers, members, and guests according to organization policy;
- notification preferences for all messages, mentions only, muted, and custom job alerts;
- browser and in-app notifications;
- online/reconnecting/synchronization indicators without inventing unsupported Google presence data;
- message search where supported;
- members and space managers;
- links to Monolith records;
- start or schedule a Google Meet call from a conversation;
- opening the same conversation in native Google Chat.

Avoid building a separate competing message database that can diverge from Google Chat.

Store only the mappings and operational metadata needed by Monolith:

- Google space ID;
- Google message/thread IDs;
- Monolith job or record relationship;
- synchronization cursor/subscription;
- delivery status;
- audit metadata;
- optional short search metadata only when approved.

Use Google Workspace Events API and Pub/Sub where supported for message, membership, reaction, and space updates. Implement subscription renewal, retries, idempotency, dead-letter handling, and reconciliation jobs.

If an API cannot provide a particular native Google Chat feature, show **Open in Google Chat** instead of faking it.

### 6.1 Monolith Messenger Interface

Build a complete communication workspace inside Monolith with a familiar three-panel desktop layout:

```text
Conversation Navigation | Active Conversation | Details/Files/People
```

The layout must collapse cleanly for tablets and mobile devices.

Conversation navigation must include:

- search;
- unread;
- mentions;
- saved items;
- direct messages;
- group chats;
- channels/spaces;
- job spaces;
- department spaces;
- archived or muted conversations;
- create message;
- create channel;
- user account and Google synchronization state.

The active conversation must include:

- channel or recipient header;
- member count;
- open in Google Chat;
- start Google Meet;
- searchable message timeline;
- day separators;
- unread divider;
- sender name and avatar;
- timestamps;
- edited state;
- threaded reply count;
- reactions;
- mentions;
- quoted replies;
- attachment previews;
- Drive file cards;
- Monolith record cards;
- retry state for failed outgoing messages;
- pagination or virtualized history;
- jump to newest message;
- typing draft preservation;
- composer with text, mentions, emoji, attachment, Drive picker, and send.

The details panel must include:

- channel information;
- members;
- shared files;
- links;
- pinned/saved items;
- related Monolith job, department, branch, or project;
- notification settings;
- channel management actions based on permission.

Do not copy Slack, Teams, Zoho, or Google's protected branding or exact interface. Use the Monolith design system to create a familiar enterprise messenger.

### 6.2 Conversation Types

Implement these conversation types:

1. **Direct Message**
   - one employee to another;
   - backed by the corresponding Google Chat DM space;
   - visible in both Monolith and Google Chat.

2. **Group Chat**
   - temporary or informal multi-person conversation;
   - backed by a Google Chat group conversation or named space according to API support;
   - members can be promoted into a persistent named channel when appropriate.

3. **Organization Channel**
   - persistent named space for general company communication;
   - examples: Announcements, General, IT Support, HR Updates;
   - posting may be restricted to authorized roles.

4. **Department/Branch Channel**
   - automatically or manually connected to Monolith departments and branches;
   - membership follows approved employee assignments;
   - membership changes must be synchronized and audited.

5. **Private Channel**
   - invite-only named space;
   - not discoverable to unauthorized users;
   - content and existence must not leak through Monolith search.

6. **Job Space**
   - persistent named space linked one-to-one with a Monolith job;
   - automatically provisioned and maintained as specified in the Job Spaces section.

### 6.3 Two-Way Synchronization

Messages must work in both directions:

```text
Monolith Messenger -> Google Chat API -> Google Chat/Spaces
Google Chat/Spaces -> Workspace Events/Pub/Sub -> Monolith Messenger
```

Required synchronization behavior:

- a message sent from Monolith is sent through the authenticated user where supported so the correct employee identity is shown;
- bot-generated alerts and Mono AI responses are clearly attributed to the Mono AI Chat app;
- messages sent in Google Chat appear in Monolith without manual page refresh;
- edits, deletions, reactions, memberships, and space updates synchronize where official APIs/events support them;
- event handlers are idempotent;
- missed events are recovered through reconciliation;
- ordering uses provider timestamps and stable provider IDs;
- temporary optimistic messages are replaced by confirmed Google resources;
- failures show retry or reconnect actions;
- Monolith stores provider identifiers and approved cache data, while Google Chat remains the canonical conversation record.

Use SSE, WebSocket, or the repository's existing realtime mechanism to update connected Monolith clients after server-side Google events are processed.

Do not claim perfect feature parity when Google limits an operation. Maintain a capability matrix and gracefully send the user to Google Chat for unsupported actions.

### 6.4 File Sharing

Users must be able to share:

- files uploaded from their device;
- existing files from the job Drive folder;
- existing Google Drive files;
- Monolith-generated documents;
- images and common office files;
- links to Monolith jobs, tasks, approvals, quotations, invoices, employees, and other permitted records.

For job spaces, default uploads to the correct job Drive subfolder rather than an unrelated personal Drive location.

Before sharing:

- validate conversation and job access;
- validate file type and size;
- scan or quarantine according to the security design;
- apply the minimum required Drive permission;
- prevent public-link sharing by default;
- log upload and sharing actions.

The UI must show upload progress, cancel, retry, preview, download, open in Drive, and remove/delete actions according to permission.

### 6.5 Employee Directory And Mentions

Connect the messenger to the existing Monolith employee directory.

Support:

- search by name, work email, employee code, department, branch, and role;
- start a DM from an employee profile;
- add employees to a group or channel;
- mention autocomplete;
- employee avatar and basic work profile;
- disabled/deactivated employee handling;
- automatic removal or archival actions during offboarding according to policy.

Do not reveal employees or conversation memberships outside the requesting user's allowed organization scope.

### 6.6 Notifications

Create a unified communication notification layer:

- unread message;
- direct message;
- mention;
- thread reply;
- reaction where useful;
- channel invitation;
- file shared;
- job alert;
- approval request;
- deadline reminder;
- meeting invitation;
- Mono AI response.

Route notifications to:

- Monolith notification center;
- browser push where configured;
- Google Chat DM;
- relevant Google Chat space;
- email only when explicitly configured.

Deduplicate the same event across channels and respect per-user notification preferences, muted conversations, working hours, and escalation rules.

### 6.7 Communication Administration

Administrators must be able to:

- create and manage organization channels;
- configure channel naming rules;
- assign channel owners/managers;
- control who can create public or private channels;
- configure default department and branch channels;
- configure announcement-only spaces;
- review failed synchronization;
- retry or reconnect spaces;
- review membership differences;
- archive channels;
- configure retention;
- configure external-user restrictions;
- inspect audit history;
- export approved metadata for compliance without bypassing Google retention rules.

Do not give administrators a hidden ability to read private messages unless the organization's Google Workspace and legal/compliance configuration explicitly authorizes that access and the capability is documented and audited.

## 7. Job Spaces

Google Chat job spaces are central to this implementation.

When an authorized Monolith user creates a job:

1. Complete the Monolith database transaction.
2. Enqueue a durable post-creation provisioning workflow.
3. Create or locate a named Google Chat space using a deterministic name such as:

```text
JOB-1556 | Customer Name | Shipment/Service
```

4. Add the appointed job manager and assigned employees.
5. Add the Mono AI Google Chat app.
6. Save the Google space ID and URL against the Monolith job.
7. Create the job Drive folder structure.
8. Post a structured welcome message with job number, customer, manager, status, important dates, Drive folder, and Monolith deep link.
9. Record every provisioning step in the audit log.

The workflow must be idempotent. Retrying it must never create duplicate spaces or duplicate Drive folders.

Each Monolith job page must include a **Communication** tab showing:

- linked Google Chat space;
- recent messages or activity supported by the API;
- members;
- unread/activity state where supported;
- post message;
- upload/share document;
- ask Mono AI;
- open in Google Chat;
- linked Drive folder;
- upcoming job meeting;
- provisioning or synchronization errors with retry.

Permissions:

- only users authorized for the job may see its Monolith communication view;
- only assigned or approved employees may be added to the Google Chat space;
- member changes must be audited;
- job deletion or archival must not silently destroy communication history;
- archive/retention behavior must follow organization policy and require explicit authorization.

## 8. Mono AI And Google Chat

Use one shared Mono AI Assistant core for both:

- the Monolith web assistant; and
- the Mono AI Google Chat app.

Do not create a second independent AI assistant.

Mono AI must:

- understand the current job when invoked inside a job space;
- answer questions only from data the requesting employee is allowed to access;
- summarize job updates;
- locate job documents;
- show pending tasks, approvals, deadlines, quotations, invoices, and operational status;
- create reminders or tasks after confirmation;
- post workflow alerts into the correct job space;
- provide deep links to Monolith records;
- use interactive cards for approvals and structured information;
- keep read operations separate from write operations;
- require explicit confirmation for impactful actions;
- audit prompts, tool calls, actor, target record, result, and failure without logging secrets or unnecessary sensitive content.

Identity must be resolved from verified Google Chat event identity and the linked Monolith account. Do not rely on display names or email text inside messages.

Support:

- direct messages with Mono AI;
- mentions inside job spaces;
- slash or quick commands;
- threaded responses;
- asynchronous processing for long operations;
- notifications and reminders;
- acknowledgement and approval actions;
- secure account-linking flow.

## 9. Job Document Management In Google Drive

Use a Google Shared Drive owned by Adarsh Shipping as the preferred storage location. Files in a Shared Drive are organization-owned and are safer than placing all company documents in one employee's personal My Drive.

Create a Communication Setting named:

```text
Workspace Automation Account
```

Default value:

```text
no-reply@adarshshipping.in
```

An authorized administrator must be able to change it after validation.

Use the configured account through approved OAuth/domain-wide delegation only where required. Never store its mailbox password.

Also configure:

- Shared Drive ID;
- root jobs folder ID;
- default folder template;
- upload limits;
- allowed file types;
- retention policy;
- sharing policy;
- external sharing policy;
- malware scanning strategy;
- document naming policy.

When a job is created, automatically create:

```text
Jobs/
  1556 - Customer Name/
    01 Customer KYC/
    02 Job Documents/
    03 User Uploads/
    04 Checklists/
    05 Customs and CHA/
    06 Invoices and Billing/
    07 Correspondence/
    08 Other Documents/
```

Administrators may edit the folder template for future jobs. Do not silently rename or recreate folders for existing jobs.

Save these identifiers on the Monolith job:

- Shared Drive ID;
- root job folder ID;
- each category folder ID;
- provisioning status;
- created-by service identity;
- created timestamp;
- last synchronization timestamp.

Document upload behavior:

- user selects a job and document category;
- enforce Monolith job permission before upload;
- upload directly or through a secure resumable server flow;
- save the file in the mapped Drive subfolder;
- save Drive file ID, web view URL, MIME type, size, checksum where available, category, uploader, job, version, and timestamps in Monolith;
- show upload progress, cancel, retry, and useful errors;
- prevent accidental duplicate uploads using checksum and filename/version rules;
- support preview, download, rename, move, replace/version, and delete based on permission;
- log every upload, download, share, move, rename, version, and deletion;
- never expose service-account credentials or unrestricted Drive URLs.

The job page must provide one clear **Documents** tab where users can browse only that job's folders and files without searching the entire company Drive.

## 10. Calendar And Google Meet

Use Google Calendar API and Google Meet APIs where appropriate.

Support:

- upcoming meetings;
- create a Calendar event with a Meet conference;
- invite employees;
- link a meeting to a job;
- post meeting details to the job space;
- open the event in Google Calendar;
- join through Google Meet;
- save meeting metadata and permitted artifacts against the job;
- reminders and attendance/event updates where officially supported.

Do not build a custom video-calling engine. Use Google Meet for the actual meeting.

## 11. Unified Search

Create a permission-aware search page that can search:

- Gmail using Gmail search;
- Google Chat spaces/messages where officially supported;
- Drive job documents;
- Monolith jobs and records.

Results must be grouped by source and show the job relationship when available.

Do not copy the full contents of every email, chat, or Drive file into Monolith merely to create search. Use provider APIs and store only approved indexes or metadata.

## 12. Administration

Create Communication Settings with role-based access:

- Google connection status;
- approved Workspace domain;
- OAuth configuration health;
- enabled APIs;
- Workspace Automation Account;
- Shared Drive and jobs root folder;
- job space naming template;
- job folder template;
- default space members;
- Mono AI Chat app configuration;
- notification routing;
- synchronization status;
- Pub/Sub and subscription health;
- retention;
- external sharing;
- upload limits;
- audit logs;
- test connection;
- retry failed provisioning;
- disconnect/revoke;
- credential rotation instructions.

Secrets must come from environment variables or the project's secret manager. Never save private keys or client secrets as plain database settings.

## 13. Suggested Data Model

Adapt names to the existing schema. Do not create duplicates if equivalent models already exist.

Potential models:

- `GoogleWorkspaceConnection`
- `GoogleOAuthGrant`
- `GoogleIdentityLink`
- `GoogleChatSpaceLink`
- `GoogleChatMessageLink`
- `GoogleWorkspaceSubscription`
- `JobCommunicationProfile`
- `JobDriveFolder`
- `JobDocument`
- `JobMeetingLink`
- `WorkspaceProvisioningRun`
- `WorkspaceDeliveryAttempt`
- `CommunicationAuditEvent`

Every model must include organization/tenant ownership, timestamps, appropriate unique constraints, and indexes.

Required uniqueness examples:

- one active Workspace identity link per Google subject and tenant;
- one active job communication profile per job;
- one job-space mapping per job;
- one root Drive folder mapping per job;
- unique inbound event ID/idempotency key;
- unique provider resource ID where applicable.

## 14. Background Workflows

Use the repository's existing job runner or queue. If none exists, introduce the smallest reliable queue appropriate for the deployment.

Required durable jobs:

- provision job Chat space;
- provision job Drive folders;
- add/remove space members;
- post job notification;
- save Gmail attachment to Drive;
- renew Workspace event subscriptions;
- synchronize/reconcile provider state;
- refresh OAuth tokens;
- retry failed deliveries;
- clean up expired idempotency and temporary upload records.

Use bounded retries with exponential backoff. Separate retryable provider failures from permission, invalid configuration, and business-rule failures.

Do not hold a database transaction open while calling Google APIs.

## 15. Security And Permissions

Mandatory:

- server-side authorization on every action;
- least-privilege OAuth scopes;
- encrypted refresh tokens;
- no Google tokens in browser storage;
- CSRF-safe OAuth state;
- secure redirect URI validation;
- webhook/request verification;
- idempotency and replay protection;
- tenant isolation;
- job-level RBAC;
- safe HTML email rendering;
- file type and size validation;
- malware scanning or quarantine design;
- rate limiting;
- audit logging;
- secret redaction;
- retention and deletion rules;
- external sharing disabled by default;
- no public Drive links by default.

Domain-wide delegation is powerful. Use it only for documented administrative automation, approve only the required scopes, impersonate the configured automation account where necessary, and document revocation.

## 16. Reliability And UX

Implement:

- optimistic updates only where rollback is reliable;
- clear synchronization indicators;
- offline/reconnecting states;
- token-expired recovery;
- API quota/rate-limit handling;
- partial provisioning state;
- manual retry for authorized admins;
- accessible keyboard navigation;
- responsive desktop and mobile layout;
- no duplicate page scrollbars;
- consistent page padding;
- sticky header and breadcrumb using existing patterns;
- useful toasts and error messages;
- dark/light theme compliance.

The module should feel simple even though the integration is complex.

## 17. Testing

Add unit, integration, permission, and end-to-end tests for:

- OAuth state and callback validation;
- domain restriction;
- token encryption and refresh locking;
- Gmail list/read/send/reply flows;
- job-email linking;
- Chat identity mapping;
- direct message and named-space handling;
- job-space provisioning and idempotency;
- Drive folder provisioning and idempotency;
- upload category routing;
- unauthorized job access;
- member synchronization;
- Mono AI permission enforcement;
- webhook verification and replay rejection;
- subscription renewal;
- retries and reconciliation;
- Calendar event and Meet link creation;
- audit events;
- disconnect/revoke;
- loading, empty, expired, and failure UI states.

Mock Google APIs for automated tests. Provide a documented manual staging checklist using real test users, one test job, one test Chat space, and one test Shared Drive folder.

## 18. Delivery Order

Implement in this order:

1. Repository discovery and architecture document.
2. Google OAuth and identity linking.
3. Workspace Home and navigation replacement.
4. Gmail minimum viable workflows.
5. Shared Drive job folders and document upload.
6. Google Chat DM and named-space integration.
7. Automatic job-space and folder provisioning.
8. Job Communication and Documents tabs.
9. Mono AI Google Chat bridge.
10. Calendar and Meet.
11. Unified search.
12. Admin settings, audit, health, and reconciliation.
13. Tests, migration verification, production build, and staging checklist.

## 19. Required Environment Configuration

Add documented placeholders to `.env.example`, adapting names to repository conventions:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
GOOGLE_WORKSPACE_DOMAIN=adarshshipping.in
GOOGLE_WORKSPACE_CUSTOMER_ID=
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=
GOOGLE_WORKSPACE_AUTOMATION_USER=no-reply@adarshshipping.in
GOOGLE_SHARED_DRIVE_ID=
GOOGLE_JOBS_ROOT_FOLDER_ID=
GOOGLE_CHAT_APP_PROJECT_NUMBER=
GOOGLE_CHAT_APP_CREDENTIALS=
GOOGLE_PUBSUB_TOPIC=
GOOGLE_PUBSUB_SUBSCRIPTION=
GOOGLE_WEBHOOK_AUDIENCE=
GOOGLE_TOKEN_ENCRYPTION_KEY=
MONOLITH_PUBLIC_URL=
```

Do not commit real credentials.

## 20. Acceptance Criteria

The work is complete only when:

1. An `@adarshshipping.in` employee can connect Google Workspace through OAuth.
2. The employee can access practical Gmail workflows from Monolith and open advanced features in native Gmail.
3. Employees can use direct and group communication backed by Google Chat.
4. The same job space can be used in Monolith and native Google Chat.
5. Creating a job provisions exactly one Chat space and one Drive folder tree.
6. Job 1556 can be opened and its complete communication and document area accessed without searching unrelated folders.
7. Documents upload into the correct job subfolder and remain accessible in Drive.
8. The automation identity defaults to `no-reply@adarshshipping.in` and can be changed by an authorized administrator.
9. Mono AI works in Monolith and Google Chat using the same permission-aware assistant core.
10. Meetings are created through Google Calendar/Meet and linked to jobs.
11. All sensitive actions are permission-checked and audited.
12. OAuth tokens and service credentials are protected.
13. Provisioning is idempotent and failures can be retried safely.
14. The old disconnected Communication routes are removed or migrated.
15. Tests pass, migrations apply cleanly, and the production build succeeds.
16. Google Cloud and Workspace administrator setup is fully documented.

## Final Engineering Rules

- Do not stop at a plan.
- Treat this document as the only product specification for the Communication module.
- Delete rejected Communication-specific functionality instead of recreating it.
- Do not leave old and new Communication systems running side by side.
- Do not use the existing Communication UI or workflows as implementation references.
- Preserve shared infrastructure only after proving it is used outside the rejected module.
- Produce and complete `docs/communication-module-removal-map.md`.
- Include deleted routes, files, models, permissions, jobs, and tests in the final report.
- Do not use mock data in production paths.
- Do not hardcode users, roles, job numbers, Google resource IDs, or folder IDs.
- Do not duplicate existing Monolith business logic.
- Do not falsely claim unsupported API parity.
- Do not weaken security to simplify setup.
- Do not create duplicate Chat spaces or Drive folders during retries.
- Do not store Google passwords.
- Do not use IMAP/POP as the primary Google Workspace solution.
- Do not claim Gmail, Chat, Drive, or Meet can be fully embedded when Google does not support it.
- Prefer a simple, reliable user flow over a large collection of shallow screens.
- Run formatting, linting, type checking, tests, migrations, and production build.
- Fix errors found during verification.
- Finish with a concise report listing changed files, migrations, tests, setup still requiring a Workspace administrator, known provider limitations, and the exact real-world verification steps performed.

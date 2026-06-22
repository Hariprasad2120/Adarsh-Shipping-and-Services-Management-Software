# Antigravity Master Prompt: Monolith AI Assistant and Google Chat Integration

You are a principal software architect and senior full-stack engineer with expert knowledge of Google Chat apps, Google Workspace APIs, OAuth 2.0, service accounts, Pub/Sub, event-driven systems, AI assistants, secure tool calling, multi-tenant SaaS, Next.js, TypeScript, PostgreSQL, Prisma, Redis, background queues, webhooks, and enterprise authorization.

Your task is to inspect the complete existing Monolith Engine repository and implement a production-ready, two-way integration between:

1. the existing **Monolith AI Assistant** inside Monolith Engine; and
2. a corresponding **Monolith AI Google Chat app** available in Google Chat, including Google Chat shown inside Gmail.

Users must be able to communicate with the same Monolith AI Assistant from either Monolith Engine or Google Chat. The Google Chat app must also send operational notifications, job alerts, reminders, approval requests, summaries, and workflow updates to the correct users and Google Chat spaces.

This is not a mock chatbot or a simple incoming webhook. Build a secure, stateful, permission-aware, bidirectional communication and workflow system using the official Google Chat API, Google Chat interaction events, Google Workspace Events API where appropriate, Google Cloud Pub/Sub, and the existing Monolith backend.

Do not stop after writing a plan, creating a chatbot UI, returning hardcoded replies, or posting one-way test notifications. Implement the system end to end, configure its services, add migrations, connect it to the existing AI assistant and Monolith modules, add tests, run the application, and verify real Google Chat workflows with a documented test account and test space.

## 1. Product Goal

Build one unified assistant with two interaction channels:

- **Monolith channel:** the assistant already available inside Monolith Engine.
- **Google Chat channel:** a Google Chat app named **Monolith AI Assistant**.

The channels must share:

- authenticated user identity;
- tenant and company context;
- role and permission checks;
- conversation history where policy allows;
- AI model/provider configuration;
- tool registry;
- business workflows;
- notifications;
- approval state;
- audit logs;
- job/department/project context;
- links to Monolith records.

The Google Chat app must support:

- direct messages with the bot;
- adding the bot to named Google Chat spaces;
- mentioning the bot in spaces;
- slash commands and quick commands;
- natural-language questions;
- interactive cards;
- buttons and selection controls;
- dialogs/forms;
- threaded responses;
- proactive notifications;
- scheduled alerts and reminders;
- approval and acknowledgement actions;
- links that open the exact related Monolith page;
- secure retrieval and mutation of Monolith data based on user permissions.

Google Chat is an additional interface to Monolith. It must not become a separate source of truth or duplicate business logic.

## 2. Mandatory Repository Discovery

Before editing:

1. Read the complete repository structure.
2. Identify:
   - framework and routing;
   - authentication and session system;
   - organization/tenant model;
   - users, employees, roles, departments, branches, teams, and permissions;
   - Monolith AI Assistant implementation;
   - AI provider abstraction;
   - prompts, memory, tools, agents, RAG, embeddings, and conversation storage;
   - notification service;
   - task/to-do system;
   - job/project/shipment/work-order model;
   - CRM, HRMS, AMS, accounting, quotation, invoice, document, and approval modules;
   - background jobs, cron, queues, retries, and schedulers;
   - database and ORM;
   - audit logging;
   - event bus;
   - WebSocket/SSE infrastructure;
   - file storage;
   - secrets management;
   - tests and deployment platform.
3. Reuse existing business services and permission functions. Do not reimplement business rules inside Chat event handlers.
4. Identify every existing notification type and which ones are suitable for DMs, team spaces, job spaces, or both.
5. Create `docs/google-chat-monolith-ai-implementation.md` with:
   - current architecture findings;
   - proposed architecture;
   - capability matrix;
   - Google Cloud setup;
   - authentication model;
   - identity mapping;
   - event flows;
   - data model;
   - notification routing;
   - AI tool permissions;
   - security threat model;
   - test strategy;
   - phased implementation checklist.

After creating the document, immediately continue with implementation.

## 3. Required Architecture

Create a channel-neutral assistant core:

```text
Monolith Web Assistant ─┐
                       ├─> Assistant Gateway
Google Chat App ───────┘       |
                               ├─ Identity and authorization
                               ├─ Conversation service
                               ├─ AI orchestration
                               ├─ Monolith tool registry
                               ├─ Workflow/approval engine
                               ├─ Notification router
                               └─ Audit and observability
```

Implement these conceptual services using the repository's established conventions:

- `AssistantGateway`
- `AssistantIdentityResolver`
- `AssistantConversationService`
- `AssistantOrchestrator`
- `AssistantToolRegistry`
- `AssistantPermissionGuard`
- `GoogleChatInteractionService`
- `GoogleChatMessageRenderer`
- `GoogleChatSpaceService`
- `GoogleChatIdentityLinkService`
- `GoogleChatNotificationRouter`
- `GoogleChatSubscriptionService`
- `GoogleChatCommandService`
- `GoogleChatApprovalService`
- `GoogleChatDeliveryService`
- `GoogleChatAuditService`

Google-specific handlers must translate Chat events into channel-neutral assistant requests. The same assistant orchestration and Monolith tools must serve both the web assistant and Chat app.

Do not create a second independent AI assistant, duplicate prompts, or maintain separate business logic for Google Chat.

## 4. Google Chat Application

Create and configure an official Google Chat app:

- Display name: `Monolith AI Assistant`
- Description explaining that it securely connects authorized employees to Monolith Engine.
- Company-approved avatar.
- Supports direct messages.
- Can join spaces and group conversations.
- Supports interaction events through a secure HTTPS endpoint or approved Pub/Sub architecture.
- Supports slash commands and quick commands.
- Supports an app home/dashboard if suitable.
- Can send proactive messages as the Chat app.
- Is prepared for internal organization deployment through Google Workspace Marketplace or administrator-controlled installation.

Use separate Google Cloud configurations for:

- development;
- staging;
- production.

Do not share service-account keys or credentials across environments.

Provide a complete administrator setup guide covering:

- Google Cloud project;
- enabling Google Chat API;
- enabling Google Workspace Events API when used;
- enabling Pub/Sub;
- service account;
- OAuth consent screen;
- required OAuth scopes;
- Chat API configuration;
- app name/avatar/description;
- direct-message and space support;
- interaction endpoint;
- command definitions;
- Marketplace SDK configuration;
- internal organization publication;
- administrator allowlisting/installation;
- test users;
- domain restrictions;
- secrets and environment variables.

## 5. Authentication and Identity Linking

The Chat app must never trust an email address or display name supplied in message text.

Use verified Google Chat event identity and Google OAuth/Workspace identity to map the Google user to a Monolith user.

Implement:

- `googleUserResourceName` mapping.
- Google Workspace email mapping where legitimately available.
- Google Workspace customer/domain ID.
- Monolith tenant ID.
- Monolith user/employee ID.
- link status and verification status.
- linked-at and last-used timestamps.
- revocation and unlinking.

Identity-linking flow:

1. User opens a DM with the Monolith Chat app.
2. If no valid mapping exists, return a card with **Connect Monolith Account**.
3. Open an external browser authorization page hosted by Monolith.
4. Require the user to authenticate to Monolith.
5. Validate a short-lived, signed, single-use linking token containing the Google Chat user and expected tenant/domain.
6. Show exactly which Google account and Monolith account are being linked.
7. Save the mapping only after explicit confirmation.
8. Return a success message in Chat.

Support automatic matching only when:

- the Google Workspace domain is approved for the tenant;
- the verified Google email exactly matches a verified Monolith work email;
- company security policy permits automatic matching.

Require confirmation even when automatic matching succeeds.

Never:

- ask users for Google passwords;
- store raw Google session cookies;
- use Chat display names as identity;
- allow one Google identity to silently bind to multiple tenant users;
- expose whether another user's account exists.

## 6. Interaction Types

Handle official Google Chat interaction events:

- user starts a DM;
- user sends a message to the bot;
- user mentions the bot in a space;
- user invokes a slash command;
- user invokes a quick command;
- user clicks a card button;
- user changes a card selection/input;
- user submits a dialog;
- bot is added to a space;
- bot is removed from a space;
- app home opens or updates where supported.

Validate every inbound request according to Google's current Chat app authentication guidance. Reject forged, replayed, expired, malformed, or unauthorized events.

Respond within Google's interaction timeout. For longer AI or business operations:

1. acknowledge immediately with a short processing response;
2. enqueue an asynchronous job;
3. continue the operation safely;
4. post or update the final response in the correct DM, space, and thread;
5. show a useful failure message when processing fails.

Implement idempotency using event IDs, message IDs, action IDs, and request fingerprints.

## 7. Natural-Language AI Assistant

Users must be able to ask the bot questions such as:

- “What tasks are pending for me today?”
- “Show my overdue approvals.”
- “What is the status of shipment ASS-2026-0042?”
- “Summarize updates for this job.”
- “Who is handling the Chennai customs clearance?”
- “Show pending quotations for customer ABC.”
- “What appraisals require my review?”
- “Create a follow-up task for tomorrow at 10 AM.”
- “Remind this space two hours before the documentation deadline.”
- “Post today’s job summary in this space.”
- “Notify me when this quotation is approved.”
- “Link this space to job ASS-2026-0042.”
- “Create an incident from this conversation.”

The assistant must:

- resolve the authenticated user;
- resolve tenant and channel;
- determine DM or space context;
- retrieve only authorized Monolith data;
- use existing Monolith tools/services;
- ask for clarification when identifiers are ambiguous;
- present concise Chat-friendly responses;
- use cards for structured records;
- include deep links into Monolith;
- use threads for follow-up responses;
- preserve conversation continuity;
- distinguish read operations from mutations;
- require confirmation for impactful actions;
- never invent business data.

For requests outside the user's access:

- do not leak whether hidden records exist;
- respond with a neutral permission error;
- provide an escalation/contact route where configured.

## 8. Conversation and Context Model

Create a channel-neutral conversation model supporting:

- direct-message conversations;
- space conversations;
- Chat threads;
- Monolith web assistant conversations;
- optional continuity between web and Chat;
- context expiry;
- explicit reset;
- data retention settings.

Map:

- Google space resource name;
- Google thread resource name/key;
- Google message resource name;
- Monolith conversation ID;
- participant/user ID;
- tenant ID;
- related Monolith records;
- job/project context;
- source channel;
- message direction;
- delivery state.

Context rules:

- A DM may use the user's personal assistant context.
- A space conversation must use space-safe context and must not reveal private DM information.
- A thread may inherit a linked job or record context.
- The assistant may use space history only when Google permissions, Monolith policy, and retention settings permit it.
- Do not feed unrelated private space content to the AI.
- Provide `/reset` and `/context` commands.
- Clearly show when a space is linked to a Monolith job/project.

## 9. Slash and Quick Commands

Implement discoverable commands. Adjust exact names to Google Chat's current command configuration requirements.

Required commands:

- `/help` – show supported capabilities.
- `/connect` – connect or review Monolith account linkage.
- `/status` – show Monolith and Chat connection health.
- `/tasks` – show the user's pending tasks.
- `/approvals` – show pending approvals.
- `/job <job-number>` – show job details.
- `/search <query>` – search authorized Monolith records.
- `/create-task` – open a dialog to create a task.
- `/remind` – open a reminder dialog.
- `/link-job <job-number>` – link the current space to a job.
- `/unlink-job` – remove the current space/job association.
- `/subscribe` – configure notifications for the current DM or space.
- `/unsubscribe` – remove notification subscriptions.
- `/summary` – summarize permitted updates for the current context.
- `/feedback` – submit assistant feedback.
- `/reset` – reset current assistant context.
- `/privacy` – show data use and retention information.

Commands that alter shared space configuration must require a space manager or a Monolith role with equivalent authority.

## 10. Interactive Cards and Dialogs

Use Google Chat cards and dialogs for structured workflows.

Create reusable renderers for:

- job status;
- shipment milestone;
- assigned task;
- overdue task;
- reminder;
- approval request;
- quotation;
- invoice/payment alert;
- leave request;
- appraisal review;
- incident/escalation;
- daily summary;
- connection status;
- error/retry state.

Cards should contain only necessary information and may include:

- title;
- status;
- priority/severity;
- owner;
- customer/employee;
- due date;
- latest update;
- action buttons;
- open-in-Monolith link;
- acknowledge;
- approve;
- reject;
- assign to me;
- mark complete;
- snooze;
- view details;
- mute this alert;

Use dialogs for:

- creating a task;
- creating a reminder;
- choosing a job;
- configuring a subscription;
- approval comments;
- rejection reasons;
- incident creation;
- feedback;
- notification preferences.

All submitted values must be server-validated. Never trust hidden card parameters for authorization or record ownership.

## 11. Job Spaces

Implement a **Job Space Mapping** feature connecting a Monolith job/project/shipment/work order to a Google Chat space.

Support:

- linking an existing Chat space to a Monolith job;
- creating a named Chat space for a job where the authenticated user and API permissions permit it;
- adding the Monolith Chat app to the space;
- validating that the app is a member before posting;
- assigning one primary job and optionally additional related records;
- showing linked-space status inside Monolith;
- opening the Chat space from the Monolith job page;
- opening the Monolith job from the Chat space;
- unlinking without deleting the job or Chat space;
- archived/completed-job behavior;
- duplicate mapping prevention;
- space rename handling;
- app-removal handling.

Suggested space naming convention must be configurable, for example:

`JOB-{jobNumber} | {customerShortName} | {routeOrDepartment}`

Do not rename or create spaces without user confirmation and adequate permission.

Store:

- tenant ID;
- Monolith job/project ID;
- Google space resource name;
- display name;
- space type;
- mapping status;
- bot membership status;
- created-by/linked-by;
- notification profile;
- thread keys by notification category;
- last verified timestamp.

## 12. Notification Routing

Build a central notification router that receives normalized Monolith domain events and decides:

- whether a Google Chat notification should be sent;
- which user DM or job/team space receives it;
- whether the message starts a thread or replies to an existing thread;
- which template/card to use;
- whether the event should be bundled;
- quiet-hours behavior;
- priority and escalation;
- deduplication;
- acknowledgement requirements.

Potential event sources:

- new task assigned;
- task due soon;
- overdue task;
- reminder triggered;
- job created;
- job assigned;
- job status changed;
- shipment milestone;
- documentation deadline;
- customs/port delay;
- missing document;
- customer response required;
- quotation submitted;
- quotation approval requested;
- quotation approved/rejected/rework required;
- sales-order creation;
- invoice generated;
- payment overdue;
- leave request;
- HR approval;
- attendance anomaly;
- appraisal started;
- reviewer response required;
- appraisal meeting scheduled;
- appraisal arrear posting required;
- incident raised;
- SLA breached;
- system integration failure;
- AI-generated daily/weekly summary.

Routing hierarchy:

1. explicit event routing rule;
2. linked job space;
3. mapped department/team space;
4. responsible user's DM;
5. configured fallback administrators;

Do not post confidential employee, appraisal, payroll, customer, financial, or personally identifiable information to shared spaces unless explicitly allowed by policy and record-level permissions.

## 13. Alerts, Reminders, and Escalations

Implement:

- one-time reminders;
- recurring reminders;
- event-relative reminders;
- due-date reminders;
- inactivity reminders;
- SLA warning and breach alerts;
- acknowledgement deadlines;
- escalation chains;
- quiet hours;
- time zones;
- business-day calendars;
- holiday handling;
- snooze;
- cancellation;
- rescheduling;
- duplicate suppression.

Examples:

- Post to a job space one day and two hours before a documentation deadline.
- DM the assigned employee when a task becomes overdue.
- Escalate to the manager if no acknowledgement occurs within the configured period.
- Post a morning job summary to each active job space.
- Post an end-of-day pending-items digest to department spaces.
- Notify approvers with Approve, Reject, and Open buttons.

Reminder and notification schedules must be stored in Monolith and executed by the established queue/scheduler. Do not depend on an open browser.

Use stable thread keys so all updates about the same workflow stay in one Chat thread where practical.

## 14. Approvals and Actions From Google Chat

Allow approved Monolith workflows to be acted upon from Chat:

- approve;
- reject;
- return for rework;
- acknowledge;
- assign;
- mark complete;
- snooze;
- add a comment;
- set a follow-up date;
- escalate.

Before executing:

1. re-fetch the latest Monolith record;
2. verify authenticated identity;
3. verify tenant;
4. verify role and record-level permission;
5. verify valid workflow transition;
6. detect stale card/version;
7. request confirmation when required;
8. execute through the existing domain service;
9. record an audit event;
10. update the Chat card with the final state.

Sensitive or high-value actions may require the user to open Monolith and reauthenticate. The Chat card should provide a signed, short-lived deep link rather than bypassing policy.

Never place reusable access tokens or authorization decisions in card parameters.

## 15. Two-Way Message and Event Flow

### Google Chat to Monolith

1. Receive authenticated interaction or subscribed event.
2. Validate and deduplicate it.
3. Resolve tenant, user, space, thread, and linked records.
4. Store normalized inbound-message metadata.
5. Apply retention/redaction policy.
6. Send the request to the shared Assistant Gateway.
7. Run authorized AI tools.
8. render a Chat-compatible response;
9. send/update the response;
10. audit all business actions.

### Monolith to Google Chat

1. A Monolith domain event is emitted.
2. Notification router evaluates policies and subscriptions.
3. Resolve target DM/space/thread.
4. Confirm app membership and destination validity.
5. Render text/card payload.
6. enqueue delivery;
7. send using Google Chat API;
8. store Google message resource name and delivery status;
9. retry transient errors;
10. surface permanent failures to administrators.

### Google Chat Events to Monolith

Where needed and permitted, subscribe through Google Workspace Events API for:

- new/updated/deleted messages;
- reactions;
- memberships;
- space changes.

Use Pub/Sub as the notification endpoint. Renew subscriptions before expiration, process events idempotently, and handle lifecycle events.

Only subscribe to events required by a defined product feature. Basic bot mentions and commands should use normal Chat interaction events rather than excessive space monitoring.

## 16. AI Tool Registry

Expose Monolith capabilities to the AI through typed, allowlisted tools rather than arbitrary database queries.

Initial read tools:

- `get_my_tasks`
- `get_pending_approvals`
- `get_job`
- `search_jobs`
- `get_job_updates`
- `get_customer`
- `get_employee_directory_entry`
- `get_quotation`
- `get_invoice_status`
- `get_leave_request`
- `get_appraisal_status`
- `get_notifications`

Initial write tools:

- `create_task`
- `update_task`
- `acknowledge_alert`
- `create_reminder`
- `link_space_to_job`
- `subscribe_space`
- `approve_workflow_item`
- `reject_workflow_item`
- `add_record_comment`
- `create_incident`

Every tool must define:

- typed input schema;
- typed output schema;
- required permissions;
- allowed channels;
- DM/space privacy classification;
- confirmation requirement;
- idempotency behavior;
- audit category;
- timeout;
- retry policy;
- safe user-facing errors.

The language model must never choose tenant IDs, user IDs, permissions, or trusted ownership fields. Inject them from the authenticated server context.

## 17. Data Model

Fit the schema to the repository's conventions. At minimum consider:

- `GoogleChatAppInstallation`
- `GoogleChatUserLink`
- `GoogleChatSpace`
- `GoogleChatSpaceMemberState`
- `GoogleChatRecordLink`
- `GoogleChatConversation`
- `GoogleChatMessageReference`
- `GoogleChatCommandExecution`
- `GoogleChatSubscription`
- `GoogleChatNotificationPreference`
- `GoogleChatNotificationRoute`
- `GoogleChatDelivery`
- `GoogleChatInteractionEvent`
- `GoogleChatApprovalAction`
- `GoogleWorkspaceEventSubscription`
- `AssistantChannelSession`
- `AssistantChannelMessage`
- `AssistantToolExecution`

Use internal UUIDs and Google resource names as external identifiers.

Add uniqueness constraints for:

- tenant and Google user;
- tenant and Google space;
- Google interaction event ID;
- outbound notification idempotency key;
- Google message resource name;
- active job-space mapping where the business rule requires uniqueness.

Avoid storing full Chat history unless required. Store minimal metadata, redacted content, summaries, or encrypted message content based on configurable retention.

## 18. Permissions and Privacy

Google Chat membership does not automatically grant access to Monolith records.

Monolith access rules remain authoritative:

- user role;
- department;
- branch;
- reporting hierarchy;
- record ownership;
- assignment;
- module permission;
- field-level restrictions;
- workflow permissions;
- tenant boundary.

Space-response policy:

- Personal information belongs in DM.
- Shared operational information may be posted to an approved job space.
- Confidential details must be redacted or replaced with an Open in Monolith button.
- The assistant must not answer requests about records unavailable to every relevant recipient when a response would expose private content.

For AI responses in spaces:

- identify the requesting user;
- apply their permissions;
- apply the space's classification policy;
- use the stricter result;
- avoid using private DM context.

## 19. Security

Mandatory:

- Verify all Google Chat requests and event sources.
- Use HTTPS only.
- Store secrets in the configured secret manager.
- Prefer workload identity or keyless authentication where deployment supports it.
- If a service-account key is unavoidable, encrypt it, restrict it, rotate it, and never commit it.
- Least-privilege OAuth scopes.
- Tenant/domain allowlists.
- Replay protection.
- Idempotency.
- Rate limiting per user, space, tenant, and command.
- Prompt-injection defenses.
- Tool allowlisting.
- Output and card escaping.
- No secrets in AI context.
- No raw provider errors shown to users.
- No sensitive data in logs.
- Signed, short-lived deep links.
- CSRF protection for account linking.
- SSRF protection for fetched links.
- Attachment restrictions.
- Audit logs for identity linking, queries involving sensitive records, tool actions, approvals, subscriptions, and notification delivery.

Create a threat model covering:

- forged Chat requests;
- malicious space members;
- prompt injection;
- cross-tenant leakage;
- private-to-space context leakage;
- privilege escalation through card actions;
- stale approval cards;
- replayed actions;
- bot added to an unauthorized space;
- service-account compromise;
- leaked Pub/Sub events;
- notification spam;
- AI hallucinated record IDs;
- deep-link theft.

## 20. Reliability and Delivery

Use the existing queue system or add a production-grade queue matching the stack.

Implement:

- transactional outbox for important Monolith events;
- idempotent consumers;
- exponential backoff with jitter;
- dead-letter handling;
- retry limits;
- quota/rate-limit handling;
- ordered processing where workflow order matters;
- delivery status;
- correlation IDs;
- health checks;
- subscription renewal;
- stale-space verification;
- app-membership verification;
- administrator retry controls.

Delivery states:

- queued;
- processing;
- sent;
- updated;
- acknowledged;
- failed-retryable;
- failed-permanent;
- suppressed;
- cancelled.

Do not lose critical approval, deadline, or SLA notifications because of a temporary Google API failure.

## 21. Notification Administration UI

Create a Google Chat integration settings area in Monolith:

- connection status;
- Chat app configuration health;
- linked users;
- unmatched users;
- linked spaces;
- job-space mappings;
- department/team-space mappings;
- notification routing rules;
- templates;
- quiet hours;
- escalation rules;
- subscriptions;
- failed deliveries;
- retry controls;
- event and audit history;
- permission diagnostics;
- subscription expiration;
- test-message action;
- disable/enable integration;
- unlink/revoke controls.

Per-user settings:

- enable/disable DMs;
- notification categories;
- immediate vs digest;
- quiet hours;
- timezone;
- reminder defaults;
- privacy preferences;
- linked Google identity;
- disconnect.

Per-space settings:

- linked records/jobs;
- permitted notification categories;
- severity threshold;
- digest schedule;
- mention policy;
- confidential-data policy;
- thread behavior;
- managers allowed to configure.

## 22. Chat UX

Responses should be concise and designed for Chat, not copied from large Monolith pages.

Use:

- short text for simple answers;
- cards for structured information;
- dialogs for multi-field input;
- threads for continuing workflows;
- DMs for private information;
- clear status and error messages;
- buttons only for valid current actions;
- disabled/replaced cards after completion where supported;
- deep links for complex screens.

Show:

- assistant processing state;
- insufficient permission;
- connection required;
- ambiguous record choice;
- stale action;
- temporary failure;
- retry option;
- final confirmation.

Do not expose internal IDs when a human-readable identifier exists.

## 23. Suggested Workflows

Implement and test these end-to-end examples.

### Personal assistant

User DMs:

`Show my pending work for today`

Bot returns grouped task and approval cards with Open and Complete/Approve actions where permitted.

### Job-space notification

A document deadline changes in Monolith.

The router posts a card to the linked job space in the existing documentation thread and mentions responsible users according to policy.

### Reminder

User invokes `/remind` in a job space, completes a dialog, and creates a reminder tied to that space and job.

At the scheduled time, the bot posts the reminder with Acknowledge and Snooze actions.

### Approval

A quotation requires a manager's approval.

The bot sends the manager a DM card. The manager can open details, approve, reject with reason, or open Monolith. The Chat card updates after the workflow action.

### AI question in a space

User asks:

`@Monolith AI summarize pending issues for this job`

The bot resolves the linked job, applies user and space permissions, and replies in a thread with a concise summary and record links.

### Space linking

A manager uses `/link-job ASS-2026-0042`.

The bot validates the job, asks for confirmation, saves the mapping, configures permitted notification defaults, and posts a success card.

## 24. Testing

Add:

- unit tests for identity resolution, permission intersection, event validation, routing rules, tool schemas, card rendering, reminder calculation, redaction, and idempotency;
- integration tests for interaction events, async AI responses, message creation, card actions, dialogs, Pub/Sub events, subscription renewal, job-space mapping, and domain event delivery;
- database tests for tenant isolation and uniqueness;
- security tests for forged events, replay, cross-tenant IDs, stale cards, unauthorized actions, prompt injection, and malicious inputs;
- end-to-end tests for DMs, space mentions, commands, dialogs, job linking, reminders, notifications, approvals, and unlinking;
- load tests for alert bursts and daily digests;
- retry/dead-letter tests;
- accessibility/content checks for cards and dialogs.

Use mocked Google services for automated tests. Use dedicated development/staging Chat apps and test spaces for documented smoke tests.

## 25. Observability

Add dashboards/metrics for:

- inbound interaction count;
- AI response latency;
- tool execution latency;
- response timeout rate;
- outbound deliveries;
- delivery failures;
- quota/rate-limit failures;
- dead-letter count;
- identity-link failures;
- unauthorized request count;
- active users/spaces;
- subscription expiry;
- notification acknowledgement time;
- AI/tool errors by category.

Use structured logs with correlation IDs, but redact message content and sensitive record data.

## 26. Delivery Phases

Implement in this order:

1. Repository audit and architecture documentation.
2. Shared assistant gateway and channel-neutral conversation/tool interfaces.
3. Google Cloud/Chat app configuration and secure event endpoint.
4. Identity linking and direct-message assistant.
5. Space membership, mentions, threads, commands, cards, and dialogs.
6. Job-space mapping and Monolith deep links.
7. Monolith event outbox and proactive notification delivery.
8. Reminders, recurring alerts, digests, escalation, and acknowledgement.
9. Approval and workflow actions from Chat.
10. Google Workspace Events subscriptions only for features that require them.
11. Administration UI, auditing, observability, security hardening, and full testing.

Keep incomplete features behind feature flags. Never display a button that does not perform its stated action.

## 27. Required Deliverables

Deliver:

- complete production code;
- database migrations;
- environment-variable template;
- Google Cloud setup guide;
- Google Chat API configuration guide;
- internal Marketplace deployment guide;
- identity-linking documentation;
- architecture diagrams;
- event-flow diagrams;
- command reference;
- notification-routing matrix;
- security threat model;
- operational runbook;
- test suite and test report;
- administrator troubleshooting page;
- final implementation summary.

Required documents:

- `docs/google-chat-monolith-ai-implementation.md`
- `docs/google-chat-admin-setup.md`
- `docs/google-chat-command-reference.md`
- `docs/google-chat-notification-routing.md`
- `docs/google-chat-security.md`
- `docs/google-chat-operations-runbook.md`

## 28. Acceptance Criteria

The implementation is complete only when:

- An authorized employee can find and DM the Monolith AI Assistant in Google Chat.
- The user can securely link their Google identity to their Monolith identity.
- The Chat bot and Monolith web assistant use the same assistant orchestration and business tools.
- Users can ask authorized Monolith questions in DMs.
- Users can add the bot to an approved space and mention it.
- Space replies remain in the correct thread.
- Managers can link a Chat space to a Monolith job.
- Monolith can post job alerts, reminders, and workflow updates to the linked space.
- Users can configure subscriptions and notification preferences.
- Approvals and acknowledgements work from interactive cards with full permission checks.
- Long AI requests finish asynchronously without timing out the interaction.
- Duplicate events do not create duplicate actions or messages.
- Failed deliveries retry and are visible to administrators.
- Private information is not leaked into spaces.
- Every data access and business mutation respects Monolith permissions.
- Critical actions are audited.
- The app is deployable internally through the organization's approved Google Workspace process.
- Automated tests and documented Google Chat smoke tests pass.
- No mock data, hardcoded users, hardcoded space IDs, placeholder buttons, or duplicated AI implementation remains.

## 29. Non-Negotiable Engineering Rules

- Use only official Google Chat and Google Workspace APIs.
- Do not scrape Google Chat or automate its web interface.
- Do not use incoming webhooks as the entire integration; webhooks are insufficient for an interactive assistant.
- Do not use user-supplied email addresses as authorization.
- Do not trust card parameters for permissions.
- Do not allow the model to query the database directly.
- Do not bypass existing Monolith business services.
- Do not hardcode tenant, user, job, department, or space identifiers.
- Do not expose service-account credentials to the browser.
- Do not post confidential data to a space merely because the bot is present.
- Do not stop after preparing documentation.
- Do not leave TODO-only implementations.
- Run migrations, formatting, linting, type checks, tests, and production builds.
- Start the development environment and verify critical flows.
- Fix all errors introduced by this work before finishing.

Begin now by auditing the repository, locating the existing Monolith AI Assistant and notification/workflow infrastructure, creating the implementation document, and then continuing directly into the complete production implementation.

# Monolith Communication Module: Google Workspace Parity Fix Prompt

You are a principal full-stack engineer working inside the existing Monolith Engine repository.

The current Communication module implementation is not acceptable. It looks like a local placeholder product instead of an integrated Google Workspace experience. You must correct it without breaking existing Monolith job, CHA, workflow, employee, RBAC, audit, and document flows.

Use these screenshots as the product reference:

- Monolith current dashboard/mail/chat screenshots: `image(28).png`, `image(29).png`, `image(30).png`
- Expected Google Workspace behavior reference: `image(31).png`, `image(32).png`, `image(33).png`, `image(34).png`

## Non-Negotiable Product Principle

Monolith Communication is not a separate mail, chat, drive, or meeting system.

It is a Google Workspace operating layer inside Monolith.

Google Workspace remains the source of truth for:

- Gmail inbox, sent mail, drafts, labels, threads, messages, attachments, sender, subject, read state, starred state, archive/trash state;
- Google Chat direct messages, group conversations, named spaces, members, messages, attachments, mentions, unread state where available;
- Google Calendar events;
- Google Meet links;
- Google Drive shared drive folders, files, permissions, and uploaded documents.

Monolith remains the source of truth for:

- jobs and job numbers;
- CHA/job workflow state;
- customers;
- employees and departments;
- Monolith permissions/RBAC;
- document categories;
- internal approvals;
- audit history;
- links between Monolith records and Google resource IDs.

Do not create fake/local-only communication objects except as a sync cache, index, or join table that stores Google IDs and Monolith context.

## Immediate Stop Condition

Before making new UI changes, inspect the existing implementation and identify every place where it is using:

- hardcoded mail data;
- placeholder subjects;
- `Unknown` senders caused by missing Gmail header parsing;
- local-only chat channels;
- local-only job spaces;
- local-only drive folders;
- mock sync states;
- buttons that do not call Google APIs;
- "Open Gmail", "Open Drive", or "Open Chat" buttons without a real Google resource ID;
- new Communication records that are not linked to Google resource IDs.

Create or update:

```text
docs/communication-google-parity-gap-report.md
```

For each gap, list:

- file path;
- current broken behavior;
- correct Google-backed behavior;
- Google API or Monolith service needed;
- status: `FIXED`, `REMOVED`, or `BLOCKED_BY_CONFIG`.

Do not mark the task complete until every gap is either fixed or explicitly blocked by missing Google administrator configuration.

## Required Google Workspace Configuration

Support these settings in Communication Settings/Admin:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- allowed hosted domain: `adarshshipping.in`
- default automation account: `no-reply@adarshshipping.in`, editable by admin
- Google Shared Drive ID
- Jobs Root Folder ID inside that Shared Drive
- Google Chat app/bot identity
- Pub/Sub topic/subscription configuration if used for sync events
- enabled/disabled feature flags for Gmail, Chat, Drive, Calendar, Meet

Add validation screens and health checks for:

- OAuth connected;
- Gmail API enabled;
- Google Chat API enabled;
- Drive API enabled;
- Calendar API enabled;
- selected Shared Drive exists and is accessible;
- Jobs Root Folder exists and is inside the selected Shared Drive;
- automation account/service account has required access;
- current signed-in user is an `@adarshshipping.in` Google Workspace account.

## Authentication And Authorization

Use official Google OAuth 2.0 server-side authorization code flow. Do not use passwords, app passwords, scraping, browser automation, cookies, or iframes.

Each Monolith user must connect their own Google Workspace account.

Store only server-side encrypted credentials:

- Google subject ID;
- email;
- granted scopes;
- encrypted refresh token;
- access token metadata;
- token expiry;
- last sync state.

For normal user mail/chat actions, use the user's OAuth token. Use service account/domain-wide delegation only for administrator-approved automation, such as creating job folders or spaces, and only if the Workspace admin configuration supports it.

Use incremental authorization. Request only scopes needed for the active feature.

## UX Target

The current Monolith UI is too sparse and card-heavy. Replace it with a dense, familiar, Gmail/Chat-style operational workspace while keeping Monolith branding and design tokens.

Do not copy Google trademarks or exact proprietary UI. Match the functional layout and information density:

- left product rail/navigation;
- compact message/chat lists;
- strong search bar;
- right reading/conversation pane;
- clear unread, sender, subject, attachment, date, label, and thread indicators;
- responsive behavior for desktop/tablet/mobile;
- no oversized empty cards for core workflows;
- no useless dashboard summaries that hide actual work.

Primary tabs:

- Workspace Home
- Mail
- Chat
- Job Spaces
- Meetings
- Calendar
- Job Drive
- Search
- Settings

Every tab must show real Google-backed data or a clear setup/error state.

## Gmail Requirements

Use Gmail API as the source of truth.

Implement:

- inbox thread list from Gmail, not local placeholders;
- proper sender display from message headers;
- proper subject display from message headers;
- snippets;
- unread/read state;
- attachment indicators;
- date/time;
- labels;
- starred state;
- sent mail;
- drafts;
- search using Gmail query syntax;
- open full conversation/thread;
- safe HTML/plain-text rendering;
- reply;
- reply all;
- forward;
- compose;
- send;
- attachment upload/download;
- archive;
- star/unstar;
- mark read/unread;
- trash/restore;
- open native Gmail thread in a new tab for unsupported advanced actions.

Fix the current bug where messages show:

```text
Unknown
(No Subject)
```

This is only valid when Gmail actually has no sender or no subject. Otherwise parse Gmail payload headers correctly:

- `From`
- `To`
- `Cc`
- `Bcc`
- `Reply-To`
- `Subject`
- `Date`
- `Message-ID`
- `In-Reply-To`
- `References`

Preserve:

- Gmail `threadId`;
- Gmail `messageId`;
- Gmail `labelIds`;
- Gmail history IDs for sync.

For replies, build valid RFC 2822/MIME messages and include correct thread metadata. Do not create a new message when the user intends to reply to an existing thread.

The Gmail UI must not be a read-only viewer. Compose, reply, reply-all, forward, send, drafts, and attachments must work end to end.

## Chat And Spaces Requirements

Use Google Chat as the source of truth for communication.

The current Monolith chat is wrong because it only shows Monolith-created mock spaces and does not show the user's existing Google Chat DMs and spaces.

Implement:

- list the signed-in user's existing Google Chat direct messages;
- list the signed-in user's existing group conversations and named spaces;
- show recent messages for supported spaces/conversations;
- send messages to Google Chat where official API permissions allow;
- upload/share attachments where supported;
- show members;
- show unread/recent activity where supported;
- search/filter DMs and spaces;
- open native Google Chat conversation/space for unsupported actions;
- keep Monolith job context in a side panel.

Do not create local-only chat rooms unless they are explicitly linked to a Google Chat space or conversation.

If Google Chat API cannot expose a specific native UI feature, document it in:

```text
docs/google-workspace-api-capability-matrix.md
```

Then provide a Google deep link instead of faking support.

## Job Space Requirements

When a job is created in Monolith/CHA:

1. Create or find the canonical Monolith job record.
2. Create a real Google Chat named space for that job.
3. Name it consistently, for example:

```text
JOB-1556 - Customer/Shipment Short Name
```

4. Add configured default members based on branch, department, CHA team, assigned employees, and job owner.
5. Store the Google Chat `space.name` or resource ID against the Monolith job.
6. Show that same Google Chat space inside Monolith Job Spaces.
7. Provide an "Open in Google Chat" action that opens the real Google space.
8. If space creation fails, do not silently create only a Monolith placeholder. Show a retryable sync error.

Messages sent in the Monolith job space must go to the corresponding Google Chat space where API permissions allow.

Messages sent in Google Chat should appear in Monolith after sync/event processing where API/event support allows.

## Drive And Job Folder Requirements

Use Google Drive API and the configured Shared Drive as the source of truth for job documents.

When a job is created:

1. Ensure a job folder exists under the configured Jobs Root Folder.
2. Folder name format:

```text
JOB-1556 - Customer/Shipment Short Name
```

3. Create these subfolders automatically:

```text
Customer KYC
Job Docs
User Docs
Checklists
Other Docs
Emails
Chat Attachments
Approvals
```

4. Store the Google Drive folder IDs and Shared Drive ID in Monolith.
5. Provide "Open in Google Drive" links for the job folder and each subfolder.
6. Use `supportsAllDrives=true` for Shared Drive operations.
7. Never show a folder as created unless it exists in Google Drive.

When a document is uploaded anywhere in the CHA/job module:

1. Resolve the job.
2. Resolve the document category.
3. Upload the file to the correct Google Drive job subfolder.
4. Store the returned Google Drive file ID, webViewLink, mime type, size, checksum if available, uploader, category, and job ID.
5. Show the document in both the CHA/job document view and Communication Job Drive.
6. Do not keep the file only in Monolith local storage unless explicitly configured as temporary staging before Drive upload.
7. If Drive upload fails, show a visible failed-sync state with retry.

## Calendar And Meet Requirements

Integrate Google Calendar and Meet using official APIs.

Implement:

- list upcoming events for the connected user;
- create meeting from Monolith with Google Calendar event and Meet link;
- attach/link meeting to a job where selected;
- show meetings in job context;
- open native Calendar/Meet links.

Do not create local-only meeting placeholders.

## Mono AI Assistant Integration

Mono AI should operate on Monolith job context plus Google Workspace references. It must not invent mail/chat/drive data.

Capabilities:

- summarize a selected Gmail thread;
- summarize a selected Google Chat space/job conversation where synced messages are available;
- summarize documents in a selected job Drive folder where the user has permission;
- draft an email reply without sending automatically;
- draft a Google Chat message without sending automatically;
- answer job-specific questions using job records, uploaded documents, mail links, and chat links;
- post to a Google Chat job space only after explicit user confirmation.

All AI actions must respect Monolith RBAC and Google user permissions.

## Data Model Rules

Add or fix models/tables for:

- Google account connections;
- granted scopes;
- Google sync cursors/history IDs;
- Gmail thread/message cache metadata;
- Google Chat space/conversation mapping;
- Google Chat message cache metadata where supported;
- Monolith job to Google Chat space mapping;
- Monolith job to Google Drive folder mapping;
- Drive file metadata;
- sync jobs;
- sync errors;
- audit logs.

Do not store full email bodies or chat message bodies permanently unless there is a clear business requirement and security approval. Prefer metadata plus short cache with retention policy.

Every Google-backed object shown in Monolith must store the Google resource ID.

## Sync And Background Jobs

Implement robust sync:

- initial Gmail sync;
- incremental Gmail sync using history IDs where possible;
- Chat/Spaces sync using official APIs and Workspace Events/Pub/Sub where available;
- Drive folder/file verification jobs;
- retries with backoff;
- rate-limit handling;
- token refresh locking;
- visible sync status per account and per job;
- admin retry button for failed job space/folder creation.

No "API Sync: Active" badge may be shown unless health checks actually pass.

## Cross-Module Integration

Integrate without breaking existing workflow:

- job creation in CHA must trigger Google Chat space creation and Google Drive folder creation;
- document upload in CHA/job modules must upload to Drive;
- job detail page must show Communication and Documents tabs linked to the real Google resources;
- employee assignments should update job space membership where policy allows;
- closed/archived jobs should archive or mark inactive in Monolith, not delete Google records;
- all failures should be visible and retryable.

## Testing Requirements

Add tests for:

- Gmail header parsing: sender and subject must not show `Unknown`/`No Subject` when headers exist;
- Gmail compose/send/reply payload creation;
- Gmail thread open from stored `threadId`;
- listing existing Google Chat DMs/spaces from mocked API responses;
- creating real job Google Chat space from job creation event;
- preventing local-only job space fallback;
- creating Drive job folder and required subfolders;
- uploading CHA/job documents into the correct Drive subfolder;
- Shared Drive operations using `supportsAllDrives=true`;
- sync failure states and retry;
- OAuth expired/reconnect state;
- route/UI smoke tests for Mail, Chat, Job Spaces, Job Drive, Settings.

Use Google API mocks/fakes in automated tests. Do not require live Google credentials in CI.

## Acceptance Criteria

The implementation is complete only when all of this is true:

- Monolith Mail list visually and functionally resembles a dense Gmail-style workspace, not cards.
- Real Gmail sender and subject are shown.
- User can compose and send email.
- User can reply/reply-all/forward from a real thread.
- Existing Google Chat DMs appear in Monolith.
- Existing Google Chat spaces appear in Monolith.
- Creating a job creates a real Google Chat space or a visible retryable error.
- Job space shown in Monolith is linked to the real Google Chat space.
- Creating a job creates a real Google Drive job folder and subfolders or a visible retryable error.
- Uploading documents from CHA/job module saves them to the correct Google Drive job folder.
- Monolith stores and displays real Google Drive file links.
- "Open in Gmail", "Open in Google Chat", and "Open in Google Drive" actions open real resources.
- No fake/local-only placeholder communication data appears in production mode.
- Health badges reflect actual API/config status.
- Tests pass.
- Type-check passes.
- Lint passes.
- Build passes.

## Final Report Required

At the end, provide:

- changed files summary;
- old placeholder/local-only behavior removed;
- new Google-backed behavior implemented;
- database migrations added;
- environment variables added;
- Google Cloud/Workspace admin setup still required;
- test/lint/type-check/build results;
- known Google API limitations, if any;
- exact manual verification steps:
  - connect Google account;
  - open Mail and verify sender/subject;
  - send email;
  - reply to email;
  - open Chat and verify existing DMs/spaces;
  - create a job and verify Google Chat space;
  - verify Google Drive job folder/subfolders;
  - upload document in CHA and verify Drive file.

Do not submit a cosmetic UI-only fix. The defect is architectural: Monolith must integrate with Google Workspace as the source of truth.

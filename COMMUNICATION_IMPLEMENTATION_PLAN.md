# Monolith Communication Hub Implementation Plan

This document details the architecture, database schema, services, routes, components, and execution plan to build **Monolith Communication Hub** inside the Monolith Engine. This module will serve as the unified communication layer replacing company dependencies on Gmail, Google Chat, Google Calendar, Google Meet, Google Drive, Google Docs, and related Google Workspace tools.

---

## User Review Required

> [!IMPORTANT]
> **Prisma Schema Update and Migration**: Updating `schema.prisma` will require running a database migration. We need to run `npm run db:migrate` or `npm run db:push` depending on your environment. Please confirm if there are any specific guidelines on database migration deployment.
> 
> **SMTP/IMAP Server Connection**: The system includes SMTP and IMAP client functionality. Storing mail server credentials requires database encryption. For Phase 1 & 5, we will store credentials in plain text or using a simple base64 placeholder, but we recommend implementing a secure environment-key-based AES decryption utility in `src/lib/crypto.ts` for production. Let us know if you want that included.
> 
> **Integration Adapters**:
> - **ONLYOFFICE**: We'll define a modular adapter for ONLYOFFICE document editor. The server URL and API key will be configured in the admin settings.
> - **Jitsi Meet**: A modular video-call adapter will generate links targeting either a public Jitsi instance or a self-hosted one.
> - **File/Drive Storage**: In development, files are uploaded locally to `/uploads/communication/`. In production, the system is designed to use an S3-compatible service wrapper.

---

## Open Questions

> [!WARNING]
> **Prisma Client Generation**: The existing database uses a custom generated client output `output = "../src/generated/prisma"`. When we modify the schema, we must run `npm run db:generate` to regenerate the client. Ensure no other scripts are currently running migrations that would cause locking.

---

## Proposed Changes

We will implement the Communication Hub step-by-step across 7 distinct phases, ensuring the app remains buildable and functional at every point.

### Database Models

We will append the following models to `prisma/schema.prisma` and add back-relations to existing models:

#### [MODIFY] [schema.prisma](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/prisma/schema.prisma)
* **`User`**: Add relation fields for `communicationProfile`, `mailAccounts`, `chatParticipants`, `chatMessages`, `chatMessageReads`, `chatReactions`, `calendars`, `eventAttendees`, `createdEvents`, `meetingsHosted`, `meetingParticipations`, `meetingNotes`, `commDocumentsCreated`, `commDocumentVersions`, `formsCreated`, `formResponses`.
* **`Department`**: Add relation fields for `mailAccounts`, `chatConversations`, `calendars`, `filePermissions`.
* **`FileFolder` & `FileAsset`**: Add fields/relations for permissions, versions, tags, and comments.
* **`[NEW] CommunicationProfile`**: User-specific preferences (signature, status, notifications).
* **`[NEW] MailAccount`**: Personal and shared mailbox SMTP/IMAP configurations.
* **`[NEW] MailThread`**: Grouping of related email messages.
* **`[NEW] MailMessage`**: Inbound/outbound email records (linked to CRM, HRMS, etc.).
* **`[NEW] MailAttachment`**: Attachments for emails.
* **`[NEW] MailLabel`**: System/custom folder tags (Inbox, Sent, Starred, Custom).
* **`[NEW] ChatConversation`**: Direct messages, group chats, or channels.
* **`[NEW] ChatParticipant`**: Maps users/roles to conversations.
* **`[NEW] ChatMessage`**: Chat messages with thread replies, pins, reactions.
* **`[NEW] ChatMessageRead`**: Read receipts for chat messages.
* **`[NEW] ChatReaction`**: Emoji reactions on messages.
* **`[NEW] ChatAttachment`**: File attachments inside chats.
* **`[NEW] Calendar`**: Shared or personal calendars.
* **`[NEW] CalendarEvent`**: Calendar events with recurrence and location.
* **`[NEW] CalendarEventAttendee`**: Event invitations and RSVP statuses.
* **`[NEW] CalendarResource`**: Meeting rooms or shared equipment.
* **`[NEW] Meeting`**: Jitsi video sessions linked to calendar/chat/CRM/HRMS.
* **`[NEW] MeetingParticipant`**: Attendance log for video calls.
* **`[NEW] MeetingNote`**: Minutes and action items recorded during meetings.
* **`[NEW] FilePermission`**: Granular viewer/editor permissions on assets and folders.
* **`[NEW] FileVersion`**: History tracking for documents.
* **`[NEW] FileShareLink`**: Shareable public/internal links with expirations.
* **`[NEW] CommDocument`**: Co-editing records for documents, spreadsheets, presentations.
* **`[NEW] CommDocumentVersion`**: OnlyOffice co-editing revision history.
* **`[NEW] Form`**: Custom form definitions.
* **`[NEW] FormField`**: Form questions and validation rules.
* **`[NEW] FormResponse`**: Submitted user entries.
* **`[NEW] CommunicationSetting`**: Org-level restrictions, domains, retention settings.
* **`[NEW] RetentionPolicy`**: Data cleanup rules by table.

---

### Phase 1: Module Shell, Sidebar, RBAC, Settings, Notification/Audit Hooks

* Introduce the communication hub page routing.
* Integrate submodules in the main sidebar.
* Add permissions to the seeding logic.

#### [MODIFY] [navigation.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/lib/navigation.ts)
* Populate items inside the `communication` navigation block:
  ```typescript
  items: [
    { href: "/communication/mail", label: "Mail", icon: Mail, matchPaths: ["/communication/mail"] },
    { href: "/communication/chat", label: "Chat", icon: MessageSquare, matchPaths: ["/communication/chat"] },
    { href: "/communication/calendar", label: "Calendar", icon: Calendar, matchPaths: ["/communication/calendar"] },
    { href: "/communication/meetings", label: "Meetings", icon: Video, matchPaths: ["/communication/meetings"] },
    { href: "/communication/files", label: "Drive Files", icon: Folder, matchPaths: ["/communication/files"] },
    { href: "/communication/docs", label: "Documents", icon: DocumentAdd, matchPaths: ["/communication/docs"] },
    { href: "/communication/forms", label: "Forms", icon: Report, matchPaths: ["/communication/forms"] },
    { href: "/communication/search", label: "Universal Search", icon: Analytics, matchPaths: ["/communication/search"] },
    { href: "/communication/admin", label: "Admin Center", icon: Security, matchPaths: ["/communication/admin"] },
  ]
  ```

#### [MODIFY] [seed.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/prisma/seed.ts)
* Seed the new communication permissions:
  - `communication.mail.access`, `communication.mail.send`
  - `communication.chat.access`, `communication.chat.moderator`
  - `communication.calendar.access`, `communication.calendar.manage_resources`
  - `communication.files.access`, `communication.files.share_external`
  - `communication.docs.access`
  - `communication.forms.access`, `communication.forms.create`
  - `communication.admin.manage`

#### [NEW] [communication-admin.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/communication-admin.service.ts)
* Organization settings retrieval and update.
* Domain verification rules.
* SMTP/IMAP configuration validation.
* DNS settings checklist provider.

#### [NEW] [communication-notification.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/communication-notification.service.ts)
* Integrates with the main `notify` service to dispatch system alerts on mention, share, or invite.

#### [NEW] [communication-audit.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/communication-audit.service.ts)
* Audit log insertions for messaging actions to record actions cleanly.

#### [NEW] [layout.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/layout.tsx)
* Verifies `communication` permission gating.
* Supplies the main shell layout with secondary navigation inside the Communication Hub.

---

### Phase 2: Chat Submodule (Direct Messages, Channels, Reactions, Presences)

* Build chat window and sidebar components.
* Near-real-time updates via optimized polling / Server-Sent Events (SSE).

#### [NEW] [chat.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/chat.service.ts)
* Create/fetch conversations (DMs, group chats, channels).
* Channel matching for departments/projects/leads.
* Send, edit, delete, and reply-to messages.
* Save reactions, read receipts, and pins.
* Retrieve online/offline presence map.

#### [NEW] [chat/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/chat/page.tsx)
* Parent view orchestrating chat interface.

---

### Phase 3: Calendar & Jitsi Meetings Submodule

* Calendar scheduling UI with resource bookings.
* Integrated Jitsi Meet call adapter.

#### [NEW] [calendar.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/calendar.service.ts)
* List/create/update calendar events.
* Room resource booking conflicts check.
* Invitation lists & attendee RSVP update logic.

#### [NEW] [meeting.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/meeting.service.ts)
* Adapter generating Jitsi Meet credentials/links.
* Logs meetings against CRM/HRMS records.
* Saves action items and minutes.

#### [NEW] [calendar/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/calendar/page.tsx)
#### [NEW] [meetings/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/meetings/page.tsx)

---

### Phase 4: Files / Drive Submodule

* Expands basic folder uploads into collaborative company workspaces.
* File version history records.

#### [NEW] [file.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/file.service.ts)
* CRUD operations for file items/folders.
* Multi-version uploads.
* External share link token generation with expirations.
* Folder size usage tracking.

#### [NEW] [files/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/files/page.tsx)

---

### Phase 5: Mail Submodule (Inbox, Compose, CC/BCC, CRM/HRMS logs)

* Internal-to-internal system messaging.
* Outbound mail routing via `Nodemailer`.
* Inbound mail parsing template structure.

#### [NEW] [mail.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/mail.service.ts)
* Inbox threads fetch by folder label (Inbox, Sent, Trash, Archive, Starred).
* Signature additions and templates builder.
* SMTP connection setup and IMAP sync framework.
* Association links from mail threads to CRM leads or HRMS cases.

#### [NEW] [mail/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/mail/page.tsx)

---

### Phase 6: ONLYOFFICE Document Collaboration & Custom Forms Builder

* Co-authoring support for text documents, spreadsheets, slides.
* Custom forms engine replacing Google Forms.

#### [NEW] [document.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/document.service.ts)
* ONLYOFFICE token builder & callback handlers.
* History versions list.

#### [NEW] [form.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/form.service.ts)
* Forms definitions builder.
* Submission database logs.
* Exports to Excel format.

#### [NEW] [docs/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/docs/page.tsx)
#### [NEW] [forms/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/forms/page.tsx)

---

### Phase 7: Universal Full-Text Search, Workspace Importer, Verification & Refinement

* Universal search bar scanning emails, messages, folders, files, events, documents, and CRM/HRMS logs.
* Importer dashboard loading MBOX, ICS, and Drive archives.

#### [NEW] [communication-search.service.ts](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/modules/communication/communication-search.service.ts)
* Full-text matching across the communication database.

#### [NEW] [search/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/search/page.tsx)
#### [NEW] [admin/page.tsx](file:///c:/Users/venka/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/communication/admin/page.tsx)
* Houses domains setup, DNS checklists, SMTP tests, and Google migration dashboard.

---

## Verification Plan

### Automated Tests
To verify correct schema compilation, relation consistency, and data logic:
1. **Regenerate Client**:
   ```bash
   npm run db:generate
   ```
2. **Execute Test suite**:
   ```bash
   npm run test
   ```
   *We will write test suites in `src/modules/communication/__tests__/` to verify:
   - Tenant isolation (e.g. `orgId` filters).
   - Permission rule validation checks.
   - Resource booking conflict checks.

### Manual Verification
1. Verify the sidebar links display according to loaded user capabilities.
2. Confirm the UI renders correctly in both Dark Mode and Light Mode matching the Monolith design system colors.
3. Verify that changing options in the Admin Center correctly changes features on individual subpages.

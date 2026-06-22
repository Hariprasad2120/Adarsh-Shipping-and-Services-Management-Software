# Monolith Communication Hub API Contracts

This document contains request and response contracts for key backend Server Actions inside the Communication Hub.

## 1. Mail Service (`src/modules/communication/mail.service.ts`)

### `listMailThreads`
Retrieves mail threads matching filters (Inbox, Sent, Starred, etc.).
- **Parameters**:
  ```typescript
  {
    userId: string;
    orgId: string;
    folder: "inbox" | "sent" | "starred" | "trash" | "archive" | "draft";
    page?: number;
    limit?: number;
    search?: string;
  }
  ```
- **Returns**: `Promise<{ threads: MailThreadView[]; total: number; page: number }>`

### `sendMailMessage`
Creates and dispatches an email message.
- **Parameters**:
  ```typescript
  {
    userId: string;
    orgId: string;
    mailAccountId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    threadId?: string; // set if replying/forwarding
    linkedRecordType?: string; // Optional: CRM_LEAD etc.
    linkedRecordId?: string;
    attachments?: { fileKey: string; fileName: string; fileSize: number; mimeType: string }[];
  }
  ```
- **Returns**: `Promise<MailMessageView>`

---

## 2. Chat Service (`src/modules/communication/chat.service.ts`)

### `sendMessage`
Sends a message to a direct message channel or group.
- **Parameters**:
  ```typescript
  {
    userId: string;
    orgId: string;
    conversationId: string;
    body: string;
    parentId?: string; // For thread replies
    attachments?: { fileKey: string; fileName: string; fileSize: number; mimeType: string }[];
  }
  ```
- **Returns**: `Promise<ChatMessageView>`

### `listChatMessages`
Fetch messages for a conversation.
- **Parameters**:
  ```typescript
  {
    userId: string;
    orgId: string;
    conversationId: string;
    cursor?: string; // For keyset pagination
    limit?: number;
  }
  ```
- **Returns**: `Promise<{ messages: ChatMessageView[]; nextCursor?: string }>`

---

## 3. Calendar Service (`src/modules/communication/calendar.service.ts`)

### `createCalendarEvent`
Creates an event and checks for room booking conflicts.
- **Parameters**:
  ```typescript
  {
    userId: string;
    orgId: string;
    calendarId: string;
    title: string;
    description?: string;
    startAt: string; // ISO string
    endAt: string;
    isAllDay?: boolean;
    resourceId?: string; // Room booking id
    attendeeEmails?: string[];
  }
  ```
- **Returns**: `Promise<CalendarEventView>`

# Monolith Communication Hub Database Schema

This document details the schema definitions added to `prisma/schema.prisma` for the Monolith Communication Hub.

## 1. Core Profile & Mail System

### CommunicationProfile
User-specific communication settings and presence.
- `id` (String, PK, CUID)
- `userId` (String, Unique, FK to `User.id`)
- `orgId` (String)
- `emailSignature` (String, Optional)
- `emailSignatureEnabled` (Boolean, default: false)
- `chatPresence` (String, default: "OFFLINE") // ONLINE | OFFLINE | AWAY | DND
- `notificationPreferences` (Json, Optional)
- `createdAt` / `updatedAt` (Timestamps)

### MailAccount
Configures individual personal or shared email credentials.
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `userId` (String, Optional, FK to `User.id`)
- `departmentId` (String, Optional, FK to `Department.id`)
- `name` (String)
- `email` (String, Unique)
- `smtpHost` / `smtpPort` / `smtpUser` / `smtpPasswordHash` (Strings, Optional)
- `imapHost` / `imapPort` / `imapUser` / `imapPasswordHash` (Strings, Optional)
- `isActive` (Boolean, default: true)
- `isDefault` (Boolean, default: false)
- `isShared` (Boolean, default: false)
- `createdAt` / `updatedAt` (Timestamps)

### MailThread
Groups message chains.
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `subject` (String)
- `createdAt` / `updatedAt` (Timestamps)

### MailMessage
Inbound/outbound mail item.
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `threadId` (String, FK to `MailThread.id`, onDelete: Cascade)
- `mailAccountId` (String, FK to `MailAccount.id`, onDelete: Cascade)
- `from` (String)
- `to` / `cc` / `bcc` (Strings, Comma-separated)
- `subject` (String)
- `bodyText` / `bodyHtml` (String, Text)
- `isIncoming` (Boolean, default: false)
- `status` (String, default: "SENT") // SENT | PENDING | DRAFT | FAILED
- `attempts` (Int, default: 0)
- `readAt` (Timestamp, Optional)
- `linkedRecordType` (String, Optional) // CRM_LEAD | HRMS_EMPLOYEE | etc.
- `linkedRecordId` (String, Optional)
- `createdAt` / `updatedAt` (Timestamps)

---

## 2. Chat Module

### ChatConversation
Groups direct messages, groups, or channels.
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `name` (String, Optional)
- `type` (String, default: "DIRECT") // DIRECT | GROUP | CHANNEL
- `departmentId` (String, Optional, FK to `Department.id`)
- `projectId` (String, Optional)
- `leadId` (String, Optional)
- `employeeId` (String, Optional)
- `isPublic` (Boolean, default: false)
- `createdAt` / `updatedAt` (Timestamps)

### ChatParticipant
Maps membership.
- `id` (String, PK, CUID)
- `orgId` (String)
- `conversationId` (String, FK to `ChatConversation.id`)
- `userId` (String, FK to `User.id`)
- `role` (String, default: "MEMBER") // ADMIN | MEMBER
- `joinedAt` (Timestamp)

### ChatMessage
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `conversationId` (String, FK to `ChatConversation.id`)
- `senderId` (String, FK to `User.id`)
- `body` (String, Text)
- `parentId` (String, Optional, FK to `ChatMessage.id`)
- `isPinned` (Boolean, default: false)
- `isEdited` (Boolean, default: false)
- `createdAt` / `updatedAt` (Timestamps)

---

## 3. Calendars, Resources, & Meetings

### Calendar
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `userId` (String, Optional)
- `name` (String)
- `type` (String, default: "PERSONAL") // PERSONAL | DEPARTMENT | COMPANY
- `departmentId` (String, Optional)

### CalendarEvent
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `calendarId` (String, FK to `Calendar.id`)
- `title` (String)
- `description` (String, Optional)
- `startAt` / `endAt` (Timestamps)
- `isAllDay` (Boolean)
- `recurrence` (String, Optional)
- `resourceId` (String, Optional)

### Meeting
- `id` (String, PK, CUID)
- `orgId` (String, Index)
- `eventId` (String, Optional, Unique)
- `title` (String)
- `link` (String)
- `hostId` (String)
- `startAt` / `endAt` (Timestamps)
- `recordingUrl` (String, Optional)

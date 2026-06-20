# Google Workspace Migration Guide

This document defines how users, emails, calendar events, and drive storage data can be imported into **Monolith Communication Hub**.

## 1. User Account Sync
Google accounts must be aligned with existing Monolith Engine users prior to importing emails or calendars.
- **Mapping Key**: Use the `email` field as the absolute unique key.
- If a Google Workspace user does not exist in Monolith, they should be created in the `User` table or added to a manual mapping list inside the migration dashboard.

## 2. Gmail / Email Import (MBOX format)
To import messages:
- Upload raw `.mbox` format exports from Google Takeout.
- **MBOX Parsing Pipeline**:
  1. Parse emails iteratively (streaming to avoid memory leaks).
  2. For each message, extract Sender, Recipients, CC, Date, Subject, Text Body, HTML Body, and Attachments.
  3. Map the message to the corresponding `MailMessage` and `MailThread` in the database.
  4. Write attachment files to the local file storage / S3 buckets and save links in `MailAttachment`.

## 3. Google Calendar Import (ICS format)
- Upload `.ics` iCalendar format export files.
- **ICS Parsing Pipeline**:
  1. Extract events (`VEVENT` blocks).
  2. Parse Event Summary, Description, Start Date (UTC/Timezone), End Date, Location, Recurrence Rules (RRULE), and Attendees.
  3. Map them to `CalendarEvent` and `CalendarEventAttendee`. If the attendee email matches an active Monolith user, map their `userId`.

## 4. Google Drive Import
- Upload folder zip exports.
- **Drive Mapping Pipeline**:
  1. Extract directories and preserve nesting hierarchy using the `FileFolder` CUID `parentId` links.
  2. Write folder ownership permissions. Mapped groups or Google Shared Drives are converted to Monolith departments or shared folders.
  3. Write file assets to the storage volume and index them in `FileAsset` with matching scope configuration (personal / organization / employee).

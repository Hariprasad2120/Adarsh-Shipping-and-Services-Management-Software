# Google Workspace Mail Integration API Limitations

This document lists the limitations, constraints, and deviations from the native Google/Gmail interface due to restrictions in Google's official public developer APIs.

## 1. Snoozing Emails
* **Native Feature**: In Gmail, users can snooze messages to disappear and reappear at a later date.
* **API Limitation**: The Gmail REST API does not provide any public write endpoints or metadata fields to trigger/update snoozes natively on Google servers.
* **Monolith Solution**: Snoozing is managed inside Monolith:
  - When a user snoozes a thread, the thread ID is added to a local database scheduler `SnoozedMailThread` with the target date.
  - A background cron task queries expiring snoozes and reappends the `INBOX` label to the synchronized thread local cache.

## 2. Real-Time Chat Limits
* **Native Feature**: The Google Chat interface has direct live DMs and channels.
* **API Limitation**: The official Google Chat API is intended for chat apps, bots, and automated triggers. Direct user-to-user live chat stream sync is restricted, and complete parity with Gmail's internal hangouts/chat is not publicly supported for standard user accounts.
* **Monolith Solution**: We implement a custom local **Live Chat** service for direct messages and channels between organization employees, integrating notifications in the dashboard.

## 3. Meet & Calendar Free/Busy Access
* **Native Feature**: Gmail allows scheduling and instant checks of attendee calendars to find conflict-free windows.
* **API Limitation**: Checking the availability of external calendar attendees is restricted unless explicit `freebusy` permissions are granted by the remote user or both accounts reside inside the same Google Workspace domain.
* **Monolith Solution**: Monolith displays free/busy details for users inside the same tenant organization using local calendar event overlaps, showing generic warnings for external emails.

## 4. Drive Sharing Permissions
* **Native Feature**: Drag-and-drop attachment links automatically request access permissions for email recipients.
* **API Limitation**: The Drive API does not automatically update file access permissions based on Gmail recipients list when a URL is composed.
* **Monolith Solution**: The Monolith Drive attachment selector checks file scopes and warns the user if external recipients lack access, offering direct links to Google Drive sharing settings.

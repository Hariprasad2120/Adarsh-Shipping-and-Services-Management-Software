# Google Workspace Integration: API Limitations & Quotas

This document details Google API limits, quota sizes, and performance bounds when synchronizing Google Workspace inside Monolith Engine.

---

## 1. Gmail API Quotas and Rate Limits

Google enforces strict limits on a per-project and per-user basis:
- **Daily Quota Limit**: 1,000,000,000 quota units per day.
- **Per-User Limit**: 250 quota units per user per second.
- **Call Quota Costs**:
  - `messages.get` or `threads.get`: 5 units.
  - `messages.send` or `drafts.create`: 100 units.
  - `history.list`: 2 units.
  - `watch`: 100 units.

### Mitigation in Monolith:
1. **Lazy Loading**: Full email bodies and attachments are never fetched during bulk inbox list synchronizations. Monolith only queries header snippets (costs 5 units per list query).
2. **Incremental History Sync**: Webhooks query `/history` changes using the latest `historyId` (costs 2 units) instead of polling thread lists (costs 5-10 units).
3. **Draft debouncing**: Auto-saving drafts in the composer is throttled to once every 5 seconds.

---

## 2. Attachment Size Limitations

- **Maximum Send Size**: Google limits outbound attachments to **25MB**. 
- **Large Files**: To attach files larger than 25MB, Monolith prompts the user to upload the asset to Google Drive and embeds the sharing link in the message body.

---

## 3. Pub/Sub Watch Lifespans

- **Watch Expiry**: Gmail watch subscriptions expire after a maximum of **7 days**.
- **Mitigation**: Monolith runs a scheduled background cron task every 24 hours to renew watches for all active mailboxes.

---

## 4. Google Chat API Parity Limitations

- **API Scope Limitations**: The Google Chat REST API does not allow arbitrary user session mirroring. Real-time direct message sync is limited to Chat Apps or Spaces where the Monolith integration has been explicitly installed.
- **Google Meet Calling**: Streaming video directly inside the browser using Meet APIs is not supported. Monolith creates Meet rooms via Calendar events and links them to Jitsi client redirects.

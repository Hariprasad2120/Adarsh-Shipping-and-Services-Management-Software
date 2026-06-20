# Monolith Communication Hub Security Checklist

This document details security requirements that must be verified on all communication submodules.

## 1. Multi-Tenant Scoping (`orgId` Isolation)
- [ ] Every database fetch must include `orgId: user.orgId` in its filter.
- [ ] No query must use broad sweeps or select fields without checking user session scope.
- [ ] Verify that shared inboxes or shared calendars check that the requester belongs to the owning organization.
- [ ] External file sharing links must check the admin's `externalSharingEnabled` toggle settings before allowing anonymous downloads.

## 2. Input Sanitization & HTML Escaping
- [ ] Inbound/Outbound emails using HTML format must be sanitized before displaying in client components.
- [ ] Prevent XSS by parsing HTML bodies through a safe sanitizer (e.g. `dompurify` or a custom server-side regex scrubber).
- [ ] Chat messages must be rendered as raw text, not as HTML, unless previewing links (which must only display safe domains).

## 3. Rate Limiting & Attachment Size Restrictions
- [ ] Outbound emails must be rate-limited to avoid system server bans.
- [ ] Email attachment uploads must enforce a maximum size limit (e.g., 25MB total per mail thread).
- [ ] Drive file uploads must check the organization's total storage capacity usage before allowing a write.
- [ ] Exclude uploading dangerous file types (e.g., `.exe`, `.bat`, `.sh`) from folders unless explicitly authorized.

## 4. RBAC & Service Gating
- [ ] Server actions must execute `requirePermission(userId, "permissionKey")` before calling database methods.
- [ ] Ensure that normal users cannot change admin configurations (e.g., SMTP settings, retention policies, domain maps).
- [ ] Moderation tools must only allow deletion of messages by users with `communication.chat.moderator` permission.

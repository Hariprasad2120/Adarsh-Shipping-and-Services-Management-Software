# Communication Module Replacement Override

Stop the current implementation approach.

You are incorrectly reproducing or improving the existing Communication module. That existing feature set has been rejected.

Use `monolith-google-workspace-communication-rebuild-prompt.md` as the **only product specification** for Communication.

## Required Action

1. Stop implementing features based on the current Communication module.
2. Read the complete `.md` specification before making further edits.
3. Review every change already made during this task.
4. Revert only your own changes that reproduce old Communication behavior. Do not revert unrelated user changes.
5. Inventory all old Communication code in `docs/communication-module-removal-map.md`.
6. Remove the rejected module's routes, pages, components, APIs, services, jobs, permissions, tests, navigation, and dead code.
7. Preserve only shared platform infrastructure used outside Communication:
   - authentication;
   - sessions;
   - organization and employee directory;
   - RBAC primitives;
   - audit logging;
   - notification infrastructure;
   - queue infrastructure;
   - shared layout and design-system components.
8. Replace the module with the Google Workspace-backed implementation defined in the master `.md` file.
9. Do not keep legacy pages, tabs, aliases, hidden routes, duplicate APIs, compatibility wrappers, or placeholder versions of the old features.
10. Verify with repository-wide searches that rejected features are gone.

## Delete These Old Product Areas

- Mail Inbox
- Chat Messenger
- Scheduler Calendar
- Video Meetings
- Drive Storage
- Collaborative Docs
- Custom Forms
- Universal Search
- Communication Admin Console

These names may reappear only when the master specification explicitly defines a new Google Workspace-backed replacement. Do not copy their old code or workflows.

## Build Only The New System

The replacement must contain:

- Google Workspace OAuth connection for `@adarshshipping.in`;
- Monolith Messenger with employee DMs, group chats, public/private channels, department/branch channels, and job spaces;
- Google Chat as the synchronized communication backbone;
- two-way message synchronization between Monolith and Google Chat where official APIs support it;
- threads, mentions, reactions, unread state, notifications, search, file sharing, and Meet actions according to the capability matrix;
- automatic Google Chat space creation for each job;
- automatic Google Shared Drive job folder and subfolder creation;
- job-specific Communication and Documents views;
- Gmail API workflows;
- Calendar and Meet integration;
- the same permission-aware Mono AI core in Monolith and Google Chat;
- Communication Settings, health, synchronization, retries, RBAC, and audit logs.

## Mandatory Evidence Before Completion

The final report must include:

- old files and routes removed;
- old database models removed or migrated;
- old navigation entries removed;
- cross-module references updated;
- new files and migrations created;
- repository search results proving rejected labels/routes are gone;
- route tests proving legacy URLs are unavailable or correctly redirected;
- tests for the new Google Workspace workflows;
- lint, type-check, test, migration, and production-build results;
- remaining Google Cloud or Workspace administrator setup.

Do not continue from the current implementation blindly. First compare it line by line against the master specification, remove non-compliant work, and then implement the specified replacement end to end.

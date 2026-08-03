# CHA Import Job Creation Lab

This workspace is an isolated client-side testing lab for import job creation.
It deliberately does not call existing CHA job creation actions, production CHA
services, ICEGATE integrations, document storage, Prisma models, or migrations.

Draft persistence is handled through `LocalStorageImportJobDraftRepository`
using the key `monolith:cha-import-job-creation-lab:v1`. Stored drafts are
schema-version aware and migrate back to the current draft shape before use.

The implementation is import-only today while keeping the draft root prepared
for `MovementDirection = "IMPORT" | "EXPORT"` so export tabs can be added later.

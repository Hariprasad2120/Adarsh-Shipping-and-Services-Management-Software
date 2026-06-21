# Monolith HRMS: Isolated Recruit Section Implementation Prompt

You are a senior full-stack engineer working inside the existing Monolith Engine codebase.

Implement a new HRMS section named **Recruit**. It must provide two complete experiences inspired by the supplied `n8n-workflow-template.json`:

1. **Employer Workspace**: an employer-side applicant tracking and recruitment system.
2. **Job Seeker Workspace**: an employee/candidate-side job discovery, resume optimization, application tracking, and career-assistance system.

Both experiences belong to Recruit, but their private data, permissions, files, AI context, settings, and automations must be separated.

## Non-Negotiable Isolation Requirement

Recruit must be a standalone bounded module contained entirely within the Recruit section.

- Do not modify the behavior of existing HRMS, AMS, CRM, payroll, attendance, leave, appraisal, accounting, communication, or other workflows.
- Use dedicated Recruit routes, components, services, API handlers, permissions, database tables, storage paths, background jobs, notifications, audit events, tests, and configuration.
- Prefix or namespace Recruit-owned code and database entities consistently, using the repository's existing conventions.
- Existing employee, department, designation, branch, user, and organization records may be read through narrow adapter interfaces only when required for dropdowns or authorization.
- Recruit must never directly update an existing module's tables.
- Do not automatically create an employee, user, payroll profile, attendance profile, or onboarding workflow.
- A hired candidate remains a Recruit record. A future integration may consume an explicit, immutable `RecruitHandoffPackage`, but this implementation must not execute that handoff.
- A Job Seeker Workspace profile must not alter the user's HRMS employee profile, appraisal, manager relationship, attendance, leave, payroll, or employment status.
- Managers, HR users, administrators, and employers must not automatically see an employee's external job searches, saved external jobs, tailored resumes, applications, or career-assistant conversations. Access is private to the owner unless the owner explicitly shares a specific artifact.
- Employer screening data and confidential hiring notes must never be exposed to job seekers.
- Do not publish generic domain events that existing modules already consume. Recruit events must use a dedicated namespace such as `recruit.*`.
- Protect the module behind a `RECRUIT_MODULE_ENABLED` feature flag. Disabling it must hide its navigation and routes without affecting HRMS.
- Before editing shared files such as navigation, RBAC registries, route registries, Prisma schema, global styles, or shared configuration, inspect their established extension pattern and make the smallest additive change possible.

## First Phase: Repository Audit

Before implementation:

1. Read `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, the package manifest, database schema, authentication/RBAC implementation, HRMS route structure, design-system components, storage helpers, email/notification services, background-job facilities, and test setup.
2. Identify the repository's naming, API, validation, transaction, pagination, filtering, audit, and error-handling conventions.
3. Search for existing recruitment, candidate, vacancy, resume, interview, offer, job-posting, file-upload, AI, email, calendar, and notification code.
4. Document the files that will be added or changed in `docs/recruit/IMPLEMENTATION.md`.
5. Do not replace existing patterns with a new framework or parallel architecture.

## Product Navigation

Add **Recruit** under HRMS as an isolated section. Its landing page must show only the workspaces the current user is permitted to access.

**Employer Workspace**

1. Employer Dashboard
2. Job Openings
3. Candidates
4. Applications
5. Talent Pool
6. Interviews
7. Assessments
8. Offers
9. Employer Automations
10. Employer Reports

**Job Seeker Workspace**

1. Career Dashboard
2. My Career Profile
3. Job Search
4. Recommended Jobs
5. Saved Jobs
6. My Applications
7. My Resumes
8. Resume Optimizer
9. Cover Letters
10. Interview Preparation
11. Job Alerts
12. Career Assistant
13. My Automation Runs

**Administration**

1. Recruit Settings
2. Recruit Audit Log

Use the existing design system exactly. The pages must support light and dark themes, responsive layouts, keyboard access, loading states, empty states, permission-denied states, errors, pagination, filters, and consistent tables.

## Roles and Permissions

Create Recruit-specific granular permissions:

- `recruit.view`
- `recruit.dashboard.view`
- `recruit.job.create`
- `recruit.job.edit`
- `recruit.job.publish`
- `recruit.job.close`
- `recruit.candidate.view`
- `recruit.candidate.create`
- `recruit.candidate.edit`
- `recruit.candidate.delete`
- `recruit.resume.view`
- `recruit.resume.download`
- `recruit.application.manage`
- `recruit.screening.run`
- `recruit.interview.manage`
- `recruit.assessment.manage`
- `recruit.feedback.submit`
- `recruit.offer.create`
- `recruit.offer.approve`
- `recruit.offer.send`
- `recruit.report.view`
- `recruit.settings.manage`
- `recruit.audit.view`
- `recruit.jobseeker.use`
- `recruit.jobseeker.profile.manage`
- `recruit.jobseeker.jobs.search`
- `recruit.jobseeker.resume.manage`
- `recruit.jobseeker.application.manage`
- `recruit.jobseeker.automation.manage`
- `recruit.jobseeker.artifact.share`

Apply permission checks on both UI and server. Never rely on hidden buttons as authorization.

Job Seeker Workspace records must also enforce owner-level authorization. A user with general HRMS administrative access does not automatically gain access to private job-seeker records. Any exceptional support/legal access must require a dedicated permission, a reason, prominent audit logging, and the project's approved privileged-access pattern.

## Workspace Separation

Treat the two Recruit experiences as separate subdomains:

- `RecruitEmployer`: organization-owned hiring records.
- `RecruitJobSeeker`: user-owned private career records.

They may share neutral infrastructure such as file validation, document rendering, job-provider adapters, queues, and AI gateways, but they must not share authorization scopes or query services.

The only normal bridge is a deliberate application by a job seeker to a job published by this organization's Employer Workspace:

1. The job seeker reviews exactly what profile/resume data will be submitted.
2. The job seeker gives explicit consent and submits.
3. A submission snapshot is copied into an employer-owned application.
4. Later edits to the private job-seeker profile do not silently change the submitted employer snapshot.
5. Employer notes, scores, decisions, and internal feedback are never copied back to the private profile.
6. Candidate-visible status updates must come from a separate allow-listed public status field.

## Core Workflow

The employer workflow below remains required. In addition, implement the complete Job Seeker Workspace described after it.

### 1. Job Requisition and Opening

Allow authorized recruiters to create a requisition with:

- Job title, internal code, department, designation, branch, location, employment type, workplace type, openings, priority, target joining date, hiring manager, recruiters, experience range, education, mandatory skills, preferred skills, responsibilities, compensation range, screening questions, interview plan, source channels, and closing date.
- Draft, pending approval, approved, published, paused, closed, cancelled, and archived statuses.
- A configurable Recruit-only approval flow.
- Version history for job descriptions and approval decisions.

Job requirements must be stored as structured data, not only rich text, so ATS matching can explain individual scores.

### 2. Candidate Intake

Support:

- Manual candidate creation.
- Bulk CSV/XLSX import with preview, validation, duplicate detection, and row-level errors.
- Resume upload in PDF and DOCX.
- Recruit-owned application form with a public tokenized URL if the current architecture supports public forms.
- Recruit mailbox ingestion only when explicitly configured.
- Optional external sourcing connectors behind provider adapters.

Do not hard-code LinkedIn scraping. Respect provider terms and use official APIs, approved integrations, manually supplied URLs, or legally obtained exports. A connector must be disabled by default until configured.

Candidate fields:

- Name, email, phone, current location, preferred location, current company, current title, total experience, relevant experience, notice period, current compensation, expected compensation, skills, education, certifications, languages, work authorization, source, source detail, consent status, recruiter owner, tags, notes, resume versions, portfolio links, and custom fields.

Encrypt or securely protect sensitive candidate data using existing repository facilities. Record consent, source, retention deadline, and deletion/anonymization status.

### 3. Resume Parsing

Create a provider-independent `RecruitResumeParser` interface.

- Extract text from PDF and DOCX locally where practical.
- Preserve the original file in a private Recruit-only storage path.
- Store normalized structured data separately from the original.
- Keep parser confidence and field-level provenance.
- Never overwrite recruiter-confirmed values with a later parse.
- Detect encrypted, corrupt, image-only, unsupported, and empty files.
- Allow review and correction before parsed data is accepted.
- Treat all resume text as untrusted data. It must never become system instructions for an AI model.

### 4. Duplicate Detection

Detect possible duplicate candidates using normalized:

- Email
- Phone
- Resume hash
- Candidate profile URL
- Name plus company/location similarity

Do not silently merge records. Present possible matches and require an authorized user to merge. Preserve a merge audit trail, source history, applications, files, notes, and consent.

### 5. Application Pipeline

Each application links one candidate to one job opening and has an independent stage:

- New
- Resume Review
- Screening
- Shortlisted
- Assessment
- Interview
- Hiring Manager Review
- Offer Approval
- Offer Sent
- Offer Accepted
- Offer Declined
- Hired
- Rejected
- Withdrawn
- On Hold
- Archived

Make stages configurable per Recruit pipeline while preserving stable internal status codes.

Provide Kanban and table views. Stage movement must:

- Validate permissions and required fields.
- Require a reason for rejection, withdrawal, hold, override, and reopening.
- Record actor, previous stage, next stage, timestamp, reason, and metadata.
- Prevent stale concurrent updates using optimistic concurrency or the repository's equivalent.
- Never trigger any non-Recruit workflow.

### 6. ATS Matching and AI Screening

Adapt the uploaded workflow's AI tailoring concept into transparent employer-side matching.

Create a provider-independent `RecruitScreeningProvider`. It receives:

- Structured job requirements
- Parsed candidate profile
- Relevant resume text
- Recruit-configured scoring rubric

Return validated structured JSON:

- Overall score from 0 to 100
- Mandatory skill score
- Preferred skill score
- Experience score
- Education/certification score
- Location/availability score
- Screening-question score
- Matching evidence
- Missing requirements
- Uncertainties
- Recommended follow-up questions
- A concise factual summary
- Provider/model/version/prompt-version metadata

Rules:

- AI output is advisory and cannot autonomously reject, shortlist, rank for final decision, schedule, or send an offer.
- Show score breakdown and evidence. Never show only an unexplained score.
- Do not infer or score protected or sensitive traits.
- Exclude name, photo, age/date of birth, gender, marital status, religion, caste, disability, and other irrelevant sensitive attributes from model input wherever possible.
- Do not invent qualifications, employment, dates, achievements, salaries, or skills.
- Use deterministic validation and a versioned rubric after AI output.
- Support manual override with a mandatory reason and audit record.
- Implement timeouts, retries, rate limiting, cost/token tracking, cancellation, and provider failure states.
- Sanitize prompt-injection content in resumes and job descriptions.
- Store the exact input references and output used for each run without exposing secrets.

### 7. Screening Automation

Provide Recruit-owned automation comparable to the supplied n8n workflow:

1. Trigger manually, on candidate intake, or through a configurable Recruit schedule.
2. Select eligible unprocessed applications.
3. Exclude duplicates and previously processed input versions.
4. Parse resumes.
5. Run ATS matching.
6. Generate candidate screening packs.
7. Save results and run logs.
8. Notify only configured Recruit recipients.

Use an idempotency key based on application ID, job-requirement version, resume version, rubric version, and AI prompt version. Re-running unchanged inputs must not create duplicate results.

An automation run needs queued, running, partially completed, completed, failed, cancelled, and timed-out states; per-item progress; retry controls; error details; start/end times; and actor/trigger source.

### 8. Candidate Screening Pack

Generate a Recruit-only PDF and browser view containing:

- Candidate and application identifiers
- Job title
- Candidate summary
- Employment and education timeline
- Skills matrix
- ATS score breakdown with evidence
- Missing information and uncertainties
- Screening answers
- Interview recommendations
- Recruiter notes permitted for the viewer
- Generated-at time, input versions, and AI-assistance disclaimer

Use the application's document-generation facilities. Do not upload to a public Google Drive folder or set files to “anyone with the link.” Store files privately and authorize every view/download.

### 9. Interviews

Implement:

- Interview rounds and panel assignment
- Proposed and confirmed time slots
- Time zone handling
- Meeting mode and location/link
- Calendar/email adapter integration when configured
- Candidate confirmation status
- Reschedule/cancel with reason
- Interview reminders
- Structured scorecards
- Independent panel feedback
- Feedback lock until submission when configured
- Conflict detection

Panel members may see only the candidate/application data allowed by their Recruit permission and interview assignment.

### 10. Assessments

Support configurable assessments with:

- Assessment name/type
- Instructions
- Question or external assessment reference
- Pass threshold
- Due date
- Attempt status
- Score and evaluator notes
- Attachments

External assessment tools must be connected through an adapter and disabled when not configured.

### 11. Offers

Offer management remains inside Recruit:

- Draft from an approved Recruit template.
- Candidate, job, compensation components, proposed joining date, validity, conditions, approvers, and attachments.
- Draft, pending approval, approved, sent, viewed, accepted, declined, expired, withdrawn, and revised statuses.
- Approval and revision history.
- Secure candidate access token with expiry.
- PDF generation and email through existing adapters.

An accepted offer may set the Recruit application to `Hired`, but must not create or modify an employee record.

Create a read-only `RecruitHandoffPackage` preview containing recruiter-confirmed candidate data, accepted offer details, uploaded documents, and source IDs. It must remain unsubmitted and have no consumer in other modules during this implementation.

## Job Seeker Workspace

Implement a private career workspace for employees and other authorized job-seeker accounts. It must reproduce and improve the useful behavior of the supplied n8n workflow without hard-coding its external services.

### 1. Private Career Profile

Allow the owner to maintain:

- Preferred roles, industries, locations, remote/hybrid/on-site preference, employment types, seniority, experience, skills, education, certifications, languages, work authorization, notice period, compensation preference, relocation preference, excluded companies, job keywords, portfolio links, and alert preferences.
- One or more base resumes in PDF/DOCX plus a structured editable master profile.
- Multiple job-search profiles, for example “Product Manager in Chennai” and “Remote AI Product Manager.”

Do not automatically copy HRMS employee data into this workspace. Offer an explicit import preview where the owner chooses individual fields. Store the copied values as private Job Seeker data with their own version history.

### 2. Job Discovery

Provide search across:

- Jobs published by this organization's Recruit Employer Workspace that are marked visible to the user.
- Manually entered external jobs.
- Approved external provider adapters.
- Imported job feeds or files.

Search and filter by keyword, company, location, workplace type, employment type, experience, compensation when available, date posted, source, and match score.

External providers must use official APIs, approved integrations, RSS/feed access, user-provided exports, or other permitted methods. Do not implement unauthorized scraping or require LinkedIn credentials. Keep every provider disabled until configured.

Normalize provider results into a private `RecruitJobListing` model containing source, external ID, canonical URL, title, company, location, description, employment type, seniority, posted/expiry dates, salary when supplied, fetched time, and raw-data provenance.

### 3. Job Search Automation

Recreate the uploaded workflow as a configurable Recruit-owned automation:

1. Trigger manually or on the owner's schedule.
2. Load the selected private career profile and base resume.
3. query enabled job providers.
4. Poll asynchronous providers with bounded retries and timeout.
5. Normalize and validate results.
6. Remove duplicates by canonical URL, provider ID, and title/company/location similarity.
7. Exclude expired, blocked, previously dismissed, or already processed jobs.
8. Calculate a transparent match score.
9. Select up to the owner's configured result limit.
10. Optionally create tailored resumes and draft cover letters.
11. Save private job recommendations and generated artifacts.
12. Send a private in-app/email summary only to the owner.

Fix the weaknesses present in the template:

- The setting label and actual limit must agree.
- Polling must have a maximum duration and terminal failure state.
- A failed duplicate lookup must not be treated as proof that a job is new.
- Store the job record and generated artifact atomically or track partial failure explicitly.
- Do not make generated PDFs publicly accessible.
- Do not expose API tokens in workflow records or browser payloads.
- Do not rely on a public LaTeX compiler unless explicitly approved and privacy-reviewed.
- Use the application's private document-generation and storage facilities where possible.

Use an idempotency key based on owner, search-profile version, source, external job ID/canonical URL, base-resume version, and optimizer prompt version.

### 4. Job Matching

Create a provider-independent `RecruitJobMatchProvider` that compares the private career profile/resume with a job listing and returns validated structured data:

- Overall match score
- Matching mandatory/preferred skills
- Missing skills or qualifications
- Experience alignment
- Location/workplace alignment
- Employment-type alignment
- Compensation alignment only when both sides provide values
- Evidence from the resume/profile
- Uncertainties
- Suggested questions to research before applying

Never claim that a score predicts hiring. Do not infer sensitive traits. Keep the explanation visible to the owner.

### 5. Resume Optimizer

Implement the uploaded ATS optimizer as a safe, editable workflow:

- The owner selects a base resume and target job.
- The system extracts role-specific keywords and identifies relevant existing experience.
- It may rewrite summaries and bullets using only facts present in the base resume or owner-confirmed profile.
- It must never invent employers, dates, responsibilities, qualifications, metrics, certifications, or skills.
- Show a diff between the base and tailored resume.
- Flag unsupported claims and require owner confirmation.
- Allow manual editing before generation.
- Generate private DOCX and PDF outputs using a professional, ATS-readable template.
- Preserve the immutable source resume and every tailored version.
- Record target job, model/provider, prompt version, input versions, generation time, and owner approval.

Provide at least two restrained ATS-friendly templates. Do not force LaTeX if the project's existing document-generation system supports DOCX/PDF more reliably.

### 6. Cover Letter Generator

Generate an editable draft using the confirmed career profile and target job:

- Address the role and company when known.
- Connect only genuine experience to stated requirements.
- Avoid invented facts and exaggerated claims.
- Support configurable tone and length.
- Store versions privately and export to DOCX/PDF.

The system must never send a cover letter or submit an application without the owner's explicit confirmation.

### 7. Application Tracker

Support both internal and external applications with:

- Job snapshot
- Source and URL
- Resume and cover-letter versions used
- Applied date
- Current status
- Follow-up date
- Contact people
- Interview dates
- Compensation notes
- Owner notes
- Attachments

Private statuses:

- Interested
- Saved
- Preparing
- Applied
- Screening
- Assessment
- Interview
- Offer
- Accepted
- Rejected
- Withdrawn
- No Response
- Archived

For applications to the organization's own published jobs, show only allow-listed candidate-visible statuses. Do not expose employer pipeline stages, notes, scores, panel feedback, rejection discussions, or other applicants.

External applications are owner-maintained unless an approved provider offers a supported status integration. Never pretend an application was submitted successfully without verifiable confirmation.

### 8. Job Alerts and Summary

Allow daily, weekly, and custom alerts with:

- Search profile
- Delivery time and time zone
- Maximum jobs
- Minimum match score
- Included/excluded sources
- Optional automatic tailored-resume drafts
- Email and in-app delivery controls

Summaries should show company, role, location, posted date, source, match explanation, job link, and private generated artifacts. All links to private files must require authorization or short-lived signed access.

### 9. Career Assistant

Add a private conversational assistant grounded only in:

- The owner's confirmed career profile
- Owner-selected resumes
- Saved jobs
- Application history
- Owner-selected target job descriptions
- Approved career guidance resources

It can help compare jobs, identify skill gaps, prepare application checklists, draft follow-ups, and organize the search. It must not:

- Send messages or applications without confirmation.
- Reveal employer-private Recruit records.
- Claim guaranteed hiring outcomes.
- fabricate experience.
- Use conversation content for employer screening.

Persist conversations under private owner scope with delete/export controls and configurable retention.

### 10. Interview Preparation

Generate private preparation packs from the selected job description and confirmed profile:

- Likely role-specific questions
- Suggested answer outlines based only on real experience
- STAR practice prompts
- Technical/topic revision list
- Questions to ask the interviewer
- Company-research checklist
- Mock interview notes

Clearly label generated questions as preparation suggestions, not leaked or confirmed interview questions.

### 11. Sharing and Privacy

- Job-seeker files are private by default.
- Sharing requires the owner to select a specific artifact, recipient/purpose, and expiration.
- Use revocable, expiring links where supported.
- Never provide an “anyone forever” sharing option.
- Record share creation, access, revocation, and expiry.
- A job seeker must be able to export or delete their private workspace data subject to configured retention/legal-hold rules.
- Employer analytics must not aggregate identifiable private external-job-search activity.

## Dashboard and Reports

Employer dashboard widgets:

- Open requisitions
- Active openings
- New candidates
- Applications by stage
- Interviews today/upcoming
- Offers awaiting approval
- Offers sent/accepted/declined
- Automation failures
- Candidate source distribution
- Time in stage
- Time to shortlist
- Time to offer
- Ageing applications

Job Seeker dashboard widgets:

- New matching jobs
- Saved jobs
- Applications by status
- Follow-ups due
- Upcoming interviews
- Active job alerts
- Recently tailored resumes
- Automation failures
- Profile/resume completeness

Employer reports and Job Seeker insights must use separate query paths. Employer reports must never include private external searches or applications. Reports must support filters, pagination, permission-aware exports, and Recruit-only data. Do not issue direct unbounded database queries from the browser.

## Recruit Settings

Keep all settings scoped to the organization and Recruit module:

- Feature enablement
- Candidate/application number formats
- Pipeline stages
- Rejection reasons
- Source channels
- Retention period
- Consent text
- Resume size/types
- Duplicate rules
- ATS score rubric and weights
- AI provider/model and prompt version
- Automation schedules and batch size
- Email templates
- Interview reminders
- Offer approval flow
- Offer templates
- Connector configuration
- Report defaults
- Job Seeker Workspace enablement
- Allowed internal job visibility
- Approved external job providers
- Job-search automation limits
- Private data retention defaults
- Owner sharing rules
- Resume and cover-letter templates
- Career Assistant provider and limits

Secrets must use the existing secret manager/environment configuration and must never be returned to the client, committed, logged, or stored as plain settings values.

## Suggested Data Ownership

Use the project's ORM and naming conventions. Create Recruit-owned equivalents of:

- `RecruitJobRequisition`
- `RecruitJobOpening`
- `RecruitJobVersion`
- `RecruitCandidate`
- `RecruitCandidateConsent`
- `RecruitCandidateResume`
- `RecruitCandidateEducation`
- `RecruitCandidateExperience`
- `RecruitCandidateSkill`
- `RecruitApplication`
- `RecruitApplicationStageHistory`
- `RecruitScreeningQuestion`
- `RecruitScreeningAnswer`
- `RecruitScreeningRun`
- `RecruitScreeningResult`
- `RecruitInterview`
- `RecruitInterviewPanel`
- `RecruitInterviewFeedback`
- `RecruitAssessment`
- `RecruitAssessmentAttempt`
- `RecruitOffer`
- `RecruitOfferApproval`
- `RecruitAttachment`
- `RecruitNote`
- `RecruitTag`
- `RecruitAutomationRun`
- `RecruitAutomationRunItem`
- `RecruitNotification`
- `RecruitAuditEvent`
- `RecruitSetting`
- `RecruitHandoffPackage`
- `RecruitJobSeekerProfile`
- `RecruitJobSearchProfile`
- `RecruitJobListing`
- `RecruitSavedJob`
- `RecruitJobMatch`
- `RecruitJobSeekerResume`
- `RecruitTailoredResume`
- `RecruitCoverLetter`
- `RecruitJobSeekerApplication`
- `RecruitJobAlert`
- `RecruitCareerConversation`
- `RecruitCareerMessage`
- `RecruitInterviewPrep`
- `RecruitPrivateShare`

Every organization-owned table must include the repository's tenant identifier and be tenant-filtered server-side. Every Job Seeker table must additionally include and enforce its owner identifier. Add appropriate unique constraints, foreign keys, indexes, timestamps, soft-delete/version fields, and concurrency controls.

Avoid foreign keys from existing module tables into Recruit. Where Recruit references an existing organization, user, branch, department, or designation, keep that dependency one-way from Recruit.

## API and Service Boundaries

- Keep business logic in Recruit services, not page components or route handlers.
- Validate all inputs with the repository's schema-validation library.
- Use transactions for stage transitions, offer approvals, duplicate merges, and multi-record updates.
- Enforce tenant scope and permission scope in every server operation.
- Use cursor pagination or the repository's established scalable pagination pattern.
- Rate-limit public application endpoints and protect uploads.
- Verify MIME type, extension, size, and file signature.
- Prevent formula injection in CSV/XLSX exports.
- Redact secrets and sensitive content from logs and errors.
- Do not expose storage object keys directly if the project uses signed URLs.

## Events and Notifications

Recruit may emit only namespaced events such as:

- `recruit.job.created`
- `recruit.job.published`
- `recruit.candidate.created`
- `recruit.application.stage_changed`
- `recruit.screening.completed`
- `recruit.interview.scheduled`
- `recruit.feedback.submitted`
- `recruit.offer.approved`
- `recruit.offer.sent`
- `recruit.offer.accepted`
- `recruit.jobseeker.search.completed`
- `recruit.jobseeker.job.saved`
- `recruit.jobseeker.resume.generated`
- `recruit.jobseeker.application.updated`
- `recruit.jobseeker.alert.delivered`

No existing module should subscribe to these events in this task.

Notifications must be generated and displayed through a Recruit-owned adapter or category. Confirm that no current HRMS notification workflow is triggered accidentally.

Job Seeker events and notifications must be private to their owner. Do not include external-job-search activity in employer notifications, administrator dashboards, HR reports, or general employee activity feeds.

## Auditability

Audit:

- Creation, edits, imports, exports, downloads, parsing, screening, score overrides, stage changes, merges, interview actions, feedback, offer actions, settings, permission-sensitive access, retention actions, and automation retries.
- Actor, tenant, action, entity type/ID, timestamp, request/correlation ID, changed fields, reason, and source.
- Never record secrets or unnecessary full resume content in audit payloads.

## Retention and Candidate Rights

Implement Recruit-owned retention support:

- Configurable retention deadline.
- Candidate consent status and evidence.
- Export candidate data.
- Delete or anonymize candidate data when authorized.
- Legal-hold flag if the organization requires it.
- Scheduled retention preview and manual approval before destructive cleanup unless the repository already has an approved policy engine.

Do not claim legal compliance automatically. Add a clear administrator note that policies and templates require review for the organization's jurisdiction.

## Migration and Rollback Safety

- Migrations must be additive and limited to Recruit-owned tables, enums, indexes, and permissions.
- Do not rename, delete, or repurpose existing columns or enums.
- Seed only Recruit permissions, default stages, reasons, settings, and optional demo data.
- Never clear or replace existing production data.
- Include a rollback/disable strategy in `docs/recruit/IMPLEMENTATION.md`.

## Testing

Add focused tests for:

- Feature flag and navigation isolation
- Recruit RBAC on UI and server
- Tenant isolation
- Candidate creation and validation
- Secure resume upload and parsing failures
- Duplicate detection and audited merge
- Application stage transition rules
- AI structured-output validation and prompt-injection resistance
- Idempotent automation runs
- Partial batch failure and retry
- Score override audit trail
- Interview scheduling and permission boundaries
- Offer approval/revision state machine
- Secure file access
- Export formula-injection prevention
- Retention/anonymization behavior
- Confirmation that hired/accepted candidates do not create employee or payroll records
- Confirmation that Recruit events do not trigger existing module workflows
- Owner isolation for career profiles, searches, resumes, applications, conversations, and generated artifacts
- Employer inability to access employee external-job-search activity without an exceptional audited permission
- Employer-private screening data never appearing in Job Seeker APIs or pages
- Explicit-consent snapshot when applying to an internal job
- Job-provider normalization, deduplication, timeout, and partial failure
- Job-search automation idempotency
- Resume optimizer diff and unsupported-claim prevention
- Private PDF/DOCX authorization and expiring share links
- Internal application candidate-visible status allow-list
- Confirmation that no application or message is sent without owner approval

Run the repository's formatter, linter, type checker, unit tests, integration tests, database checks, and production build. Use browser automation to verify the principal Recruit workflow in desktop and mobile layouts and both themes.

## Required End-to-End Acceptance Scenario

Demonstrate:

1. Enable Recruit through its feature flag.
2. As an employer, create a requisition and approve/publish the job.
3. Add an employer-owned candidate and upload a resume.
4. Review parsed fields and confirm them.
5. Create an employer-owned application.
6. Run ATS screening and view the evidence-based score.
7. Move the application through screening and interview.
8. Submit panel feedback.
9. Draft, approve, and send an offer.
10. Record offer acceptance and mark the application hired.
11. View the unsubmitted Recruit handoff package.
12. As an employee/job seeker, create a private career profile and explicitly import selected HRMS fields.
13. Upload a base resume and configure two job-search profiles.
14. Search internal and configured external jobs.
15. Run the scheduled-search workflow and verify deduplication, matching, saved recommendations, and a private summary.
16. Tailor a resume for a selected job, review the diff, edit it, and generate private DOCX/PDF files.
17. Generate a cover-letter draft and interview-preparation pack.
18. Track an external application without exposing it to the employer.
19. Apply to the organization's published job after reviewing and consenting to a submission snapshot.
20. Verify the employer sees only the submitted snapshot and the job seeker sees only allow-listed status updates.
21. Verify a second employee, manager, recruiter, HR administrator, and normal system administrator cannot access the first employee's private career records through UI or API.
22. Prove no employee, payroll, attendance, leave, appraisal, AMS, CRM, accounting, or onboarding record/workflow was created or changed.
23. Disable Recruit and prove the rest of HRMS works unchanged.

## Deliverables

- Complete working Recruit section.
- Complete Employer Workspace and private Job Seeker Workspace.
- Additive database migration and safe seed.
- Recruit-specific services, APIs, pages, components, validators, adapters, queues/jobs, permissions, and tests.
- `docs/recruit/IMPLEMENTATION.md` with architecture, isolation boundaries, setup, configuration, data model, workflow states, AI safeguards, provider adapters, security controls, test evidence, and rollback instructions.
- `docs/recruit/WORKFLOW.md` with Recruit workflow diagrams and status-transition tables.
- `.env.example` additions containing names only and safe descriptions, never real secrets.
- A concise final report listing changed files, migrations, commands run, test/build results, known limitations, and proof of module isolation.

## Definition of Done

The task is complete only when both Recruit workspaces work end to end; employer, tenant, and private owner boundaries are enforced server-side; uploaded and generated documents remain private; AI decisions are explainable and human-controlled; no external application or communication occurs without confirmation; automation is idempotent and observable; tests pass; the production build succeeds; and the existing Monolith Engine workflows continue to behave exactly as before.

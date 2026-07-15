# Build the Monolith Customer Portal — Phase 1: CHA Shipment Portal

Create a production-ready customer portal for the existing **Monolith Engine**. In Phase 1, the portal must support only the **CHA module**, particularly shipment tracking, customer document submission, checklist approval, queries, notifications, customer-facing contacts, and post-completion service ratings.

The architecture must be modular so that CRM, Finance, Freight Forwarding, HRMS, invoices, payments, reports, and other Monolith modules can be added later without redesigning the entire portal.

This is not a UI prototype. Implement the complete frontend, backend, database models, APIs, authentication, authorization, notification workflows, document handling, audit logs, validations, loading states, error handling, responsive behavior, automated tests, and integration with the existing CHA module.

## 1. Begin by Understanding the Existing System

Before making changes:

1. Inspect the existing Monolith repository.
2. Review:

   * Existing authentication and session management
   * Customer Master models and pages
   * CHA job and shipment models
   * Filing workflow configuration
   * Workflow nodes, stages and status calculation
   * Document upload and preview functionality
   * Checklist approval workflow
   * Query and notification systems
   * Employee, manager, TL and job-owner assignments
   * Existing RBAC and organization isolation
   * Existing UI components and `design.md`
3. Identify reusable components instead of creating duplicate systems.
4. Create a temporary `plan.md` containing:

   * Existing architecture
   * Required database changes
   * API changes
   * Portal route structure
   * Security considerations
   * Implementation sequence
   * Test plan
5. Make a safety commit before modifying the repository.
6. Delete `plan.md` after implementation and verification.

Do not change existing CHA behavior unless required for portal integration.

---

# 2. Portal Architecture

Create a separate customer-facing route group, such as:

```text
/customer-portal
/customer-portal/login
/customer-portal/activate
/customer-portal/forgot-password
/customer-portal/dashboard
/customer-portal/shipments
/customer-portal/shipments/[shipmentId]
/customer-portal/notifications
/customer-portal/profile
/customer-portal/security
```

The portal must use a separate customer-facing layout and navigation while remaining connected to the same Monolith database and CHA workflows.

The portal must:

* Be isolated from the internal employee interface.
* Never expose internal Monolith routes or APIs.
* Enforce organization-level and customer-level data isolation.
* Ensure customers can access only shipments assigned to their Customer Master record.
* Support multiple portal users under one customer.
* Support customers with multiple simultaneous shipments.
* Be designed so future portal modules can be added through navigation and permissions without rebuilding the portal shell.

---

# 3. Customer Portal Access in Customer Master

Add a new **Customer Portal** section to the existing Customer Master page.

Include:

* `Enable Customer Portal` toggle
* Portal status:

  * Disabled
  * Invitation pending
  * Active
  * Temporarily suspended
  * Revoked
* Customer portal users
* Customer contact name
* Customer contact email
* Contact designation
* Invitation date
* Invitation status
* Last login
* Last password change
* Access suspended date and reason
* Resend invitation action
* Reset access action
* Suspend access action
* Revoke access action
* Add another portal user action

The portal user email must come from the Customer Master contact records. Do not create unrelated or duplicate customer email records.

A customer may have multiple authorized contacts, with each person receiving their own portal account. Never use one shared login for an entire customer company.

When portal access is enabled:

1. Validate that the selected customer contact has a valid email.
2. Create a customer portal account linked to:

   * Organization
   * Customer
   * Customer contact
3. Send an account activation email.
4. Record the invitation in the audit log.
5. Show the invitation status inside Customer Master.

Disabling or suspending portal access must immediately prevent future logins without deleting historical approvals, uploads, ratings or audit records.

---

# 4. Authentication and Password Security

The original requirement proposed using `Password@123`. Do not use a shared default password in production.

Use this secure onboarding flow:

1. Send a unique, single-use activation link to the email stored in Customer Master.
2. The link must expire after a configurable period.
3. The customer creates their password during activation.
4. The email must be verified before portal access is activated.
5. Store only a securely hashed password.
6. Never store, display, log, email or expose the customer’s readable password.
7. Monolith employees must never be able to view customer passwords.

The internal credential-management section may store only:

* Account activation status
* Last password changed date
* Password reset requested date
* Failed login count
* Account lock status
* Email verification status
* MFA or email OTP status
* Active session information

Also implement:

* Forgot-password flow
* Single-use password-reset links
* Password strength validation
* Compromised/common-password rejection
* Login rate limiting
* Temporary lockout after repeated failures
* Session expiration
* Secure cookies
* Session revocation
* Logout from all devices
* Audit logging for login, logout, reset, activation and failed access
* Optional email OTP or MFA capability
* Protection against account enumeration

For local development only, a temporary development credential may be supported, but it must never work in staging or production.

---

# 5. Customer Portal Dashboard

Design an elegant, information-rich dashboard inspired by premium logistics tracking platforms, courier services and international shipment portals.

The dashboard must immediately show:

* Welcome message with customer company name
* Number of active shipments
* Number of completed shipments
* Shipments requiring customer action
* Documents awaiting internal verification
* Checklists awaiting customer approval
* Open queries
* Recent notifications
* Recently updated shipments

Separate shipments clearly into:

* Active Shipments
* Action Required
* Completed Shipments

Customers may have multiple active shipments at the same time. Make navigation and identification easy using:

* Job number
* Shipment reference
* Import/export type
* Air/sea type
* Customer reference
* Origin
* Destination
* Current stage
* Last updated time
* Assigned customer-facing contact

Example dashboard tables:

### Active Shipments Table

| Job Number | Shipment Reference | Customer Reference | Mode | Trade Type | Origin | Destination | Current Stage | Pending Action | Last Updated | Customer-Facing Contact |
|---|---|---|---|---|---|---|---|---|---|---|
| CHA-2026-00125 | SHP-NHAVA-4482 | PO-78451 | Sea | Import | Shanghai | Nhava Sheva | Documents Under Verification | Awaiting document validation | 2026-07-15 10:45 AM | Priya Nair |
| CHA-2026-00131 | SHP-DEL-AIR-991 | REF-AIR-229 | Air | Export | Delhi | Dubai | Checklist Awaiting Customer Approval | Approve checklist | 2026-07-15 09:20 AM | Arun Menon |
| CHA-2026-00142 | SHP-CHN-7781 | CUST-CH-118 | Sea | Import | Singapore | Chennai | Customs Processing | No action pending | 2026-07-14 06:10 PM | Meera Joseph |

### Completed Shipments Table

| Job Number | Shipment Reference | Customer Reference | Mode | Trade Type | Origin | Destination | Completion Date | Final Status | Rating Status | Last Updated | Customer-Facing Contact |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CHA-2026-00084 | SHP-MAA-2210 | INV-23091 | Sea | Export | Chennai | Colombo | 2026-07-10 | Shipment Completed | Rating Pending | 2026-07-10 05:40 PM | Priya Nair |
| CHA-2026-00079 | SHP-BOM-1944 | CN-88210 | Air | Import | Frankfurt | Mumbai | 2026-07-08 | Shipment Completed | Rated | 2026-07-08 03:15 PM | Arun Menon |
| CHA-2026-00071 | SHP-KOC-1733 | JOB-55302 | Sea | Import | Jebel Ali | Kochi | 2026-07-05 | Shipment Completed | Rated | 2026-07-05 11:05 AM | Meera Joseph |

Do not show confidential or unnecessary internal information.

---

# 6. Shipment Listing

Create a shipment page with these tabs:

* Active
* Action Required
* Completed
* All Shipments

Provide:

* Search
* Status filters
* Import/export filter
* Air/sea filter
* Date filter
* Sort by recently updated
* Sort by creation date
* Sort by completion date

Allow both card and table views where appropriate.

Every shipment entry should show:

* Shipment or job number
* Customer reference
* Shipment type
* Clearance type
* Current customer-visible status
* Current milestone
* Progress indicator
* Last update
* Pending customer actions
* Assigned customer-facing contact

Recommended table fields by tab:

### Active Tab Data Table

| Column | Purpose |
|---|---|
| Job Number | Primary shipment identifier shown to the customer |
| Shipment Reference | Operational shipment reference visible to the customer |
| Customer Reference | Customer's own PO, invoice, or booking reference |
| Shipment Type | Import or export shipment classification |
| Clearance Type | Air or sea clearance mode |
| Current Customer-Visible Status | Friendly status derived from workflow mapping |
| Current Milestone | Current stage label shown in the tracker |
| Progress Indicator | Percent or stage-progress representation |
| Pending Customer Actions | Upload, approval, clarification, or response required |
| Last Update | Most recent customer-visible update timestamp |
| Assigned Customer-Facing Contact | Named support contact visible in portal |

### Completed Tab Data Table

| Column | Purpose |
|---|---|
| Job Number | Historical shipment identifier |
| Shipment Reference | Historical shipment reference |
| Customer Reference | Customer's original business reference |
| Shipment Type | Import or export classification |
| Clearance Type | Air or sea clearance mode |
| Completion Date | Date the shipment was marked completed |
| Final Customer-Visible Status | Final closed status shown to the customer |
| Timeline Summary | Short completion or closure summary |
| Rating Status | Pending, submitted, reopened, or closed |
| Last Update | Final customer-visible activity timestamp |
| Assigned Customer-Facing Contact | Contact responsible during completion or closure |

Completed shipments must remain accessible as read-only historical records.

---

# 7. Shipment Details and Visual Tracking

Create a premium shipment details page with a customer-friendly visual tracking experience.

The top section should show:

* Shipment number
* Current status
* Shipment type
* Import/export
* Origin and destination
* Last updated time
* Customer reference
* Current milestone
* Customer-facing summary
* Pending customer action, when applicable

Create a prominent visual shipment progress tracker inspired by established delivery-tracking systems.

Possible customer-facing stages include:

* Job Created
* Documents Awaited
* Documents Under Verification
* Checklist Preparation
* Checklist Awaiting Customer Approval
* Filing Initiated
* Customs Processing
* Assessment
* Examination
* Duty Processing
* Out of Charge
* Delivery Processing
* Shipment Completed

These stages must not be hardcoded.

Derive the progress from the existing configurable CHA filing workflow, nodes and edges. Add a mapping layer that converts internal workflow stages into understandable customer-facing labels.

The settings must allow administrators to configure:

* Whether a stage is visible to customers
* Customer-facing stage name
* Customer-facing description
* Stage order
* Whether the responsible contact is shown
* Whether a stage can trigger customer notifications
* Which internal statuses map to each customer-facing status

Internal workflow loops and rework must continue to function, but customers should see a clear and understandable progress representation.

Show:

* Completed stages
* Current active stage
* Upcoming stages
* Stage timestamps
* Duration at each completed stage
* Customer-visible remarks
* Delays or holds
* Required customer action
* Last customer-visible update

Do not expose internal-only remarks, employee discussions, risk notes or confidential operational details.

---

# 8. Timeline

Add a detailed shipment timeline containing customer-visible events such as:

* Shipment created
* Documents requested
* Customer document uploaded
* Document accepted
* Document rejected or clarification requested
* Checklist shared
* Checklist approved
* Checklist sent for rework
* Filing completed
* Customs stage updated
* Query created
* Query answered
* Shipment held
* Shipment resumed
* Delivery completed
* Shipment closed
* Rating submitted

Every event should include:

* Event title
* Customer-friendly description
* Date and time
* Status icon
* Related document, where applicable
* Responsible customer-facing department or contact, where appropriate

Timeline data must be generated from actual system events and audit records. Do not create fake milestone updates.

---

# 9. Document Upload and Verification

Customers must be able to upload shipment documents requested by the CHA team.

This is one of the limited write actions permitted in the otherwise read-only portal.

For each required document, show:

* Document name
* Description
* Whether it is mandatory
* Upload status
* Uploaded version
* Uploaded date
* Verification status
* Internal reviewer’s customer-visible comment
* Re-upload requirement

Document statuses:

* Not uploaded
* Uploaded
* Under review
* Accepted
* Rejected
* Clarification required
* Re-upload requested
* Superseded

The customer must be able to:

* Drag and drop files
* Browse and upload files
* Preview supported files
* Download their uploaded files
* Replace a rejected file with a new version
* Add a comment during upload
* View customer-visible review comments

The customer must not be able to:

* Delete an accepted historical document
* Modify internal documents
* Change document verification statuses
* View documents belonging to another customer
* Access raw storage URLs without authorization

The internal CHA user must be able to:

* Preview the uploaded document
* Accept it
* Reject it
* Request clarification
* Request re-upload
* Add a customer-visible comment
* Add a separate internal-only remark

All document versions must be retained with audit history.

Use secure file validation, configurable file-type restrictions, configurable size limits, signed access URLs and authorization checks on every request.

---

# 10. Checklist Customer Approval

Integrate the existing CHA checklist approval workflow into the portal.

When a checklist is ready for customer approval:

* Show it under `Action Required`.
* Send an in-portal notification.
* Send an email notification.
* Display the complete customer-visible checklist.
* Allow the customer to preview related supporting files.
* Clearly display the approval deadline, when configured.

The customer may:

* Approve the checklist
* Reject or request correction
* Add remarks
* Attach supporting documents when requesting correction

Before approval, show a confirmation dialog explaining that the customer is confirming the displayed information.

After submission:

* Lock the approval response.
* Record the approving customer portal user.
* Record customer, job, timestamp, IP information and remarks.
* Update the internal CHA checklist workflow immediately.
* Notify the assigned internal team.
* Add the event to the shipment timeline.

The customer must not be able to edit the actual checklist fields directly.

---

# 11. Queries and Notifications

Create a unified Queries and Notifications experience.

Queries may include:

* Missing document request
* Incorrect document
* Clarification request
* Checklist correction
* Customs-related customer clarification
* Delivery-related requirement
* General shipment update

Show each query with:

* Query title
* Shipment reference
* Description
* Raised date
* Raised by department
* Priority
* Current status
* Required response date
* Attachments
* Customer response
* Resolution

Query statuses:

* Open
* Awaiting customer response
* Customer responded
* Under review
* Resolved
* Closed

The portal is read-only except when a query specifically requires customer input. For those queries, allow the customer to:

* Reply
* Upload supporting documents
* Submit the response

Customers must not be allowed to modify or delete existing messages, queries or system records.

Notifications must be generated for:

* Shipment stage changes
* Document requests
* Document acceptance or rejection
* Checklist approval requests
* Query creation
* Query updates
* Hold or delay updates
* Shipment completion
* Rating request

Provide:

* Unread notification count
* Mark as read
* Mark all as read
* Notification filters
* Direct navigation to the related shipment, document, checklist or query
* Email notification preferences for permitted notification types

Updates should appear in near real time using the existing realtime architecture. Use Server-Sent Events, WebSockets or an equivalent reliable mechanism, with controlled polling only as a fallback.

---

# 12. Contact and Escalation Information

Customers must know whom to contact when a shipment is stopped, delayed or waiting at a particular stage.

For the current stage, show:

* Responsible department
* Primary customer-facing contact
* Contact designation
* Business email
* Business phone number, when authorized
* Escalation contact
* Office hours
* Expected response time, when configured

Only contacts explicitly marked as customer-facing may be displayed.

Do not expose:

* Private employee contact details
* Internal team hierarchy
* Internal employee notes
* Personal mobile numbers unless specifically approved
* Internal-only assignees
* Sensitive escalation discussions

Allow the internal CHA team to configure customer-facing contacts by:

* Branch
* Shipment
* Stage
* Department
* Customer account

---

# 13. Shipment Completion and Customer Rating

When a shipment is marked completed:

1. Move it from Active Shipments to Completed Shipments.
2. Preserve its full customer-visible timeline.
3. Show a completion summary.
4. Enable a service rating form.
5. Send a rating notification.

The rating should measure services actually rendered for that shipment.

Include configurable rating categories such as:

* Overall service
* Communication
* Shipment update transparency
* Documentation support
* Response time
* Timeliness
* Issue resolution
* Professionalism

Use a 1-to-5 rating scale and allow customer remarks.

The rating form must show only categories applicable to that shipment.

Store:

* Shipment ID
* Customer ID
* Organization ID
* Portal user ID
* Category ratings
* Overall rating
* Remarks
* Submitted date
* Applicable services
* Internal follow-up status

Allow one final rating submission per shipment. An administrator may reopen the rating only through an audited internal action.

---

# 14. CHA Module Changes for Ratings and Feedback

Inside the internal CHA module:

1. Add an `Overall Rating` column to the relevant shipment/job list.
2. Add a `Customer Remarks` column or preview.
3. Add filters for:

   * Rated
   * Not rated
   * Low rating
   * Rating range
4. Add a feedback panel on the shipment details page.
5. Show category-level ratings.
6. Show customer remarks.
7. Show the submitting customer contact.
8. Show the submission date.
9. Allow an internal follow-up owner and follow-up status.
10. Preserve all changes in an audit log.

Do not allow internal users to modify the original customer rating or remarks.

---

# 15. Confidentiality and Visibility Rules

The customer portal must never expose confidential Monolith information.

Do not show:

* Internal cost
* Purchase price
* Selling price
* Profit or margin
* Vendor cost
* Internal quotations
* Operational expense requests
* Employee-only remarks
* Internal checklist comments
* Internal approval discussions
* Internal audit logs
* Internal risk classifications
* Other customers
* Unpublished documents
* Employee compensation
* Internal permissions
* Database identifiers
* Raw storage paths
* Hidden workflow nodes
* Internal system errors or stack traces

Create explicit customer-visibility fields or policies instead of displaying internal fields and hiding them only through CSS.

Every portal API must enforce customer visibility on the server.

---

# 16. Portal Permissions

The portal should be read-only except for these explicitly authorized actions:

* Activate account
* Change own password
* Reset own password
* Upload requested shipment documents
* Replace rejected documents
* Respond to queries that require customer input
* Approve or reject customer checklists
* Submit shipment ratings
* Update permitted notification preferences

The customer must never be able to:

* Create, edit or delete CHA jobs
* Change shipment stages
* Edit timelines
* Modify internal remarks
* Change assigned employees
* Approve internal workflow stages
* Modify document verification decisions
* Delete approvals
* Change ratings after final submission
* Access another customer’s data

Use server-side permission checks for every action.

---

# 17. Suggested Data Models

Integrate with existing models where possible. Do not duplicate existing Customer, Job, Document, Checklist or Notification models unnecessarily.

Introduce or extend models for:

* `CustomerPortalAccount`
* `CustomerPortalUser`
* `CustomerPortalInvitation`
* `CustomerPortalSession`
* `CustomerVisibleStageMapping`
* `CustomerVisibleShipmentUpdate`
* `CustomerDocumentSubmission`
* `CustomerDocumentVersion`
* `CustomerChecklistResponse`
* `CustomerQueryThread`
* `CustomerQueryResponse`
* `CustomerPortalNotification`
* `ShipmentServiceRating`
* `ShipmentRatingCategory`
* `CustomerPortalAuditLog`

Every relevant model must contain `organizationId` and `customerId` where required for tenant isolation.

Use proper foreign keys, indexes, cascading rules and uniqueness constraints.

---

# 18. Design Direction

The portal must look premium, elegant, trustworthy and modern while remaining consistent with the Monolith visual identity.

Use:

* Clean white surfaces
* Cyan Monolith accent
* Strong typography hierarchy
* Spacious layouts
* Premium shadows
* Subtle borders
* Clear status colors
* Smooth transitions
* Responsive cards
* Elegant milestone timeline
* Professional logistics visuals
* High-quality empty states
* Skeleton loading states

Avoid:

* Excessive gray backgrounds
* Overcrowded layouts
* Generic admin-dashboard appearance
* Excessive glassmorphism
* Unnecessary gradients
* Excessive animations
* Decorative elements that reduce readability
* Large empty spaces
* Horizontal overflow
* Double scrollbars

## 3D Design

Use lightweight 3D elements where they add value, such as:

* Subtle isometric shipment illustrations
* Container, vessel, aircraft or route visuals
* Animated shipment progress
* A lightweight 3D logistics globe on the dashboard
* Depth-based hover effects
* Layered milestone indicators

The 3D design must:

* Remain subtle and professional
* Not block functionality
* Not delay initial page loading
* Have a static fallback
* Respect reduced-motion settings
* Work on lower-powered mobile devices
* Be lazy-loaded
* Avoid unnecessary heavy dependencies

Do not turn the portal into a visual demo at the expense of performance or usability.

---

# 19. Responsive and Accessible Experience

The portal must work correctly on:

* Desktop
* Laptop
* Tablet
* Mobile
* Common modern browsers

Implement:

* Keyboard navigation
* Visible focus states
* Proper form labels
* Semantic HTML
* Screen-reader support
* Sufficient contrast
* Accessible dialogs
* Accessible file uploads
* Reduced-motion support
* Touch-friendly controls

The shipment tracker, timeline, documents and checklist approval must remain usable on mobile screens.

---

# 20. Loading, Empty and Error States

Implement proper states for:

* No active shipments
* No completed shipments
* No notifications
* No documents requested
* No queries
* No ratings available
* Invitation expired
* Portal access disabled
* Portal access suspended
* Unauthorized shipment access
* Network failure
* Upload failure
* Unsupported file
* Session expired
* Checklist already submitted
* Rating already submitted
* Realtime connection unavailable

Never show blank pages, unhandled exceptions, raw API responses or developer error messages to customers.

---

# 21. Audit Logging

Record all significant portal actions:

* Portal enabled
* Portal disabled
* Account invited
* Invitation resent
* Account activated
* Login success
* Login failure
* Password reset
* Password changed
* Session revoked
* Document uploaded
* Document replaced
* Query response submitted
* Checklist approved
* Checklist rejected
* Rating submitted
* Access suspended
* Access restored
* Access revoked

Audit records must include:

* Organization
* Customer
* Portal user
* Related shipment
* Action
* Timestamp
* IP address where appropriate
* User agent where appropriate
* Previous and new status where applicable

Customer users must not be able to view internal audit logs.

---

# 22. Testing Requirements

Implement automated tests for:

## Authentication

* Account activation
* Expired activation link
* Invalid activation token
* Password creation
* Password reset
* Failed login rate limiting
* Disabled account
* Suspended account
* Session expiration
* Cross-customer access prevention

## Shipment Access

* Customer sees only their shipments
* Multiple users under one customer see authorized shipments
* Customer cannot access another customer’s shipment by changing the URL
* Completed and active shipments are correctly separated
* Internal-only fields are never returned by portal APIs

## Documents

* Upload
* Preview
* Version replacement
* Acceptance
* Rejection
* Re-upload request
* Unauthorized file access
* File type validation
* File size validation

## Checklist

* Customer approval
* Customer rejection
* Duplicate submission prevention
* Internal workflow update
* Audit log creation

## Queries and Notifications

* Query creation notification
* Customer response
* Realtime update
* Mark as read
* Email notification
* Unauthorized query access

## Ratings

* Rating enabled only after shipment completion
* One rating per shipment
* Applicable categories only
* Internal CHA list displays rating and remarks
* Original customer feedback cannot be modified

Use unit, integration and end-to-end tests. Add Playwright tests for the main customer journeys.

---

# 23. Performance and Production Readiness

Ensure:

* Fast initial portal load
* Server-side pagination
* Optimized database queries
* No N+1 queries
* Indexed tenant and shipment lookups
* Lazy-loaded 3D elements
* Optimized images
* Secure document delivery
* Realtime connection cleanup
* No repeated connection initialization during navigation
* Proper caching only where customer isolation is preserved
* No hydration errors
* No console errors
* No TypeScript errors
* No broken routes
* No placeholder buttons
* No mock functionality in production
* No hardcoded workflow stages
* No hardcoded customer IDs
* No hardcoded organization IDs
* No hardcoded contact details
* No hardcoded production credentials

Run:

* Lint
* Type checking
* Unit tests
* Integration tests
* End-to-end tests
* Production build
* Database migration validation

Do not consider the task complete until all required flows work and there are no known critical or high-severity defects.

---

# 24. Final Verification Journey

Test this complete journey:

1. Internal user opens Customer Master.
2. Enables Customer Portal for a customer contact.
3. Customer receives an activation email.
4. Customer activates the account and creates a password.
5. Customer logs in.
6. Customer sees only their active and completed shipments.
7. Customer opens an active shipment.
8. Customer sees the correct stage and timeline.
9. Customer uploads a requested document.
10. Internal CHA user previews and accepts or rejects it.
11. Customer receives the update without refreshing.
12. Customer receives a checklist approval request.
13. Customer previews and approves or rejects it.
14. Internal CHA workflow updates immediately.
15. Internal user creates a customer query.
16. Customer receives and responds to the query.
17. Shipment is completed.
18. Shipment moves to Completed Shipments.
19. Customer submits service ratings and remarks.
20. Rating and remarks appear in the internal CHA module.
21. Customer attempts to access another customer’s shipment and is denied.
22. Verify that no confidential cost, pricing or internal information appears in portal APIs or screens.

Finish with a summary containing:

* Files added
* Files changed
* Database migrations
* APIs created
* Security controls added
* Tests added
* Test results
* Build result
* Any remaining non-critical limitations
* Future extension points for other Monolith modules
# 25. Mobile-Responsive PWA and WebView Application

Build the Monolith Customer Portal as a **mobile-first Progressive Web App (PWA)** that works as:

* A responsive website
* An installable mobile application
* A standalone application launched from the device home screen
* An optional WebView-based Android and iOS application
* A shared codebase for desktop, tablet and mobile

The portal must not be designed as a desktop website that is later compressed for mobile. Every major customer workflow must be designed and tested for mobile screens from the beginning.

## Recommended Architecture

Use the PWA as the primary application architecture.

If app-store distribution is required, wrap the same PWA using a maintained native container such as Capacitor rather than maintaining separate Android and iOS applications.

The architecture should support:

```text
Monolith Customer Portal
├── Responsive Web Portal
├── Installable PWA
├── Android WebView Wrapper
└── iOS WebView Wrapper
```

All versions must use the same secure APIs, authentication, permissions, shipment data and CHA workflows.

Do not duplicate business logic inside the mobile wrapper.

---

## Mobile-First Responsive Design

Support the following screen ranges:

* Small mobile devices
* Standard mobile devices
* Large mobile devices
* Tablets
* Laptops
* Desktop monitors

Implement responsive layouts using fluid sizing and appropriate breakpoints.

On mobile:

* Replace the desktop sidebar with bottom navigation or a mobile drawer.
* Keep primary actions within thumb reach.
* Avoid horizontal scrolling.
* Use full-width cards.
* Stack shipment information vertically.
* Convert large tables into responsive shipment cards.
* Use sticky action bars where appropriate.
* Keep touch targets sufficiently large.
* Use bottom sheets instead of oversized desktop dialogs.
* Ensure dialogs fit within the viewport.
* Prevent controls from being hidden behind the mobile keyboard.
* Respect device safe areas and display cut-outs.
* Preserve readable text without requiring zoom.
* Use compact spacing without making the interface crowded.

Suggested mobile navigation:

* Home
* Shipments
* Actions
* Notifications
* Profile

The `Actions` item should show pending:

* Document uploads
* Checklist approvals
* Query responses
* Clarifications
* Service ratings

Display an unread badge where appropriate.

---

## Mobile Shipment Dashboard

On mobile, the dashboard must show:

* Active shipment count
* Required customer actions
* Recent shipment updates
* Open queries
* Completed shipments
* Latest notifications

Use horizontally scrollable summary cards only when necessary. Do not use horizontal scrolling for essential shipment content.

Shipment cards should clearly show:

* Shipment number
* Customer reference
* Current stage
* Import or export
* Air or sea
* Last update
* Progress
* Pending actions
* Contact person

Customers must be able to open a shipment using one tap.

---

## Mobile Shipment Tracking

The shipment progress tracker must adapt to small screens.

On desktop, it may use a horizontal or expanded timeline.

On mobile, use a clear vertical milestone tracker showing:

* Completed stages
* Current stage
* Upcoming stages
* Date and time
* Stage description
* Delay status
* Customer action required
* Customer-facing contact

Do not shrink a desktop timeline until it becomes unreadable.

Use expandable milestone cards for additional details.

The current stage must remain visually prominent without requiring the customer to scroll through the entire timeline.

---

## Mobile Document Upload

Document upload must work well from mobile devices.

Allow customers to:

* Select files from device storage
* Upload files from the photo gallery
* Capture documents using the device camera
* Preview uploaded images
* Preview supported PDF documents
* Replace rejected documents
* Add upload remarks
* Track upload progress
* Retry failed uploads

When camera capture is used:

* Allow front and rear camera access where supported.
* Guide the customer to capture the complete document.
* Show a preview before upload.
* Allow retaking the image.
* Compress large images without making text unreadable.
* Preserve the original document where required.

Handle:

* Slow mobile connections
* Interrupted uploads
* Duplicate uploads
* Unsupported formats
* Oversized files
* Application backgrounding during upload

Use resumable or retryable uploads where practical.

Never expose storage credentials or unrestricted file URLs to the mobile client.

---

## Mobile Checklist Approval

Checklist approval must be optimized for mobile.

The customer must be able to:

* Review checklist information section by section
* Expand and collapse long sections
* Preview supporting documents
* Enter remarks
* Upload correction documents
* Approve the checklist
* Reject or request changes

Before final submission:

* Show a clear summary.
* Require confirmation.
* Prevent accidental double submission.
* Disable the button while submission is processing.
* Show a success receipt after submission.

The submitted approval must immediately appear in the internal CHA workflow.

---

## Mobile Queries and Notifications

Queries must be displayed in a mobile-friendly conversation format.

Show:

* Query subject
* Shipment reference
* Priority
* Current status
* Date raised
* Required response date
* Customer-visible message history
* Attachments
* Response controls

Allow customers to respond using:

* Text
* File upload
* Camera-captured document
* Supported attachments

Provide real-time or near-real-time updates without requiring manual refresh.

Use pull-to-refresh as a fallback interaction, not as the primary update mechanism.

---

## Progressive Web App Requirements

Implement the portal as a complete installable PWA.

Include:

* Web application manifest
* Application name
* Short name
* Description
* Monolith customer portal icons
* Maskable icons
* Theme colour
* Background colour
* Standalone display mode
* Portrait and landscape support where appropriate
* Application shortcuts
* Start URL
* Scope configuration
* Service worker
* Offline fallback page
* Update detection
* Installation prompt handling

Suggested application shortcuts:

* Active Shipments
* Pending Actions
* Upload Documents
* Notifications

The installed PWA should open without browser navigation controls and feel like a dedicated customer application.

Use Monolith branding consistently for:

* App icon
* Splash screen
* Login screen
* Loading screen
* Offline screen
* Notification icon

---

## PWA Installation Experience

Provide a non-intrusive installation experience.

Show an `Install Monolith Portal` option when the device and browser support installation.

Do not repeatedly show the installation prompt after the customer dismisses it.

Add installation guidance for environments where automatic prompts are unavailable.

Provide an installation option inside:

```text
Profile → Install Application
```

Track only necessary installation events, without collecting excessive customer data.

---

## Offline Behaviour

The portal should not pretend that live shipment information is available while offline.

Allow safe offline access only to appropriate previously loaded information, such as:

* Application shell
* Customer profile summary
* Recently viewed shipment summaries
* Previously loaded customer-visible timeline
* Previously opened notifications
* Previously opened checklist preview, when permitted

Do not cache:

* Passwords
* Authentication tokens in insecure storage
* Sensitive internal data
* Confidential documents without explicit security controls
* Another customer’s data
* Raw API responses containing internal fields

When offline:

* Clearly display an offline status.
* Show when the visible shipment data was last updated.
* Prevent approvals that require live validation.
* Queue only actions that are safe to retry.
* Warn the user before storing a response for later submission.
* Revalidate all queued actions when connectivity returns.

Critical actions such as checklist approval, password changes and final rating submission should normally require a live connection.

---

## PWA Update Management

Implement safe application update handling.

When a newer application version is available:

* Inform the customer that an update is ready.
* Allow the user to reload the application safely.
* Do not refresh while a document is uploading.
* Do not refresh while a checklist or query response is being submitted.
* Prevent outdated application versions from sending incompatible requests.
* Handle database and API version compatibility properly.

Display a customer-friendly message rather than exposing technical service-worker errors.

---

## Push Notifications

Add support for web push notifications where supported.

Customers may receive notifications for:

* Shipment stage updates
* New document requests
* Document accepted
* Document rejected
* Checklist approval request
* New query
* Query response
* Shipment delay or hold
* Shipment resumed
* Shipment completed
* Rating request

Push notification permission must be requested only after explaining its value.

Do not request notification permission immediately on the login screen.

Allow customers to manage notification preferences from:

```text
Profile → Notification Preferences
```

Each notification should deep-link to the relevant:

* Shipment
* Document
* Checklist
* Query
* Rating page

Do not include confidential shipment information in lock-screen notification text.

Use a safe notification message such as:

```text
A new update is available for shipment CHA-2026-00125.
```

Do not expose confidential document names, customs comments or sensitive customer information in push notifications.

---

## WebView-Based Mobile Application

Prepare the PWA so it can be packaged as an Android and iOS WebView application.

Use a secure native wrapper rather than a simple unrestricted browser container.

The wrapper must support:

* Secure login
* File selection
* Camera capture
* PDF preview
* Download handling
* Push notifications
* Deep links
* External link handling
* Network status
* Application version checks
* Safe-area support
* Back-button behaviour
* Splash screen
* Monolith app icon
* Biometric unlock as a future optional feature

The WebView application must:

* Load only approved Monolith domains.
* Block navigation to untrusted domains within the WebView.
* Open external websites in the system browser.
* Disable unnecessary WebView debugging in production.
* Prevent access to local files unless specifically required.
* Validate every deep link.
* Use HTTPS only.
* Use secure cookie and session handling.
* Avoid exposing authentication tokens to JavaScript unnecessarily.
* Clear sensitive session data during logout.
* Detect expired or revoked sessions.
* Prevent screenshots on highly sensitive screens when required by policy.

Do not hardcode production URLs inside multiple files. Use environment-based configuration.

---

## App Links and Deep Links

Support secure links such as:

```text
https://portal.monolith.example/shipments/[shipmentId]
https://portal.monolith.example/actions/checklists/[checklistId]
https://portal.monolith.example/queries/[queryId]
```

When the PWA or mobile app is installed:

* Open the related application screen.
* Validate that the logged-in customer is authorized.
* Redirect unauthenticated users to login.
* Return the user to the requested page after successful login.

Never grant access based only on possession of a URL.

---

## Mobile Authentication

Optimize authentication for mobile devices.

Include:

* Email-based account activation
* Secure password creation
* Password manager compatibility
* Show/hide password control
* Forgotten-password flow
* Session expiration warning
* Logout from current device
* Logout from all devices
* Optional device recognition
* Optional biometric unlock for the native wrapper

Do not store customer passwords in the PWA, local storage or native WebView application.

Do not store long-lived authentication tokens in insecure browser storage.

Use secure, HTTP-only cookies where compatible with the architecture.

When biometric unlock is added, it should unlock a secure existing session. It must not replace server-side authentication or store the customer’s password.

---

## Mobile Performance

The application must perform well on mid-range mobile devices and slower networks.

Implement:

* Route-level code splitting
* Lazy loading
* Image optimization
* Compressed payloads
* Paginated shipment lists
* Skeleton loading states
* Optimized font loading
* Limited initial JavaScript
* Deferred 3D components
* Efficient realtime connections
* Request cancellation during navigation
* Cached static assets
* Reduced animations on low-powered devices

Do not load the 3D globe or other decorative assets before essential shipment information.

Set measurable performance targets for mobile and verify them using production builds.

Avoid:

* Large animation libraries for minor effects
* Uncompressed images
* Continuous background animation
* Multiple duplicate API requests
* Reopening realtime connections on every route change
* Large client-side data collections
* Rendering all shipment timelines simultaneously

---

## Responsive 3D Elements

The 3D design must scale according to the device.

On desktop:

* Allow richer logistics illustrations.
* Display an interactive globe or route visual where useful.

On mobile:

* Use a lighter simplified version.
* Reduce polygon count and texture size.
* Disable continuous animation when the application is in the background.
* Pause animation outside the viewport.
* Provide a static fallback.
* Respect reduced-motion preferences.
* Never place essential shipment information inside a 3D-only interface.

3D elements must remain decorative and supportive. Shipment status must always be available as standard accessible text.

---

## Mobile Accessibility

Ensure mobile accessibility through:

* Screen-reader labels
* Logical swipe order
* Large touch targets
* Accessible bottom navigation
* Visible focus states
* Sufficient contrast
* Zoom support
* Dynamic text support where possible
* Properly labelled document upload controls
* Accessible approval confirmation
* Reduced-motion support
* Error messages associated with their fields

Do not rely only on colour to show shipment status.

Use text labels and icons together.

---

## Mobile Security Testing

Add security and functionality tests for:

* PWA installation
* Manifest validation
* Service-worker updates
* Offline fallback
* Cache isolation between customers
* Logout cache clearing
* Push notification authorization
* Deep-link authorization
* WebView navigation restrictions
* Camera and file permissions
* Session revocation
* Cross-customer shipment access
* Background and foreground session handling
* Interrupted document upload
* Duplicate checklist submission
* Application update during active upload
* Expired session after restoring the application

Verify that logging out one customer does not leave their shipment details or documents accessible to the next user on the same device.

---

## Mobile End-to-End Verification

Test the following journey on Android, iOS and responsive browser sizes:

1. Customer receives an invitation email.
2. Customer opens the activation link on mobile.
3. Customer creates a password.
4. Customer logs in.
5. Customer installs the PWA.
6. Customer enables notifications.
7. Customer views multiple active shipments.
8. Customer opens a shipment using a push-notification deep link.
9. Customer views the vertical shipment timeline.
10. Customer captures a document using the phone camera.
11. Customer previews and uploads the document.
12. Internal CHA user reviews the document.
13. Customer receives the document-status update.
14. Customer reviews and approves a checklist.
15. Customer responds to a query with an attachment.
16. Customer temporarily loses network connectivity.
17. The portal displays an accurate offline state.
18. Connectivity returns and the portal refreshes safely.
19. Shipment is completed.
20. Customer receives a rating request.
21. Customer submits ratings and remarks.
22. Customer logs out.
23. Confirm that cached private data is no longer accessible.
24. Open the same flow through the optional WebView application.
25. Verify camera, documents, notifications, links and back-button behaviour.

The mobile application is not complete until every major CHA customer workflow works smoothly without switching to a desktop device.

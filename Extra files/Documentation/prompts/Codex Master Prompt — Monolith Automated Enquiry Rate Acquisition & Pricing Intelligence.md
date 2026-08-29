# CODEX MASTER IMPLEMENTATION PROMPT

## Monolith Engine — Automated Enquiry Rate Acquisition, Agent Intelligence, Costing & Pricing System

You are working inside the existing **Monolith Engine** codebase.

Your task is to transform the existing Enquiry Details → Rates workflow into a production-grade:

**Agent Rate Acquisition → Email Tracking → Reply Parsing → Rate Comparison → AI Recommendation → Buy Rate Finalization → Costing → Pricing Intelligence → Quotation**

system.

---

# CRITICAL EXECUTION RULE

## DO NOT IMPLEMENT THIS ENTIRE FEATURE IN ONE GO.

This implementation MUST be completed **phase by phase**.

You are prohibited from jumping ahead.

For every phase:

1. Inspect the existing implementation first.
2. Understand relevant database models.
3. Understand existing services.
4. Understand APIs/server actions.
5. Understand the Communication module.
6. Understand Agent Master.
7. Understand Employee/Reporting hierarchy.
8. Understand Enquiry.
9. Understand Quotation.
10. Understand the existing Design System.
11. Reuse existing architecture wherever possible.
12. Implement ONLY the current phase.
13. Run tests/build/type checks.
14. Audit your own implementation.
15. Fix problems found.
16. Give me a detailed completion report.
17. STOP.
18. Wait for my explicit instruction:

**CONTINUE TO NEXT PHASE**

Do not proceed automatically.

---

# ABSOLUTE REPOSITORY RULE

Work on the **currently checked-out branch only**.

Do NOT:

- create another branch
- switch branches
- create a staging branch
- create a temporary feature branch
- checkout `main`
- modify Git history
- reset unrelated work
- discard changes belonging to another developer/agent

Before making changes run appropriate repository inspection commands such as:

`git status`

and identify the active branch.

Continue on that branch.

There may be other work happening inside the same Monolith repository.

Therefore:

- inspect before modifying
- avoid broad refactors unrelated to this feature
- do not overwrite unrelated changes
- do not revert code simply because you did not create it
- make narrowly scoped changes
- preserve backwards compatibility wherever possible

---

# SOURCE MATERIAL

The implementation requirements are based on:

1. Existing Monolith Engine
2. Existing Enquiry Details page
3. Existing Communication module
4. Existing Agent Master
5. Existing Quotation workflow
6. Existing employee reporting hierarchy
7. Existing design system
8. `email format.pdf`
9. `Enquiry Tab - Charges list.docx`
10. `Standard rates in quote.docx`

Inspect these files when available in the project/reference directory.

Do not invent values where the supplied documents are ambiguous.

The supplied email format contains different enquiry structures for:

- LCL
- FCL
- Air

The supplied charge list contains different charge structures for:

- Import LCL
- Import FCL
- Import Air
- Export LCL
- Export FCL
- Export Air

The supplied Standard Rates document contains initial standard buy-rate references.

These documents are a starting point, not a reason to hardcode everything into UI components.

---

# TARGET BUSINESS WORKFLOW

The final business workflow will be:

**Enquiry Created**

↓

**Identify required services and charges**

↓

**Recommend suitable agents**

↓

**Salesperson selects one or more agents**

↓

**Generate structured enquiry email**

↓

**Send individual emails to agents**

↓

**Automatically CC salesperson's manager**

↓

**Track email delivery/open/reply**

↓

**Receive agent replies**

↓

**Parse email + attachments**

↓

**Extract and normalize rates**

↓

**Populate Agent Responses**

↓

**Compare multiple agents**

↓

**Recommend best commercial option**

↓

**Salesperson accepts or overrides**

↓

**Finalize Buy Rates**

↓

**Unlock Rates & Costing Worksheet**

↓

**Set Sell Rates**

↓

**Calculate margin / markup / profit**

↓

**Pricing recommendation**

↓

**Finalize Pricing**

↓

**Create Quotation using existing quotation workflow**

↓

**Store outcome as historical commercial intelligence**

---

# IMPORTANT CHANGE TO CURRENT ENQUIRY PAGE

Currently the Enquiry Details page displays the:

**Rates and costing worksheet**

too early.

This must change.

The Rates & Costing Worksheet should only become available after usable agent rates have been received/manual rates entered and **Buy Rates have been finalized**.

Before that stage the main workflow should focus on:

**Agent Rate Enquiry**

and

**Agent Responses**

---

# FINAL ENVISIONED ENQUIRY TABS

Eventually the Enquiry Details commercial area should contain:

1. Overview
2. Rate Requests
3. Agent Responses
4. Rate Comparison
5. Costing
6. Quotation
7. Activity

Do not necessarily implement all tabs in Phase 1.

Implement them according to the phased plan below.

---

# =====================================================================
# PHASE 0 — COMPLETE ARCHITECTURE & GAP AUDIT
# =====================================================================

## THIS PHASE MUST BE COMPLETED FIRST.

Do NOT implement the business feature yet.

Your first task is to inspect Monolith thoroughly.

Identify the current architecture and prepare the implementation plan.

---

## Audit these areas

### Enquiry

Find:

- Enquiry schema/model
- Enquiry details page
- enquiry status
- enquiry number generation
- shipment type
- import/export
- air/ocean
- LCL/FCL
- commodity
- dimensions
- package count
- weight
- CBM
- container details
- Incoterm
- POL
- POD
- airports
- enquiry attachments
- salesperson ownership

---

### Existing Rates / Costing

Find:

- existing rates worksheet
- current Ocean Freight/CFS/VGM implementation
- rate persistence
- departmental rate handling
- quotation readiness
- quotation versions
- existing costing logic

Determine what can be reused and what must be replaced.

---

### Agent Master

Find:

- agent entity
- contacts
- email addresses
- country
- branch
- supported ports
- service types
- shipment modes
- previous jobs
- relationships to quotations/jobs
- active/inactive status

Identify data missing for future agent intelligence.

---

### Communication Module

Inspect thoroughly.

Find:

- email composer
- rich text editor
- To/CC/BCC
- attachments
- mail sending infrastructure
- Gmail/SMTP/API integration
- inbound email synchronization
- thread IDs
- message IDs
- reply handling
- notifications
- email signatures
- drafts
- sent mail persistence

The Enquiry Rate Request composer should reuse the same communication infrastructure wherever possible.

DO NOT build a parallel email application.

---

### Employees / HRMS

Find:

- employee identity
- salesperson ownership
- manager relationship
- reporting manager
- user/account mapping
- RBAC
- notification recipient system

This will be required for automatic manager CC.

---

### Quotation

Inspect:

- quotation creation
- quotation versions
- quotation charge structure
- customer-facing rate lines
- tax
- currency
- inclusions
- exclusions
- approvals
- customer sharing

The new Costing workflow must feed the existing quotation system rather than replacing it.

---

### Notifications

Find:

- in-app notifications
- realtime implementation
- event bus
- websocket/SSE if present
- email notification infrastructure

---

### Background processing

Find:

- queue
- cron
- worker
- background jobs
- event system
- webhook handlers

Email parsing should eventually run asynchronously.

---

### AI infrastructure

Check whether Monolith already contains:

- OpenAI
- Anthropic
- AI SDK
- structured output
- embeddings
- vector database
- prompt infrastructure

Do not introduce redundant AI infrastructure.

---

### Database

Map relevant models and relationships.

Do not create duplicate concepts.

---

### Design System

Inspect the existing Monolith design-system page/components.

Future UI must reuse:

- typography
- spacing
- cards
- tables
- tabs
- badges
- dropdowns
- modals
- editor components
- buttons
- tooltips
- alerts
- loading states

---

## Phase 0 Deliverable

Create a report containing:

### A. Current Architecture

### B. Existing reusable components

### C. Existing reusable services

### D. Existing database models

### E. Gaps

### F. Proposed database changes

### G. Proposed services

### H. Proposed API/server actions

### I. Proposed UI architecture

### J. Proposed phased migration strategy

### K. Files expected to be modified

### L. Risks

### M. Backwards compatibility considerations

### N. Dependencies between phases

Do not begin Phase 1.

STOP after completing Phase 0.

---

# =====================================================================
# PHASE 1 — ENQUIRY COMMERCIAL WORKFLOW FOUNDATION
# =====================================================================

Only start when explicitly instructed.

Goal:

Build the foundation before introducing email or AI.

---

## Implement commercial workflow state

Create/extend enquiry commercial statuses such as:

- READY_FOR_RATE_REQUEST
- RATE_REQUESTS_SENT
- AWAITING_AGENT_RATES
- PARTIALLY_RECEIVED
- RATES_RECEIVED
- RATE_COMPARISON
- RATE_FINALIZED
- PRICING
- QUOTATION_READY

Do not break existing statuses.

Use backwards-compatible mapping if necessary.

---

## Dynamic Charge Catalogue

Create a configurable canonical charge catalogue.

It must support:

- charge name
- canonical code
- service mode
- Import/Export
- Air/Ocean
- LCL/FCL
- permitted units
- mandatory/optional
- display order
- active/inactive

Seed based on:

### Import LCL

- Ocean Freight — W/M
- Origin CFS — W/M
- Origin charges — BL
- Pick up charges — BL
- Export License — BL
- LCL — W/M
- DO — BL
- Custom clearance — BL
- Loading & Unloading — BL
- CFS — W/M
- Documentation — BL
- Insurance — BL
- Transportation — Shipment

### Import FCL

- Ocean Freight — Container
- EXW charges — Container
- HBL Manifestation — BL
- HBL DO — BL
- Custom clearance — Container
- CFS — Container
- DO — Container
- Insurance — BL
- Transportation — Container

### Import Air

- Air Freight — Kg
- Origin charges — BL
- Pick up charges — BL
- HAWB Manifestation — BL
- HAWB DO — BL
- Custom clearance — BL
- Airline DO — BL
- AAI charges — BL
- Insurance — BL
- Transportation — Shipment

### Export LCL

- Ocean Freight — W/M
- THC — W/M
- BL — BL
- Custom clearance — BL
- Loading & Unloading — BL
- CFS — BL
- Phytosanitary charges — BL
- Fumigation — BL
- Insurance — BL
- Transportation — Shipment

### Export FCL

- Ocean Freight — Container
- THC — Container
- BL — BL
- VGM — Container
- MUC — Container
- Seal — Container
- Surrender BL — BL
- Custom clearance — Container
- Loading & Unloading — Container
- CFS — Container
- Phytosanitary charges — Container
- Fumigation — Container
- Insurance — BL
- Empty container pick up — Container
- Transportation — Container

### Export Air

- Air Freight — Kg
- OTHC — BL
- AMS — BL
- AWB — BL
- Custom clearance — BL
- AAI charges — BL
- Insurance — BL
- Transportation — Shipment

---

## Dynamic rate requirements

Based on Enquiry:

`Direction + Mode + Load Type`

automatically determine which charges should appear.

Allow:

**+ Add Additional Charge**

for non-standard commercial charges.

Do not delete/hide previous manually added charges when enquiry data changes without warning.

---

## UI foundation

Change the current Enquiry commercial area.

Before Buy Rate finalization:

display:

**Rate acquisition pending**

rather than exposing the full costing worksheet as the primary workflow.

Create placeholders/navigation for future:

- Rate Requests
- Agent Responses
- Rate Comparison
- Costing

Costing should be disabled/locked initially.

---

## Phase 1 Acceptance

Verify:

- Import LCL generates correct charge list
- Import FCL generates correct list
- Import Air generates correct list
- Export LCL generates correct list
- Export FCL generates correct list
- Export Air generates correct list
- additional charges can be added
- existing enquiries do not break
- quotation system still works
- no regressions

STOP.

---

# =====================================================================
# PHASE 2 — AGENT RATE REQUEST COMPOSER
# =====================================================================

Goal:

Allow Sales to send structured rate requests from Enquiry.

---

## Reuse Communication composer

Do not independently recreate the mail editor.

Extract/reuse the existing Communication compose system.

The experience should visually match the Communication module.

---

## Recipient selector

Create:

**Select Agents**

Agents must be loaded from Agent Master.

Support:

- search
- multiple agents
- contact person
- email
- country
- ports
- service mode
- status

Allow manual email addition where required.

Mark manually entered addresses:

**External email — not linked to Agent Master**

---

## Critical sending behavior

If salesperson selects:

8 agents

the system should NOT create one email with all 8 visible.

Instead create:

8 separate outgoing emails.

User interaction:

**Send to 8 Agents**

Backend behavior:

Agent A → separate message  
Agent B → separate message  
Agent C → separate message  
etc.

This ensures:

- privacy
- independent tracking
- independent threads
- independent response time
- correct rate attribution

---

## Automatic manager CC

Determine enquiry salesperson.

Resolve their reporting manager through existing employee hierarchy.

Automatically add manager to CC.

The salesperson may:

- remove CC if permissions permit
- add other recipients
- add additional CC contacts

Do not hardcode manager emails.

---

## Subject

The enquiry number is mandatory.

Recommended format:

`ENQ-XXXXX | Rate Request | POL → POD | Export FCL`

If user edits the subject, ensure enquiry number remains included.

---

## Email templates

Implement structured template selection.

Automatically choose based on enquiry type.

### LCL

Include:

- Port of Loading
- Port of Destination
- Commodity
- Weight
- Dimensions
- Number of Packages
- Volume
- Incoterm
- Notes
- Attachments

### FCL

Include:

- Port of Loading
- Port of Destination
- Commodity
- Weight
- Container type
- Incoterm
- Notes
- Attachments

### Air

Include:

- Airport of Loading
- Airport of Destination
- Commodity
- Weight
- Dimensions
- Number of Packages
- Incoterm
- Notes
- Attachments

Follow the structure supplied in `email format.pdf`.

---

## Template variables

Support tokens such as:

- `{{enquiry_number}}`
- `{{pol}}`
- `{{pod}}`
- `{{airport_loading}}`
- `{{airport_destination}}`
- `{{commodity}}`
- `{{gross_weight}}`
- `{{chargeable_weight}}`
- `{{dimensions}}`
- `{{packages}}`
- `{{volume}}`
- `{{container_type}}`
- `{{container_count}}`
- `{{incoterm}}`
- `{{cargo_ready_date}}`
- `{{notes}}`
- `{{salesperson_name}}`

Prefill all available fields.

Leave unavailable information blank or omit it cleanly.

Never fabricate data.

---

## Manual editing

The generated email must remain completely editable.

Support existing Communication features such as:

- rich text
- attachments
- signature
- draft
- preview

where available.

---

## Phase 2 Acceptance

Test:

- one agent
- multiple agents
- manual email
- manager CC
- template auto-selection
- subject
- editable content
- attachments
- separate messages sent correctly

STOP.

---

# =====================================================================
# PHASE 3 — EMAIL TRACKING & REPLY CORRELATION
# =====================================================================

Goal:

Track outbound requests and associate replies with enquiries.

---

## Track each recipient

Store:

- enquiry
- agent
- recipient
- message ID
- thread ID
- send time
- delivery state
- bounce
- opened if supported
- first open
- last open
- reply status
- reply timestamp

---

## Open tracking

Implement only if compatible with the existing email infrastructure.

Treat email opens as **best-effort**.

Do not represent open tracking as guaranteed human reading.

---

## Reply matching

Replies should resolve using strongest available identifiers:

1. message/thread ID
2. email headers
3. enquiry reference
4. sender
5. subject
6. fallback classification

Avoid relying only on the subject.

---

## Notifications

When reply arrives notify:

- enquiry salesperson
- reporting manager

Example:

`ABC Logistics replied to ENQ-10482`

Use existing notification system.

---

## Agent Responses UI

Create:

| Agent | Status | Sent | Opened | Replied | Response Time |
|---|---|---|---|---|---|

Statuses:

- Sent
- Delivered
- Opened
- Replied
- Failed
- Bounced

Click opens the actual communication thread.

---

## Phase 3 Acceptance

Test:

- reply in same thread
- changed subject
- reply-all
- agent reply from alternate contact
- bounce
- duplicate sync/webhook
- multiple agents replying

STOP.

---

# =====================================================================
# PHASE 4 — RATE RESPONSE STORAGE + MANUAL EXTRACTION
# =====================================================================

Do NOT introduce full AI parsing yet.

First create deterministic structured rate storage.

---

## Create response model

Each Agent Response needs:

- enquiry
- agent
- message
- received date
- currency
- validity
- carrier
- routing
- transit
- remarks

And many rate lines:

- canonical charge
- original description
- amount
- currency
- unit
- quantity basis
- minimum
- tax
- included/excluded
- notes

---

## Manual response entry

Allow salesperson to manually enter rates from an agent reply.

This ensures the business workflow works even when AI is unavailable.

---

## Charge aliases

Implement:

`External Charge Name → Canonical Charge`

Example:

`Terminal Handling Fee`

→

`THC`

Store alias mappings.

Allow user confirmation.

---

## Phase 4 Acceptance

Verify complete rate capture can be performed without AI.

STOP.

---

# =====================================================================
# PHASE 5 — AI EMAIL & ATTACHMENT RATE PARSER
# =====================================================================

Goal:

Automate Phase 4.

---

## AI service architecture

Do NOT place prompts directly in React components.

Create a dedicated service.

Use structured schemas.

AI input may include:

- plain text email
- HTML email
- supported PDF attachment text
- spreadsheet content
- Word document content

---

## Extract

Attempt to extract:

- charge name
- amount
- currency
- unit
- quantity
- container
- minimum
- tax
- validity
- transit
- carrier
- routing
- free days
- inclusions
- exclusions
- remarks

---

## Evidence

Every extracted rate must retain:

- source email
- source attachment
- original phrase/value
- extraction confidence

Never store unexplained AI-generated financial numbers.

---

## Confidence handling

Conceptually:

High confidence → eligible for automatic mapping after deterministic validation

Medium confidence → mapped but requires review

Low confidence → manual confirmation

Thresholds should be configurable.

---

## AI rule

AI MUST NEVER INVENT:

- missing amount
- currency
- unit
- validity
- charge
- tax
- container

If missing:

store:

`Not Provided`

---

## Phase 5 Acceptance

Test with:

- plain text
- HTML table
- PDF
- spreadsheet
- multiple currencies
- ambiguous charges
- omitted units
- revised rates

STOP.

---

# =====================================================================
# PHASE 6 — STANDARD RATE MASTER + "AS AGREED" HANDLING
# =====================================================================

Create configurable:

**Standard Buy Rate Master**

Do not permanently hardcode Word document values into application logic.

Fields:

- canonical charge
- direction
- mode
- LCL/FCL
- currency
- unit
- rate
- effective from
- effective to
- branch
- active status
- revision

Seed only values that can be mapped confidently from:

`Standard rates in quote.docx`

---

## Important rule

If agent says:

`Standard charges applicable`

the applicable standard values may be populated.

BUT:

Explicit agent amount ALWAYS overrides standard master.

Example:

Standard CFS = ₹20,000

Agent explicitly says:

CFS = ₹18,750

Use:

₹18,750

Preserve standard ₹20,000 as reference only.

---

## Phase 6 Acceptance

Test:

- standard charges
- as agreed
- explicit overrides
- expired standard rates
- multiple standard-rate versions

STOP.

---

# =====================================================================
# PHASE 7 — RATE NORMALIZATION & AGENT COMPARISON
# =====================================================================

Create the Rate Comparison workspace.

Normalize commercial values before comparing.

---

## Normalize

Account for:

- currencies
- exchange rates
- per CBM
- W/M
- per BL
- per AWB
- per shipment
- per KG
- per container
- container type
- minimum charges
- mandatory surcharges
- taxes where required

Preserve original values.

---

## Comparison table

Example:

| Charge | Agent A | Agent B | Agent C | Best |
|---|---:|---:|---:|---|
| Ocean Freight | | | | |
| THC | | | | |
| BL | | | | |
| VGM | | | | |

Allow:

### Select entire agent

or

### Select per charge

Example:

Ocean Freight → Agent A  
Custom Clearance → Agent B  
Transportation → Agent C

---

## Missing charges

Highlight:

- missing mandatory charge
- unclear inclusions
- unclear exclusions
- mismatched currency
- invalid unit
- rate validity issue

Do not make an incomplete quotation appear cheaper simply because mandatory charges are absent.

---

## Landed Buy Cost

Calculate comparable total procurement cost.

---

## Phase 7 Acceptance

STOP after comparison and deterministic recommendation calculations work.

---

# =====================================================================
# PHASE 8 — AGENT PERFORMANCE & RECOMMENDATION ENGINE
# =====================================================================

Now introduce Agent Intelligence.

---

## Track performance

At minimum:

- number of requests
- response %
- median response time
- complete rate %
- clarification %
- competitiveness
- selection %
- booking %
- operational outcome where available
- dispute %
- billing variance
- rate validity quality

Calculate contextually.

An agent should not have only one meaningless global score.

Evaluate by:

- route
- origin
- destination
- mode
- Import/Export
- FCL/LCL/Air
- commodity
- period

---

## Agent recommendation

When a new enquiry is created rank appropriate agents based on:

- route fit
- shipment type
- commodity
- historical price
- response speed
- reliability
- recency
- successful bookings
- operational outcomes

Display explanation.

Example:

`Recommended because this agent handled 11 similar FCL enquiries, responded within a median of 42 minutes, and supplied commercially competitive rates in 73% of recent cases.`

---

## Never use a black-box unexplained score

Display contributing factors.

---

## Phase 8 Acceptance

STOP.

---

# =====================================================================
# PHASE 9 — AI BEST-RATE RECOMMENDATION
# =====================================================================

AI can now combine deterministic commercial data with historical intelligence.

Do NOT simply select cheapest visible amount.

Consider:

- landed buy cost
- completeness
- validity
- response time
- operational reliability
- historical rate competitiveness
- booking history
- data confidence

Weights must be configurable.

---

## Recommendation explanation

Example:

**Recommended: ABC Logistics**

Reasons:

- lowest complete landed rate
- ₹3,850 below next complete offer
- 100% mandatory charge coverage
- 7-day longer validity
- 94% historical reliability

---

## Manual override

User must always be able to override.

Capture optional reason:

- customer preference
- preferred carrier
- better transit
- credit terms
- operational reliability
- relationship
- management decision
- other

This becomes historical learning data.

---

## Phase 9 Acceptance

STOP.

---

# =====================================================================
# PHASE 10 — BUY RATE FINALIZATION
# =====================================================================

Create a versioned:

**Finalized Buy Rate**

snapshot.

Store per line:

- agent
- charge
- amount
- original currency
- normalized currency
- unit
- validity
- source
- AI recommendation
- user selection
- override
- timestamp

Version:

R1  
R2  
R3

Never overwrite historical commercial decisions.

---

## Phase 10 Acceptance

Only once Buy Rate is finalized can Costing unlock.

STOP.

---

# =====================================================================
# PHASE 11 — ADVANCED RATES & COSTING WORKSHEET
# =====================================================================

Replace the current simplistic rate worksheet with:

| Charge | Buy Rate | Source | Sell Rate | Profit | Markup % | Margin % |
|---|---:|---|---:|---:|---:|---:|

---

## Buy rate

Auto-populated from finalized procurement rates.

Show source agent.

Allow authorized override only with audit history.

---

## Sell rate

User may manually input.

Later pricing intelligence provides recommendation.

---

## Calculations

### Profit

`Sell Rate - Buy Rate`

### Markup %

`Profit / Buy Rate × 100`

### Margin %

`Profit / Sell Rate × 100`

---

## Summary

Show:

- Total Buy
- Total Sell
- Gross Profit
- Markup %
- Margin %
- profit per service
- contribution by charge

Create meaningful visualizations using existing Monolith design components.

---

## Phase 11 Acceptance

STOP.

---

# =====================================================================
# PHASE 12 — PRICING INTELLIGENCE
# =====================================================================

Use historical Monolith data to recommend Sell Rates.

Consider:

- current buy
- customer
- route
- commodity
- shipment type
- container
- historical quotations
- historical wins
- historical losses
- margin
- recent comparable quotes
- recency

Avoid training solely from user-entered sell rates.

Eventually use actual business outcomes.

---

## Suggested pricing scenarios

Where enough information exists show:

### Aggressive

Higher probability of conversion.

### Recommended

Balanced margin/conversion.

### Premium

Higher profitability target.

Clearly explain calculations.

---

## Phase 12 Acceptance

STOP.

---

# =====================================================================
# PHASE 13 — HISTORICAL RATE INTELLIGENCE
# =====================================================================

Build reusable Rate Intelligence.

Salesperson should be able to input basic shipment information while speaking with customer.

Search using:

- origin
- destination
- mode
- import/export
- LCL/FCL
- container
- commodity
- weight
- CBM
- customer
- timeframe

Return:

- recent buy rates
- recent sell rates
- winning quotations
- median
- range
- last successful quote
- approximate current range

Clearly label:

**Historical indication — not a confirmed current rate**

Add:

**Create Enquiry from this search**

---

## Phase 13 Acceptance

STOP.

---

# =====================================================================
# PHASE 14 — QUOTATION INTEGRATION
# =====================================================================

Integrate finalized Sell Rates into the existing quotation workflow.

Do NOT create another quotation system.

Transfer:

- enquiry
- customer
- shipment
- finalized sell charges
- currency
- tax
- validity
- inclusions
- exclusions
- remarks
- commercial snapshot

Buy rates must NEVER leak into customer-facing quotation.

---

## Preserve quotation versions

Pricing change should create the appropriate quotation version using current Monolith behavior.

STOP.

---

# =====================================================================
# PHASE 15 — ACTIVITY TIMELINE & COMPLETE AUDIT
# =====================================================================

Create unified Enquiry commercial activity.

Example:

10:02 — Enquiry created  
10:08 — 6 agents selected  
10:10 — rate requests sent  
10:18 — Agent A opened  
10:34 — Agent B replied  
10:35 — parser extracted 11 rates  
10:42 — charge mapping confirmed  
11:10 — rate comparison completed  
11:18 — agent selection finalized  
11:25 — buy rate finalized  
11:40 — pricing finalized  
11:51 — quotation V1 created

---

## Audit everything important

Record:

- sender
- recipients
- CC
- template
- content
- attachments
- reply
- extracted rate
- confidence
- alias mapping
- standard-rate substitution
- rate selection
- AI recommendation
- override
- buy-rate version
- sell-rate version
- quotation
- timestamps
- user

STOP.

---

# =====================================================================
# PHASE 16 — AUTOMATION & FOLLOW-UP
# =====================================================================

Implement configurable follow-up functionality.

Examples:

- Awaiting Reply
- Follow up due
- Response overdue
- Rate expiring

Allow:

**Follow Up Non-Responders**

Again send independent agent messages.

---

## Missing rate detection

If reply is incomplete:

show:

**Missing Charges**

Generate:

**Request Missing Rates**

containing only missing commercial information.

STOP.

---

# =====================================================================
# PHASE 17 — HARDENING, SECURITY & PERFORMANCE
# =====================================================================

Conduct a dedicated security and architecture pass.

Check:

- RBAC
- buy-rate visibility
- cross-enquiry data leakage
- agent data leakage
- customer data leakage
- HTML sanitization
- attachment security
- mail injection
- prompt injection from agent emails
- malicious attachments
- AI structured output validation
- SQL/database constraints
- concurrency
- duplicate webhook handling
- idempotency
- queue failures
- retry strategy
- transactional consistency

Do not let incoming email instructions influence AI outside the rate extraction task.

Treat email and attachments as **untrusted external content**.

STOP.

---

# =====================================================================
# PHASE 18 — COMPLETE END-TO-END TESTING
# =====================================================================

Run tests for the complete workflow.

Scenario:

Create:

Export  
FCL  
Chennai → Hamburg  
40ft

System determines Export FCL charge structure.

User selects 8 agents.

System recommends appropriate email template.

Manager automatically CC'd.

User edits the message.

User clicks:

**Send Rate Request to 8 Agents**

Eight independent emails are sent.

Agent A replies.

System associates email.

AI extracts rates.

Agent B says:

`Standard charges applicable`

System resolves applicable standard rates.

Agent C says:

`Terminal Handling Fee`

System matches:

`THC`

through confirmed Charge Alias.

Agent D provides ambiguous charge.

System asks user to map it.

Comparison appears.

Normalized landed costs are calculated.

System recommends best commercial option.

User can override.

Buy rates finalized.

Costing unlocks.

Sell rates entered/recommended.

Profit shown.

Pricing finalized.

Quotation created through existing quotation module.

Historical intelligence updated.

---

# TEST ALL EDGE CASES

At minimum:

- multiple agents
- invalid agent email
- agent removed
- duplicate email address
- changed subject
- forwarded email
- alternative agent sender
- multiple enquiry IDs
- one email containing several container rates
- several currencies
- minimum charges
- all-in rates
- included charges
- excluded charges
- `as agreed`
- `same as previous`
- missing currency
- missing unit
- revised quote
- expired rates
- spreadsheet attachment
- PDF attachment
- Word attachment
- duplicated inbound message
- CC reply
- agent starts a new email
- unusual rate names
- low AI confidence
- standard rate override
- user override
- quotation revision

---

# =====================================================================
# PHASE 19 — FINAL CODEBASE AUDIT
# =====================================================================

After all earlier phases are complete perform a final audit.

Check for:

- duplicate code
- duplicate models
- dead components
- dead APIs
- unused dependencies
- unsafe AI calls
- N+1 queries
- race conditions
- stale cache
- missing indexes
- broken permissions
- inconsistent design patterns
- mobile/desktop issues
- browser zoom overlap
- TypeScript errors
- lint errors
- build errors
- migration errors
- test failures

Fix all issues discovered.

Do not broaden the scope into unrelated Monolith refactoring.

---

# FINAL BUSINESS PRINCIPLES

The finished system must follow these principles.

## 1. Human control

AI recommends.

Humans finalize.

---

## 2. Auditability

Every financial rate must trace back to its source.

---

## 3. No hallucinated commercial values

Missing information remains missing.

---

## 4. Explicit agent rate overrides master rate

Agent's explicit quote wins over generic standard rate.

---

## 5. Rate comparison uses normalized landed cost

Not merely the smallest visible number.

---

## 6. Agent quality is contextual

An agent may be excellent for one lane/service and poor for another.

---

## 7. Historical data decays

More recent comparable rates should have stronger influence.

---

## 8. Actual outcomes matter

Eventually evaluate:

Quoted Buy Rate

vs

Actual Supplier Invoice

and:

Quoted Sell Rate

vs

Actual Sale

and:

Expected Margin

vs

Realized Margin

---

# LONG-TERM LEARNING LOOP

The architecture must support:

**Enquiry**

→ Agent Rate Procurement

→ Buy Rate

→ Sell Rate

→ Quotation

→ Won/Lost

→ Shipment

→ Supplier Invoice

→ Customer Invoice

→ Realized Margin

→ Agent Performance

→ Customer Price Sensitivity

→ Future Agent Recommendation

→ Future Pricing Recommendation

This is the ultimate commercial intelligence loop.

---

# UI REQUIREMENTS

Use the existing Monolith Design System.

Do not introduce arbitrary styling.

Ensure:

- no text overflow
- responsive layouts
- correct browser zoom behavior
- no card overlap
- proper loading states
- skeleton states
- empty states
- error states
- tooltips
- accessible controls
- clear AI confidence indicators
- proper table horizontal behavior
- desktop/laptop optimization

Any genuinely new reusable UI pattern must be reviewed against the existing Design System before implementation.

---

# DATABASE RULE

Before creating any new model:

search the existing schema.

Reuse/extend appropriate entities.

Do not create concepts that already exist.

Database changes must be backwards compatible.

Do not destroy existing enquiries, quotations, communication records or costing information.

Legacy records may be represented as:

**Legacy Costing**

if they cannot safely migrate to the new structure.

---

# MIGRATION RULE

Database migration must NEVER unexpectedly make development unusable.

Before introducing migration:

1. inspect the project's current migration strategy
2. inspect current database state
3. understand whether other work has pending schema changes
4. create backward-compatible migrations
5. do not erase existing data
6. do not reset database without explicit permission
7. do not force destructive migration
8. verify `npm run dev` continues to work

If migration conflicts exist:

STOP

and report:

- exact conflict
- affected migration
- expected resolution

Do not automatically reset the database.

---

# VALIDATION AFTER EVERY PHASE

Run the appropriate available checks, for example:

- TypeScript
- lint
- relevant unit tests
- integration tests
- production build where practical
- schema validation
- targeted runtime testing

Do not simply say:

`Implementation complete`

without validating it.

---

# REQUIRED PHASE COMPLETION REPORT

At the end of EVERY phase respond using this format:

## Phase X Completed

### What I inspected
Explain existing architecture examined.

### What I implemented
Detailed implementation.

### Files created
List files.

### Files modified
List files.

### Database changes
Describe migrations/schema changes.

### Existing systems reused
List reused services/components/models.

### Integrations
Explain communication/enquiry/agent/etc integrations.

### Tests performed
List tests.

### Build status
PASS / FAIL

### TypeScript status
PASS / FAIL

### Lint status
PASS / FAIL

### Issues discovered
List issues.

### Issues fixed
List fixes.

### Remaining risks
List unresolved risks.

### Manual testing required
Give exact testing steps.

### Next Phase
State what the next phase would implement.

Then:

# STOP

Do NOT begin the next phase.

Wait for:

**CONTINUE TO NEXT PHASE**

---

# START NOW

Begin with:

# PHASE 0 — COMPLETE ARCHITECTURE & GAP AUDIT

Do not implement the feature yet.

Study the repository deeply enough to understand how this functionality should fit into Monolith rather than designing an isolated subsystem.

Complete Phase 0, provide the required report, and STOP.
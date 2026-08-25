# Automated Enquiry Rate Acquisition & Pricing Intelligence

Last updated: 2026-08-24
Current phase: `Phase 12 — pricing governance and quote approval traceability`
Overall program status: `Phase 12 completed`
Program progress: `██████████ 100%`
Current phase progress: `██████████ 100%`
Execution rule: Stop here until explicit `CONTINUE TO NEXT PHASE`.

## Live status

| Area | Status | Notes |
| --- | --- | --- |
| Phase 0 audit | Complete | Audit captured in `docs/crm-rate-acquisition-phase-0-audit.md`. |
| Dynamic charge catalogue foundation | Complete | Scenario-based seeded charge lists now derive from enquiry direction, mode, and load type. |
| Additional charge support | Complete | Manual additional charges can be added per department and are preserved in the worksheet model. |
| Commercial workflow state foundation | Complete | Backward-compatible commercial status is now stored alongside the enquiry worksheet snapshot. |
| CRM enquiry commercial UI | Complete | Enquiry commercial area now includes the Phase 2 agent composer, sent-request history, and the dynamic worksheet/costing handoff. |
| Quote compatibility | Complete | Quote creation still works through the current compatibility flow using dynamic charge line items. |
| Phase 2 implementation | Complete | Agent recipient loading, automatic reporting CC, email template generation, tracked outbound rate requests, and sent-history logging are now wired into the enquiry worksheet. |
| Phase 3 implementation | Complete | Gmail thread-aware request tracking, reply/bounce correlation, response notifications, and the Agent Responses table are now wired into the enquiry commercial workflow. |
| Phase 4 implementation | Complete | Structured manual rate-response storage, reusable charge aliases, and deterministic line-item capture are now wired into the enquiry commercial workflow without introducing AI parsing yet. |
| Phase 5 implementation | Complete | A dedicated parser service now extracts reviewable structured drafts from Gmail replies and supported attachment text, keeps evidence plus confidence on each line, and feeds the existing response worksheet for salesperson confirmation. |
| Phase 6 implementation | Complete | A configurable JSON-backed standard buy-rate master now supports `standard charges applicable` and `as agreed`, preserves standard-rate references on saved response lines, and keeps explicit agent amounts as the winning values. |
| Phase 7 implementation | Complete | The worksheet now includes deterministic comparison normalization, landed buy-cost calculations, missing-charge risk flags, per-agent or per-charge recommendation flows, and persisted comparison selections inside the enquiry workflow JSON model. |
| Phase 8 implementation | Complete | The existing agent-recipient composer now ranks agents contextually using historical CRM enquiry workflow evidence, shows explanation-first performance metrics, and keeps recommendation logic transparent instead of using a black-box score. |
| Phase 9 implementation | Complete | The comparison workspace now generates a configurable best-rate recommendation, explains why it was chosen, and captures accept vs override decisions with human reason notes. |
| Phase 10 implementation | Complete | Accepted or overridden buy-rate decisions can now be finalized into immutable `R1/R2/...` snapshot revisions with line-level provenance, revision notes, stored history, and controlled costing unlock. |
| Phase 11 implementation | Complete | The enquiry workflow now stores a pricing worksheet tied to the current finalized buy-rate revision, captures sell-rate and margin decisions line by line, and seeds new quotations from that saved pricing snapshot. |
| Phase 12 implementation | Complete | Quote creation and quote approval now preserve pricing traceability, block stale pricing flow, and surface whether a quotation still matches the current enquiry pricing worksheet. |
| UI migration docs/audits | Complete | Route/status and ownership audits regenerated after the CRM commercial batch. |
| Validation | Complete with noted limits | Focused CRM Phase 12 lint passed and `npm run design-system:verify` passed again on Monday, August 24, 2026. Full repo `tsc --noEmit` is currently blocked by the unchanged generated `.next` route-validator baseline around `/my-payroll`. `src/modules/crm/actions.ts` still carries an unchanged repo-wide `no-explicit-any` baseline if linted as a whole file. Runtime browser verification across Light, Night, and Violet themes remains pending. Vitest is still blocked by the existing `.env.staging.local` guard. |

## Confirmed findings

- The worksheet now derives seeded charges for `Import/Export` plus `Sea/Air` plus `LCL/FCL` scenarios instead of relying only on six hardcoded fields.
- Dynamic charge rows are stored in the enquiry workflow snapshot while legacy flat `rates` remain updated for backward compatibility.
- The enquiry commercial surface now sends tracked agent rate-request emails from the CRM worksheet itself using recipient records from the agent/vendor master.
- Reporting manager and TL email addresses are pulled from the existing HRMS hierarchy and are automatically included in outbound CC handling.
- The user-provided email formats for LCL, FCL, and Air are now reflected in the enquiry template generator, with an editable `{{recipientName}}` token for personalized salutations.
- Each outbound request now stores message/thread identifiers plus delivery and reply-sync metadata so replies can be correlated through Gmail threads before rate extraction exists.
- The worksheet now includes an Agent Responses table with status, sent time, reply time, response-time calculation, bounce detection, and direct thread links into `/communication/mail`.
- New reply detections now notify the enquiry salesperson and reporting manager through the existing notification system.
- Each agent request can now store a deterministic structured response record with received date, currency, validity, carrier, routing, transit, remarks, and normalized line items.
- Sales users can now manually capture response lines without AI, map external charge names into canonical charges, and save reusable alias mappings for later responses.
- Commercial workflow state now advances into `RATE_COMPARISON` as soon as a structured manual response is saved.
- The CRM workflow now includes a dedicated Phase 5 parser service that reads the latest Gmail reply, extracts text from supported email and attachment formats, and drafts structured rate responses with evidence and configurable confidence handling.
- Parsed rate lines now preserve source excerpts, source document names, missing-field markers, confidence labels, and review state before the salesperson confirms the final saved response.
- The worksheet now offers `Parse latest reply` and `Re-parse latest reply` actions so AI-assisted extraction feeds the same deterministic review form instead of creating a separate hidden storage path.
- The standard buy-rate master now lives in `src/modules/crm/config/standard-buy-rates.json`, seeded only with confident rows mapped from `Standard rates in quote.docx` instead of hardcoding those values into workflow logic.
- The parser and response save flow now detect `standard charges applicable` and `as agreed`, attach matching standard-master references, and keep explicit agent amounts as overrides while preserving the standard amount for review.
- Standard-rate selection already supports active flags, effective windows, branch filtering, expired-rate exclusion, and latest-version preference so Phase 6 acceptance cases do not require a schema change.
- The response editor now shows when a line came from the standard master, which trigger phrase caused it, what source document excerpt backed it, and whether the displayed amount is the standard amount or an explicit agent override.
- The CRM workflow now includes a dedicated comparison engine that preserves original values while normalizing comparable amounts for W/M, BL, shipment, KG, and container-based charges.
- The comparison workspace now flags missing mandatory charges, unclear inclusions, invalid units, missing exchange-rate support, container mismatches, and expired validity so an incomplete quote cannot appear cheaper just because key charges are absent.
- The worksheet now calculates landed buy-cost summaries per responding agent, deterministic per-charge best options, and a mixed recommendation across multiple agents when the mandatory charge coverage is comparable.
- Users can now choose an entire agent or a per-charge mix and persist that comparison selection back into `lead.enquiryDetails.rateWorkflow` without introducing Prisma schema changes.
- The existing agent-recipient loader now computes contextual recommendation profiles from historical CRM enquiry workflow data and returns explanation-first metrics like requests, response rate, median response time, completeness, competitiveness, selection rate, booking rate, operational outcome rate, and validity quality.
- The agent-recipient cards in the enquiry composer now surface rank, recommendation reason, similar-enquiry count, response history, and competitiveness directly where the salesperson chooses whom to email.
- Phase 8 recommendation ranking now prefers concrete factors such as similar-enquiry history, response quality, competitiveness, selection history, booking outcomes, and recency instead of showing an opaque black-box score.
- The comparison workspace now includes a dedicated Phase 9 recommendation layer that scores whole-agent and mixed-charge options against configurable landed-cost, completeness, validity, response-speed, and historical-reliability weights.
- Users can now generate a best-rate recommendation, review explanation-first reasoning, and explicitly accept or override the recommendation without finalizing buy rates yet.
- Recommendation acceptance and override decisions are now stored inside `lead.enquiryDetails.rateWorkflow`, including override reason and note capture for future learning loops.
- Accepted or overridden recommendation decisions can now be converted into immutable finalized buy-rate revisions like `R1`, with line-level source response provenance, normalized totals, revision notes, and a current-version pointer stored inside `lead.enquiryDetails.rateWorkflow`.
- Commercial status now advances into `RATE_FINALIZED` when a finalized buy-rate version exists, and costing unlock is stored explicitly by setting `costingLocked: false` on the workflow snapshot.
- The enquiry commercial UI now shows finalized-version history, current finalized totals, costing lock status, and a dedicated Phase 10 revision action instead of treating buy-rate decisions as ephemeral comparison state.
- The CRM workflow now stores a dedicated pricing snapshot linked to the current finalized buy-rate revision, including customer-facing sell rates, quantities, worksheet notes, line notes, and calculated buy/sell/margin totals.
- Commercial status now advances into `PRICING` when a sell-rate worksheet is saved, and quote seeding prefers the saved pricing snapshot before falling back to the older dynamic-charge compatibility flow.
- The enquiry commercial UI now shows a Phase 11 pricing worksheet with editable sell rates, quantity controls, margin summaries, stale-snapshot warnings, and quote-entry actions tied to the saved pricing snapshot.
- Quote generation still works and now converts saved dynamic charge rows into CRM quote line items.
- Quote versions created from CRM enquiries now preserve a structured pricing trace inside `sourceQuotationSnapshot`, including the saved pricing worksheet identity, margin totals, and whether the quote still matches the current enquiry pricing worksheet.
- Quote creation now refuses to create a fresh version from a linked enquiry when the pricing worksheet is missing or stale relative to the current finalized buy-rate revision.
- Manager submission, manager approval, and recorded customer decisions now re-check the linked enquiry pricing state so stale pricing cannot continue through the quote approval path.
- The enquiry pricing panel, quote form, quote detail page, and approval action bar now surface current versus stale pricing state directly for operators and approvers.

## Open items

- Open tracking remains best-effort and is currently represented as unsupported unless the existing infrastructure provides a reliable signal.
- Attachments, draft-save, and full preview remain available in the broader Communication workspace, but this worksheet-specific Phase 2 implementation focuses on tracked sending and CRM state sync.
- Runtime browser verification across Light, Night, and Violet themes is still pending in this Codex session.
- Live mailbox acceptance scenarios from the Phase 3 prompt still need manual verification: same-thread reply, changed subject, reply-all, alternate contact, bounce, duplicate sync, and multiple agents replying.
- Phase 5 parser acceptance still needs real-message verification across plain text, HTML table, PDF, spreadsheet, multiple currencies, ambiguous charges, omitted units, and revised-rate scenarios.
- Phase 6 standard-master acceptance still needs live-reply verification for `standard charges applicable`, `as agreed`, expired standards, multiple revisions, and explicit-overrides-on-top-of-standard-reference behavior.
- Phase 7 comparison acceptance still needs live-reply verification for mixed-currency comparisons with manually configured exchange rates, W/M quantity realism on production enquiry shapes, and salesperson review of whole-agent versus mixed recommendations on actual agent mail.
- Phase 8 recommendation acceptance still needs larger production-history validation for ranking quality, operational-outcome signal quality, and availability of future dispute or billing-variance evidence.
- Phase 9 recommendation acceptance still needs manual verification for whole-agent vs mixed recommendation quality, decision-capture ergonomics, and override-reason usefulness on real enquiries.
- Phase 10 finalized-snapshot acceptance still needs manual verification for repeated revision history creation, override-based finalization, costing unlock behavior, and downstream pricing consumption of the current finalized version.
- Phase 11 pricing acceptance still needs manual verification for pricing edits on real enquiries, saved worksheet refresh after a new finalized revision, and quote seeding from the pricing snapshot.
- Phase 12 pricing-governance acceptance still needs manual verification for stale-pricing blocking across quote creation, manager approval, and customer decision capture after live re-pricing on a linked enquiry.
- Public quote sharing remains blocked by the pending share-token schema rollout, so customer-share hardening beyond internal traceability is still deferred.
- DOCX and PDF extraction remain best-effort and depend on the current runtime capabilities available to the parser host.
- Another agent is active in the monolith codebase, so this phase intentionally avoided `prisma/schema.prisma` and kept the new response model inside `lead.enquiryDetails.rateWorkflow` JSON to reduce merge risk.

## Next actions

1. Review `docs/crm-rate-acquisition-phase-12-report.md` as the implementation handoff for this phase.
2. Run browser verification across Light, Night, and Violet themes for the CRM enquiry pricing panel plus the quote create/detail approval path.
3. Resume only when you want the share-token schema dependency unblocked and public quote-sharing hardening completed on top of the internal Phase 12 governance path.

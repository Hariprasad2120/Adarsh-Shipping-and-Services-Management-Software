# Performance file audit

Generated from tracked files by `scripts/performance-audit.ts`.

- Runtime-relevant tracked files: 1026
- Scannable JavaScript/TypeScript files: 969
- Files with scanner findings requiring manual review: 594
- Total scanner findings: 1627

The scanner is a review aid. Status records below cover every tracked file in
the requested runtime scope; generated clients and historical migrations are
excluded from manual modification, not from inventory.

| File | Status | Review note |
| --- | --- | --- |
| `eslint.config.mjs` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `next.config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `package.json` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `prisma.config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `prisma/migrations/20260513174451_init/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260513185654_add_prior_experience_years/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260514052927_ams_reviewer_deadline_settings/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260514120000_notification_centers/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260518103000_ams_dynamic_forms/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260518133000_ams_self_template_editor/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260608183000_todo_tasks/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260608195000_todo_subtasks/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260609123000_add_appraisal_schedule/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260618000000_perf_notification_indexes/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260619120000_ams_phase_deadline_settings/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260619_ams_workflow_upgrade/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260620103057_init_cha_module/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260620_ams_workflow_repair/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260622153000_add_cha_job_deletion_workflow/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260623170000_add_cha_branch_numbering_and_catalogs/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260623184000_add_performance_indexes/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260624002000_second_performance_indexes/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260624013000_add_cha_additional_data/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260624131500_change_igm_egm_to_reference_strings/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260624143000_add_cha_checklist_workflow/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260625110000_enhance_cha_filing_workflow/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260625143000_add_cha_job_type_manifest_config/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260625170000_rework_cha_filing_workflow_templates/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260628000000_perf_filing_workflow_indexes/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260701141000_attendance_ot_timeline/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260702123000_cha_filing_document_validity_config/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260702150000_cha_filing_flow_category/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260703175000_rework_cha_filing_workflow_session_safe_customer_approval/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260703194000_add_section49_validity_and_do_documents_sync/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260707123000_add_cha_additional_data_container_bl_fields/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260708120000_add_email_queue_metadata_for_cha_automation/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260709091500_add_do_extension_date_to_additional_data/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260709103000_add_chat_cleanup_state_to_job_workspace_profile/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260714120000_add_customer_portal_phase1/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260724000000_add_filing_node_run_delay_remarks/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260727000000_add_cha_expense_review_fields/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260727001000_add_direct_expense_requests/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260729183000_add_employee_hrms_profiles/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260729201500_add_employee_invitations/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260729233000_upgrade_work_reports/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/20260729234500_rework_hr_document_drive/migration.sql` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/migrations/migration_lock.toml` | Generated or migration — excluded from manual modification | Immutable migration/generated artifact. |
| `prisma/schema.prisma` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `prisma/seed.ts` | Reviewed — issue documented | circular-import, sequential-await-review, heavy-static-import |
| `scripts/audit-ui-routes.mjs` | Reviewed — issue documented | heavy-static-import |
| `scripts/bootstrap-cha-test-admin.ts` | Reviewed — issue documented | sequential-await-review |
| `scripts/bootstrap-special-accounts.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/bulk-sync-jobs.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `scripts/check-product-catalogue.ts` | Reviewed — issue documented | heavy-static-import |
| `scripts/check_conn.ts` | Reviewed — issue documented | broad-include |
| `scripts/create-test-portal-user.ts` | Reviewed — issue documented | sequential-await-review |
| `scripts/dump-docx.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/extract-docx-to-txt.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/generate-document-from-template.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/generate-document.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/import-employees.ts` | Reviewed — issue documented | heavy-static-import, sequential-await-review, broad-include |
| `scripts/import-hr-letter-templates.ts` | Reviewed — issue documented | sequential-await-review |
| `scripts/migrate-accounting-data.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `scripts/read-docx-template.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/reset-clock.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/save-html-as-docx.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/start-ngrok.ps1` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `scripts/update-product-catalogue.ts` | Reviewed — issue documented | heavy-static-import |
| `scripts/update-user-workmails.ts` | Reviewed — issue documented | heavy-static-import, sequential-await-review, database-in-loop |
| `scripts/verify-account-security-ui.mjs` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `scripts/verify-monolith-accounting-runtime.mjs` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `scripts/verify-monolith-accounting-ui.mjs` | Reviewed — issue documented | heavy-static-import |
| `scripts/verify-monolith-auth-misc-runtime.mjs` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `scripts/verify-monolith-auth-misc-ui.mjs` | Reviewed — issue documented | heavy-static-import, direct-auth |
| `scripts/verify-monolith-batch-001-ui.mjs` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `scripts/verify-monolith-communication-admin-runtime.mjs` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `scripts/verify-monolith-communication-admin-ui.mjs` | Reviewed — issue documented | heavy-static-import |
| `scripts/verify-monolith-crm-ui.mjs` | Reviewed — issue documented | heavy-static-import, polling |
| `scripts/verify-monolith-design-system-catalogue.mjs` | Reviewed — issue documented | heavy-static-import |
| `scripts/verify-monolith-design-system-runtime.mjs` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `scripts/verify-monolith-expense-cha-ui.mjs` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `scripts/verify-monolith-people-operations-runtime.mjs` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `scripts/verify-monolith-people-operations-ui.mjs` | Reviewed — issue documented | heavy-static-import |
| `scripts/verify-monolith-performance-learning-runtime.mjs` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `scripts/verify-monolith-performance-learning-ui.mjs` | Reviewed — issue documented | heavy-static-import |
| `scripts/verify-old-ui-backup.mjs` | Reviewed — issue documented | heavy-static-import |
| `src/app/(auth)/login/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(auth)/setup/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/_components/dashboard-shell-layout.test.ts` | Reviewed — issue documented | heavy-static-import |
| `src/app/(dashboard)/_components/dashboard-shell-switcher.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/_components/dashboard-shell.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/account/security/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/account/security/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/account/security/sessions-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/accounting/accounts/accounts-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/accounts/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/balance-sheet/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/banking/banking-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/banking/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/accounting/dashboard-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/general-ledger/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/invoices-sales/new/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/invoices-sales/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/items/[id]/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/items/new/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/items/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/jobs/jobs-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/jobs/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/accounting/journal-entries/[id]/detail-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/journal-entries/[id]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/journal-entries/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/journal-entries/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/accounting/payment-entries/[id]/detail-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/payment-entries/[id]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/payment-entries/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/payment-entries/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/profit-loss/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/purchase-invoices/[id]/detail-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/purchase-invoices/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/purchase-orders/new/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/purchase-orders/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/quotations/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` | Reviewed — issue documented | client-server-boundary, sequential-await-review |
| `src/app/(dashboard)/accounting/reports/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/reports/reports-client.tsx` | Reviewed — issue documented | client-server-boundary, sequential-await-review |
| `src/app/(dashboard)/accounting/sales-invoices/[id]/detail-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/sales-invoices/[id]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/sales-invoices/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/sales-invoices/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/sales-orders/new/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/sales-orders/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/accounting/settings/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/accounting/settings/settings-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/accounting/trial-balance/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/admin-cha-testing-action.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/admin/data-tools/actions.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth, broad-include, database-in-loop |
| `src/app/(dashboard)/admin/data-tools/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/data-tools/workbook-import-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/admin/design-system/design-system-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/admin/design-system/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/admin/google-chat/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/admin/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/admin/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/admin/notifications/admin-notifications-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/admin/notifications/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/admin/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/passkeys/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/admin/passkeys/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/admin/roles/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/roles/roles-manager.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/admin/sessions/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/admin/sessions/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx` | Reviewed — issue documented | client-server-boundary, sequential-await-review, polling |
| `src/app/(dashboard)/admin/settings/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/settings/settings-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/admin/simulation/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/admin/simulation/simulation-client.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/app/(dashboard)/ams/appraisals/[id]/appraisal-detail.tsx` | Reviewed — issue documented | large-client-component |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/management-review-client.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/ams/appraisals/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/appraisals/appraisal-filters-menu.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/appraisals/assign/[employeeId]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/appraisals/assign/[employeeId]/start-appraisal-client.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/app/(dashboard)/ams/appraisals/due-this-month-row.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/appraisals/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/assets/[id]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/assets/assets-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/ams/assets/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/criteria/criteria-client.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, unbounded-promise-all |
| `src/app/(dashboard)/ams/criteria/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/criteria/seed-action.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/cycles/cycles-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/cycles/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/extensions/actions.ts` | Reviewed — issue documented | sequential-await-review, broad-include, direct-auth |
| `src/app/(dashboard)/ams/extensions/extensions-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/ams/extensions/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/ams/history/history-filters.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/history/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/ams/kpi/kpi-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/kpi/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/self-assessment-form.tsx` | Reviewed — issue documented | polling |
| `src/app/(dashboard)/ams/my-appraisal/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/my-reviews/[id]/_components/my-review-detail-client.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, polling |
| `src/app/(dashboard)/ams/my-reviews/[id]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/my-reviews/my-reviews-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/ams/my-reviews/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/pms/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/slabs/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/ams/slabs/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/ams/slabs/slab-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, polling |
| `src/app/(dashboard)/attendance/biometric-sync/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/attendance/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/attendance/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/attendance/leaves/leaves-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/attendance/leaves/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/attendance/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/attendance/ot/ot-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review, heavy-static-import |
| `src/app/(dashboard)/attendance/ot/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/attendance/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/attendance/punch/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/attendance/punch/punch-card.tsx` | Reviewed — issue documented | large-client-component, polling |
| `src/app/(dashboard)/attendance/reports/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/attendance/timesheets/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/cha/_components/cha-dashboard-filter-action.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/cha-dashboard-search-action.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/cha-due-date-warning-indicator.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/cha-due-date-warning-note.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/cha-due-date-warnings-indicator.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/cha-operations-shared.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/job-delete-inline-button.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/cha/_components/job-filing-query-warning-indicator.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/_components/job-section49-validity-warning-indicator.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/approvals/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/cha/customers/[id]/edit/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/cha/customers/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/cha/customers/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/cha/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/expenses/expenses-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review |
| `src/app/(dashboard)/cha/expenses/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/cha/graphics/ChaHeaderGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/jobs/[jobId]/access-prohibited-card.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/jobs/[jobId]/do-validity-panel.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review, polling |
| `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/cha/jobs/[jobId]/workflow-documents-section.tsx` | Reviewed — issue documented | large-client-component |
| `src/app/(dashboard)/cha/jobs/jobs-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/cha/jobs/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/cha/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/cha/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/cha/reports/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/cha/settings/filing-workflows/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review |
| `src/app/(dashboard)/cha/settings/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/cha/settings/settings-form.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review |
| `src/app/(dashboard)/communication/_components/chat-provider.tsx` | Reviewed — issue documented | sequential-await-review, polling |
| `src/app/(dashboard)/communication/calendar/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/communication/chat/page.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, render-network-call, polling |
| `src/app/(dashboard)/communication/drive/JobSelector.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/drive/SyncDriveButton.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/communication/drive/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/communication/drive/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/communication/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-diagnostics.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-fallback.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-frame.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-settings.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/communication/google-chat-live-view/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/communication/google-chat-live-view/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/communication/job-spaces/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/communication/layout.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/communication/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/mail/page.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, render-network-call |
| `src/app/(dashboard)/communication/meetings/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/communication/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/communication/search/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/communication/settings/notification-settings.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/communication/settings/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/[...slug]/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/_components/activities-panel.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/_components/attachments-panel.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/_components/crm-workspace-page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/_components/delete-record-button.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/_components/notes-panel.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/_components/timeline-panel.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/approvals/approvals-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/approvals/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/calls/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/crm/campaigns/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/contacts/[id]/contact-detail-wrapper.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/contacts/[id]/edit/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/contacts/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/contacts/contact-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/contacts/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/contacts/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/customers/[id]/account-detail-wrapper.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/customers/[id]/edit/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/customers/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/customers/account-form.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/customers/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/customers/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/dashboard/demo-data-button.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/dashboard/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/crm/deals/[id]/deal-detail-wrapper.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/deals/[id]/edit/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/deals/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/deals/deal-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/deals/deals-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/deals/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/deals/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/documents/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/efficiency/page.tsx` | Reviewed — issue documented | direct-auth, broad-include |
| `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review, polling |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/crm/enquiries/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/events/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/forecasts/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/invoices/[invoiceId]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/crm/invoices/_components/InvoiceDetailsPage.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/invoices/invoice-form.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/invoices/new/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/invoices/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/items/[id]/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/items/new/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/items/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/lead-sources/import-button.tsx` | Reviewed — issue documented | client-server-boundary, polling |
| `src/app/(dashboard)/crm/lead-sources/justdial-toggle.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/lead-sources/justdial/justdial-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/lead-sources/justdial/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/lead-sources/logs/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/lead-sources/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/leads/[id]/convert-modal.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/leads/[id]/edit/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/leads/[id]/follow-up-modal.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/leads/[id]/interested-modal.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review, polling |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/crm/leads/[id]/remarks-modal.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/leads/lead-form.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/leads/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/leads/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/price-books/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/products/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/projects/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/purchase-orders/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/edit/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/crm/quotes/_components/ComboboxField.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/ConfirmDialog.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/CustomerSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/DateField.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/FileUploadBox.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/FixedActionBar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/FormRow.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/ItemAutocomplete.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/NewQuotePage.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/quotes/_components/NotesAndTermsSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/QuoteDetailsPage.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/app/(dashboard)/crm/quotes/_components/QuoteMetaSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/QuotesIndexPage.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/ShippingDetailsSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_components/TotalsPanel.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/gst-states.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/mock-data.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/quote-calculations.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/quote-details-data.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/quote-list-data.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/_lib/validation.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/quotes/new/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/quotes/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/(dashboard)/crm/sales-inbox/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/sales-orders/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/services/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/social/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/solutions/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/tasks/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, broad-include, direct-auth |
| `src/app/(dashboard)/crm/tickets/[id]/ticket-detail-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/tickets/actions.ts` | Reviewed — issue documented | sequential-await-review, broad-include, direct-auth |
| `src/app/(dashboard)/crm/tickets/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/crm/tickets/page.tsx` | Reviewed — issue documented | sequential-await-review, broad-include, direct-auth |
| `src/app/(dashboard)/crm/tickets/ticket-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/tickets/tickets-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/crm/vendors/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/crm/visits/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/crm/voc/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/_components/attendance-command.tsx` | Reviewed — issue documented | polling |
| `src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/_components/dashboard-team.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/_components/dashboard-types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/_components/module-command-center.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/AttendanceGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/CommunicationGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/CustomerPipelineGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/ExpenseDeskGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/FinancialControlGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/LearningHubGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/PeopleOperationsGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/PerformanceGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/ProductCatalogueGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/ShipmentOperationsGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/TalentPipelineGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/graphics/TaskStudioGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/dashboard/module-dashboard.test.ts` | Reviewed — issue documented | heavy-static-import |
| `src/app/(dashboard)/dashboard/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/dashboard/portal-client.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/app/(dashboard)/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/expense/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/expense/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/expense/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/expense/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/hrms/approvals/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/employees/[id]/employee-profile.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review |
| `src/app/(dashboard)/hrms/employees/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/hrms/employees/employee-account-actions.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/(dashboard)/hrms/employees/employee-directory-actions.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, no-store-fetch |
| `src/app/(dashboard)/hrms/employees/employee-list.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/hrms/employees/new/onboard-form.tsx` | Reviewed — issue documented | large-client-component |
| `src/app/(dashboard)/hrms/employees/new/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/employees/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/hrms/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/hrms/files/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/helpdesk/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/hrms/letters/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/letters/view/[id]/page.tsx` | Reviewed — issue documented | sequential-await-review, render-network-call |
| `src/app/(dashboard)/hrms/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/hrms/on-duty-admin/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/onboarding/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/org-structure/org-structure-manager.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/app/(dashboard)/hrms/org-structure/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/ownership/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/hrms/ownership/page.tsx` | Reviewed — issue documented | sequential-await-review, broad-include, direct-auth |
| `src/app/(dashboard)/hrms/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/payroll/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/payroll/payroll-client.tsx` | Reviewed — issue documented | client-server-boundary, sequential-await-review |
| `src/app/(dashboard)/hrms/recruit/audit/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/career/applications/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/career/assistant/page.tsx` | Reviewed — issue documented | sequential-await-review, render-network-call |
| `src/app/(dashboard)/hrms/recruit/career/jobs/page.tsx` | Reviewed — issue documented | sequential-await-review, render-network-call |
| `src/app/(dashboard)/hrms/recruit/career/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/recruit/career/profile/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/career/resumes/page.tsx` | Reviewed — issue documented | sequential-await-review, render-network-call |
| `src/app/(dashboard)/hrms/recruit/employer/applications/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/employer/candidates/new/page.tsx` | Reviewed — issue documented | sequential-await-review, render-network-call |
| `src/app/(dashboard)/hrms/recruit/employer/candidates/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/employer/jobs/new/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/employer/jobs/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/app/(dashboard)/hrms/recruit/employer/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/recruit/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/hrms/recruit/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/recruit/settings/page.tsx` | Reviewed — issue documented | sequential-await-review, render-network-call |
| `src/app/(dashboard)/hrms/reimbursement/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/salary-revisions/page.tsx` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/(dashboard)/hrms/salary-revisions/salary-revisions-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/hrms/salary-structure/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/salary-structure/salary-structure-client.tsx` | Reviewed — issue documented | large-client-component |
| `src/app/(dashboard)/hrms/settings/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/tasks/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/tracking/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/travel/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/users/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/hrms/work-reports/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/layout.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/lms/_components/lms-route-page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/lms/assignments/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/courses/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/error.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/my-learning/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/lms/reports/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/not-found.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/notifications/notifications-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/notifications/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/product-catalogue/page.tsx` | Reviewed — issue documented | large-client-component |
| `src/app/(dashboard)/todo/graphics/TodoHeaderGraphic.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/(dashboard)/todo/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/(dashboard)/todo/todo-client.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review, polling |
| `src/app/(dashboard)/todo/todo-ui.test.ts` | Reviewed — issue documented | heavy-static-import |
| `src/app/api/admin/ams-reset/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/admin/modules/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/admin/notifications/[id]/resend/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/admin/notifications/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/admin/settings/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/admin/simulation/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/ams/appraisals/[id]/availability/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/claim-management/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/ams/appraisals/[id]/hike/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/management-review/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/meeting/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/minutes/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/reviewer-rating/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/reviewers/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/ams/appraisals/[id]/score-preview/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/[id]/self-assessment/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/appraisals/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/criteria/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/criteria/seed/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/cycles/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/cycles/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/ams/self-form-template/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/day-punches/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/holidays/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/leave-types/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/leaves/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/leaves/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/ot/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/ot/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/punch/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/sync/biometric/live/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/attendance/sync/biometric/route.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/app/api/auth/[...nextauth]/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cha/checklist-files/[id]/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/api/cha/customer-documents/[id]/route.ts` | Reviewed — issue documented | heavy-static-import, sequential-await-review, direct-auth, broad-include |
| `src/app/api/cha/documents/[id]/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth, broad-include |
| `src/app/api/cha/due-date-warnings/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cha/expense-artifacts/[...path]/route.ts` | Reviewed — issue documented | heavy-static-import, sequential-await-review, direct-auth, broad-include |
| `src/app/api/cha/reports/jobs/[jobId]/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/check-new/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/dm/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/list/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/messages/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/space/members/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/space/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/chat/sse/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, polling |
| `src/app/api/communication/chat/sync/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/communication/mail/labels/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/mail/link/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/mail/list/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/communication/mail/modify/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/communication/mail/send/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/mail/thread/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/communication/oauth/callback/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/oauth/connect/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/communication/oauth/disconnect/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/communication/search/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/crm/justdial-live/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/crm/recordings/[id]/download/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth, broad-include |
| `src/app/api/crm/recordings/[id]/playback/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth, broad-include |
| `src/app/api/crm/recordings/[id]/reviews/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/api/cron/appraisal-trigger/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cron/cha-filing-query-reminders/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cron/crm-reminders/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cron/email-flush/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cron/google-chat-retry/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/cron/justdial-import/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/cron/tracking-alerts/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/auth/activate/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/auth/forgot-password/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/customer-portal/auth/login/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/auth/logout/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/checklist-files/[id]/route.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/customer-portal/checklist-files/[id]/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `src/app/api/customer-portal/checklists/[checklistId]/decision/route.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/customer-portal/checklists/[checklistId]/decision/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/customer-portal/checklists/respond/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/document-versions/[id]/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `src/app/api/customer-portal/documents/[versionId]/route.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/customer-portal/documents/[versionId]/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `src/app/api/customer-portal/documents/confirm/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/documents/upload/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/notifications/[id]/read/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/notifications/read-all/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/profile/preferences/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/queries/reply/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/ratings/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/security/logout-all/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/security/password/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/customer-portal/shipments/[shipmentId]/documents/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/dev/clear-auth-cookies/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/google-chat/admin/route.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/app/api/google-chat/debug/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/google-chat/link/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/google-chat/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/google-chat/spaces/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/google-chat/webhook/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/health/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/hrms/approvals/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/attendance/month/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/attendance/punch/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/dashboard/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/employees/[id]/invitation/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/employees/[id]/profile/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/employees/[id]/salary-structure/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/employees/export/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/employees/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, unbounded-promise-all |
| `src/app/api/hrms/files/[id]/download/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/files/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/hr-cases/[id]/comments/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/hr-cases/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/invitations/accept/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/hrms/invitations/basic/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/invitations/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/leave/requests/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/leave/summary/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/letters/[id]/accept/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/letters/[id]/action/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/api/hrms/letters/[id]/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/letters/assets/upload/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth |
| `src/app/api/hrms/letters/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/api/hrms/letters/settings/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/letters/share-mail/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth |
| `src/app/api/hrms/letters/templates/upload/route.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, direct-auth |
| `src/app/api/hrms/letters/verify/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/hrms/lms/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/me/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/on-duty/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/onboarding/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/performance/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/reimbursement/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/settings/employee-fields/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/settings/employee-fields/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/hrms/settings/services/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/settings/work-reports/[id]/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/settings/work-reports/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/tasks/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/team/reportees/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/hrms/timetracker/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/tracking/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/app/api/hrms/travel/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/work-reports/[id]/approve/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/work-reports/location/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/hrms/work-reports/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/mobile/auth/login/route.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/app/api/mobile/crm/auth/login/route.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/app/api/mobile/crm/call-attempts/[callAttemptId]/complete/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/crm/call-attempts/[callAttemptId]/recording/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/crm/call-attempts/[callAttemptId]/recording/status/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/crm/leads/[leadId]/call-attempts/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/crm/leads/[leadId]/status/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/crm/leads/route.ts` | Reviewed — issue documented | broad-include |
| `src/app/api/mobile/crm/update/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/mobile/hrms/agreement/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/hrms/attendance/check-in/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/hrms/attendance/check-out/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/hrms/attendance/history/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/mobile/hrms/dashboard/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/mobile/hrms/face/enroll/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/hrms/on-duty/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mobile/hrms/tracking/heartbeat/route.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/app/api/mobile/mona/chat/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/mona/chat/route.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/app/api/mona/model/route.ts` | Reviewed — issue documented | direct-auth |
| `src/app/api/notifications/[id]/ack/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/[id]/dismiss/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/[id]/open/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/[id]/read/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/active/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/dismiss-all/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/presented/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/read-all/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/notifications/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/org/branches/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/org/branches/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/org/departments/[id]/divisions/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/org/departments/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/org/departments/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/org/divisions/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/org/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/recruit/applications/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/applications/[id]/stage/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/applications/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/audit/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/recruit/candidates/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/candidates/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/dashboard/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/recruit/jobs/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobs/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/applications/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/career/conversations/[id]/messages/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/career/conversations/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/career/conversations/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/dashboard/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/recruit/jobseeker/listings/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/profile/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/jobseeker/resumes/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/recruit/settings/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/roles/[id]/permissions/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/roles/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/setup/route.ts` | Reviewed — issue documented | sequential-await-review, database-in-loop |
| `src/app/api/todos/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/todos/reminders/check/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/todos/reminders/upcoming/route.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/api/todos/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/todos/subtasks/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/users/[id]/password/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/users/[id]/roles/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/users/[id]/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/api/users/route.ts` | Reviewed — issue documented | sequential-await-review |
| `src/app/customer-portal/_components/client-actions.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/app/customer-portal/_components/portal-kyc-workspace.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/app/customer-portal/_components/portal-placeholder.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/activate/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/approvals/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/dashboard/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/dashboard/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/forgot-password/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/kyc/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/layout.tsx` | Reviewed — issue documented | broad-include |
| `src/app/customer-portal/login/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/notifications/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/profile/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/security/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/shipments/[shipmentId]/checklist-decisions-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/customer-portal/shipments/[shipmentId]/customer-shipment-upload-card.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/shipments/[shipmentId]/documents-table-client.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/app/customer-portal/shipments/[shipmentId]/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/shipments/[shipmentId]/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/shipments/loading.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/customer-portal/shipments/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/favicon.ico` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/globals.css` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/google-chat-link/page.tsx` | Reviewed — issue documented | sequential-await-review, polling, no-store-fetch, render-network-call |
| `src/app/invite/employee/employee-invitation-acceptance.tsx` | Reviewed — issue documented | sequential-await-review, no-store-fetch |
| `src/app/invite/employee/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/invite/employee/ready/page.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/layout.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/app/page.tsx` | Reviewed — issue documented | direct-auth |
| `src/app/verify/[id]/page.tsx` | Reviewed — issue documented | render-network-call |
| `src/components/ams/criteria-points-form.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/components/ams/cycle-progress-card.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/ams/form-preview-modal.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/auth/animated-login.module.css` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/auth/login-scene.config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/auth/monolith-logistics-login.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/auto-breadcrumb.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/breadcrumb-label.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/breadcrumbs.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/cha/create-job-dialog.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component, sequential-await-review |
| `src/components/cha/create-job-permission-guard.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/cha/dashboard-create-job.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/clickable-row.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/crm/ApprovalActionBar.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/dashboard-chrome.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/data-table.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/demo-fill-button.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/app-settings-page.tsx` | Reviewed — issue documented | render-network-call |
| `src/components/hrms/approvals-view.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/components/hrms/attendance-calendar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/dashboard-widgets.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/employee-profile-fields.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/files-view.tsx` | Reviewed — issue documented | sequential-await-review, no-store-fetch |
| `src/components/hrms/leave-tracker.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/letters-view.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/components/hrms/lms-view.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/on-duty-admin-view.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/onboarding-view.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/components/hrms/pms-view.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/components/hrms/reimbursement-admin-view.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/settings-services.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/sidebar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/tasks-view.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/top-nav.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/tracking-dashboard-view.tsx` | Reviewed — issue documented | polling |
| `src/components/hrms/travel-view.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/user-control-page.tsx` | Reviewed — issue documented | render-network-call |
| `src/components/hrms/users-table.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/hrms/work-report-settings.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/hrms/work-reports.tsx` | Reviewed — issue documented | large-client-component, sequential-await-review |
| `src/components/items/ConfirmDialog.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/FixedItemActionBar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/InventoryInfoBanner.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemDetailPage.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemFormHeader.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemInventorySection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemLogisticsFieldsSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemPriceListSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemPrimaryInfoSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemPurchaseInfoSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemSalesInfoSection.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemsListPage.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemsPagination.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemsTable.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/ItemsToolbar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/NewItemDialog.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/items/NewItemPage.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/landing-page/AppraisalsModule.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/landing-page/AttendanceModule.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/landing-page/CRMModule.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/landing-page/CompanyOverview.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/landing-page/HRModule.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/landing-page/initialData.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/main-shell.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/module-home.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/mona/mona-avatar.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/mona/mona-chat.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/mona/mona-input.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/mona/mona-message.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/mona/mona-provider.tsx` | Reviewed — issue documented | sequential-await-review |
| `src/components/monolith/accounting-commercial-document-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/monolith/accounting-delete-action.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/accounting-invoice-detail.tsx` | Reviewed — issue documented | client-server-boundary, sequential-await-review |
| `src/components/monolith/accounting-invoice-form.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/monolith/accounting-items.tsx` | Reviewed — issue documented | large-client-component |
| `src/components/monolith/accounting-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/accounting-workspace.tsx` | Reviewed — issue documented | large-client-component |
| `src/components/monolith/admin-workspace.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/alert.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/app-shell.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/components/monolith/badge.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/button-1.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/button.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/card.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/cha-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/cha-workspace.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/communication-admin-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/communication-workspace.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/crm-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/crm-workspace.tsx` | Reviewed — issue documented | large-client-component |
| `src/components/monolith/date-input.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/dropdown-menu.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/dropdown-select.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/file-upload-field.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/filter-menu.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/folder-icon.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/foundation.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/foundation.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/index.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/input.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/label.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/modal.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/native-select.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/neon-checkbox.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/operations-overview.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/people-controls.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/people-data-table.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/people-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/people-workspace.tsx` | Reviewed — issue documented | large-client-component |
| `src/components/monolith/performance-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/performance-workspace.tsx` | Reviewed — issue documented | large-client-component |
| `src/components/monolith/public-workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/public-workspace.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/textarea.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/warning-indicator-popover.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/workspace-data-table.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/workspace-dialog.test.ts` | Reviewed — issue documented | heavy-static-import |
| `src/components/monolith/workspace-dialog.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/workspace-states.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/workspace.test.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/monolith/workspace.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/notifications/notification-provider.tsx` | Reviewed — issue documented | sequential-await-review, no-store-fetch, polling |
| `src/components/page-animator.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/root-module-control-client.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/root-signout-button.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/scroll-navigator.tsx` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/components/session-sync.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/components/sidebar.tsx` | Reviewed — issue documented | client-server-boundary, large-client-component |
| `src/components/todo/todo-reminder-agent.tsx` | Reviewed — issue documented | sequential-await-review, no-store-fetch, polling |
| `src/components/welcome-bar.tsx` | Reviewed — issue documented | client-server-boundary, polling, no-store-fetch |
| `src/lib/__tests__/ot.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/__tests__/security.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/__tests__/session-security.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/api-helpers.ts` | Reviewed — issue documented | direct-auth |
| `src/lib/app-edition.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/app-url.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/attendance-date.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/auth-actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/lib/auth.ts` | Reviewed — issue documented | sequential-await-review, broad-include, direct-auth |
| `src/lib/breadcrumb-store.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/cache.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/caps-context.tsx` | Reviewed — issue documented | client-server-boundary |
| `src/lib/catalogue-data.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/cha-badges.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/clock.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/db.ts` | Reviewed — issue documented | sequential-await-review, polling |
| `src/lib/demo-fill.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/document-preview.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/email.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `src/lib/essl.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/fetch-with-auth.ts` | Reviewed — issue documented | circular-import, client-server-boundary |
| `src/lib/google-calendar-client.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/google-chat-client.ts` | Reviewed — issue documented | sequential-await-review, unbounded-promise-all |
| `src/lib/google-chat-live-view.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/google-drive-client.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/google-gmail-client.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/google-workspace.test.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/lib/items/currency-store.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/items/formatters.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/items/item-store.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/items/mock-data.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/items/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/items/validation.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/job-workspace-profile.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/login-rate-limit.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/logout.ts` | Reviewed — issue documented | client-server-boundary |
| `src/lib/mobile-auth.ts` | Reviewed — issue documented | broad-include |
| `src/lib/mobile-cors.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/navigation.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/navigation.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/notify.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/ot.ts` | Reviewed — issue documented | sequential-await-review, broad-include, unbounded-promise-all |
| `src/lib/performance.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/rbac.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/recruit-flag.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/root-access.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/route-labels.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/security.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/session-config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/session-service.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/text-case.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/transcription.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/lib/utils.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/working-hours.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/lib/workspace-oauth.ts` | Reviewed — issue documented | sequential-await-review |
| `src/lib/workspace-provisioning.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/accounting/__tests__/accounting.test.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/accounting/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/modules/accounting/reports.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/accounting/service.ts` | Reviewed — issue documented | sequential-await-review, database-in-loop, broad-include |
| `src/modules/accounting/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/accounting/validators.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/audit-log.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/criteria-cache.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/criteria-config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/daily-job.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/ams/due-dates.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/form-template.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/self-form-template.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/ams/settings.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/ams/workflow.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/attendance/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/cha/__tests__/cha.test.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/cha/__tests__/checklist-email-automation.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/cha/__tests__/do-extension.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/cha/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, unbounded-promise-all |
| `src/modules/cha/checklist-email-automation.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/cha/job-report.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/cha/service.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, database-in-loop, broad-include, unbounded-promise-all |
| `src/modules/communication/__tests__/chat-integration.test.ts` | Reviewed — issue documented | sequential-await-review, broad-find-many |
| `src/modules/core/organisation/module-config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/core/organisation/module-settings.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/core/organisation/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/core/user/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/core/user/special-account-bootstrap.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/crm/__tests__/justdial-import.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/crm/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth, broad-include |
| `src/modules/crm/approval-actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/modules/crm/approval-workflow.ts` | Reviewed — issue documented | sequential-await-review, unbounded-promise-all, broad-include |
| `src/modules/crm/crm-lead-conversion.service.ts` | Reviewed — issue documented | sequential-await-review, unbounded-promise-all, broad-include |
| `src/modules/crm/justdial-import.service.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import |
| `src/modules/crm/lead-source.service.ts` | Reviewed — issue documented | broad-include |
| `src/modules/crm/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/customer-portal/__tests__/auth.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/customer-portal/__tests__/dashboard.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/customer-portal/__tests__/shipments.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/customer-portal/actions.ts` | Reviewed — issue documented | sequential-await-review, direct-auth |
| `src/modules/customer-portal/auth.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/customer-portal/checklists.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/customer-portal/config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/customer-portal/dashboard.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/customer-portal/feature-flags.ts` | Reviewed — issue documented | heavy-static-import, sequential-await-review |
| `src/modules/customer-portal/service.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, unbounded-promise-all, broad-include |
| `src/modules/customer-portal/shipments.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/customer-portal/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/dashboard/service.ts` | Reviewed — issue documented | sequential-await-review, unbounded-promise-all |
| `src/modules/dashboard/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/google-chat/cards.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/google-chat/commands.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/google-chat/delivery.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/google-chat/gateway.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/google-chat/identity.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/google-chat/router.ts` | Reviewed — issue documented | sequential-await-review, broad-include, unbounded-promise-all |
| `src/modules/google-chat/space.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/google-chat/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/__tests__/document-drive.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/__tests__/employee-basic-invitation.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/__tests__/employee-directory-export.test.ts` | Reviewed — issue documented | heavy-static-import |
| `src/modules/hrms/__tests__/employee-invitation-lifecycle.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/__tests__/employee-invitation.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/__tests__/employee-profile.test.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/__tests__/letters.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/hrms/__tests__/work-report.test.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/hrms/document-drive.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/hrms/employee-directory-export.ts` | Reviewed — issue documented | heavy-static-import |
| `src/modules/hrms/employee-invitation.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/hrms/employee-profile.ts` | Reviewed — issue documented | sequential-await-review, database-in-loop, broad-include |
| `src/modules/hrms/face-enrollment.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/hrms/letter-template-import.ts` | Reviewed — issue documented | heavy-static-import |
| `src/modules/hrms/letter-template-types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/letters-service.ts` | Reviewed — issue documented | sequential-await-review, heavy-static-import, broad-include |
| `src/modules/hrms/mobile-attendance.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/hrms/on-duty.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/hrms/salary-revisions-shared.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/salary-revisions.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/salary-structure.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/hrms/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/hrms/user-agreement.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/hrms/validators.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/mona/gemini-client.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/mona/knowledge-base.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/mona/local-engine.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/mona/service.ts` | Reviewed — issue documented | sequential-await-review, polling, unbounded-promise-all |
| `src/modules/mona/system-prompt.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/mona/tools.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/mona/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/notifications/policy.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/notifications/service.ts` | Reviewed — issue documented | sequential-await-review, unbounded-promise-all, broad-include |
| `src/modules/recruit/audit.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/recruit/employer-service.ts` | Reviewed — issue documented | sequential-await-review, broad-include |
| `src/modules/recruit/jobseeker-service.ts` | Reviewed — issue documented | sequential-await-review |
| `src/modules/recruit/types.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `src/modules/todo/service.ts` | Reviewed — issue documented | sequential-await-review, broad-include, database-in-loop |
| `tsconfig.json` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `tsconfig.ui-migration.json` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |
| `vitest.config.ts` | Reviewed — no issue | No targeted performance pattern found; dependency role reviewed. |

## Scanner findings

| File | Line | Rule | Detail |
| --- | ---: | --- | --- |
| `prisma/seed.ts` | 1 | `circular-import` | src/lib/db.ts -> src/modules/crm/justdial-import.service.ts -> src/lib/db.ts |
| `prisma/seed.ts` | 1 | `circular-import` | src/lib/db.ts -> src/modules/crm/justdial-import.service.ts -> src/modules/crm/lead-source.service.ts -> src/lib/db.ts |
| `prisma/seed.ts` | 1 | `circular-import` | src/lib/db.ts -> src/modules/crm/justdial-import.service.ts -> src/modules/crm/crm-lead-conversion.service.ts -> src/lib/db.ts |
| `prisma/seed.ts` | 1 | `circular-import` | src/lib/db.ts -> src/modules/crm/justdial-import.service.ts -> src/modules/crm/crm-lead-conversion.service.ts -> src/modules/crm/service.ts -> src/lib/db.ts |
| `prisma/seed.ts` | 1 | `circular-import` | src/lib/db.ts -> src/modules/crm/justdial-import.service.ts -> src/modules/crm/crm-lead-conversion.service.ts -> src/modules/crm/service.ts -> src/lib/clock.ts -> src/lib/db.ts |
| `prisma/seed.ts` | 1 | `circular-import` | src/lib/db.ts -> src/modules/crm/lead-source.service.ts -> src/lib/db.ts |
| `prisma/seed.ts` | 1 | `sequential-await-review` | 71 await expressions; review independent work for safe parallelization. |
| `prisma/seed.ts` | 6 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `scripts/audit-ui-routes.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/bootstrap-cha-test-admin.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `scripts/bulk-sync-jobs.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `scripts/bulk-sync-jobs.ts` | 34 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `scripts/bulk-sync-jobs.ts` | 71 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `scripts/check_conn.ts` | 5 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `scripts/check-product-catalogue.ts` | 9 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `scripts/create-test-portal-user.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `scripts/import-employees.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/import-employees.ts` | 1 | `sequential-await-review` | 54 await expressions; review independent work for safe parallelization. |
| `scripts/import-employees.ts` | 4 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `scripts/import-employees.ts` | 578 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `scripts/import-hr-letter-templates.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `scripts/migrate-accounting-data.ts` | 1 | `sequential-await-review` | 48 await expressions; review independent work for safe parallelization. |
| `scripts/migrate-accounting-data.ts` | 3 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `scripts/migrate-accounting-data.ts` | 4 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `scripts/update-product-catalogue.ts` | 12 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `scripts/update-user-workmails.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `scripts/update-user-workmails.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `scripts/update-user-workmails.ts` | 205 | `database-in-loop` | Potential database operation inside a loop. |
| `scripts/verify-account-security-ui.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-account-security-ui.mjs` | 1 | `sequential-await-review` | 24 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-accounting-runtime.mjs` | 1 | `sequential-await-review` | 57 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-accounting-runtime.mjs` | 3 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-accounting-ui.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-auth-misc-runtime.mjs` | 1 | `sequential-await-review` | 47 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-auth-misc-runtime.mjs` | 3 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-auth-misc-ui.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-auth-misc-ui.mjs` | 227 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `scripts/verify-monolith-batch-001-ui.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-batch-001-ui.mjs` | 1 | `sequential-await-review` | 72 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-communication-admin-runtime.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-communication-admin-runtime.mjs` | 1 | `sequential-await-review` | 33 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-communication-admin-ui.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-crm-ui.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-crm-ui.mjs` | 268 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `scripts/verify-monolith-design-system-catalogue.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-design-system-runtime.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-design-system-runtime.mjs` | 1 | `sequential-await-review` | 31 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-expense-cha-ui.mjs` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-expense-cha-ui.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-people-operations-runtime.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-people-operations-runtime.mjs` | 1 | `sequential-await-review` | 33 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-people-operations-ui.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-monolith-performance-learning-runtime.mjs` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs/promises. |
| `scripts/verify-monolith-performance-learning-runtime.mjs` | 1 | `sequential-await-review` | 42 await expressions; review independent work for safe parallelization. |
| `scripts/verify-monolith-performance-learning-ui.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `scripts/verify-old-ui-backup.mjs` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `src/app/(auth)/setup/page.tsx` | 52 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/_components/dashboard-shell-layout.test.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `src/app/(dashboard)/_components/dashboard-shell-switcher.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/_components/dashboard-shell-switcher.tsx -> src/lib/rbac.ts. |
| `src/app/(dashboard)/_components/dashboard-shell.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/_components/dashboard-shell.tsx -> src/components/welcome-bar.tsx -> src/lib/caps-context.tsx -> src/lib/rbac.ts. |
| `src/app/(dashboard)/account/security/actions.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/account/security/actions.ts` | 20 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/account/security/actions.ts` | 45 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/account/security/sessions-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/account/security/sessions-client.tsx -> src/app/(dashboard)/account/security/actions.ts. |
| `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx` | 28 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx` | 49 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/accounts/accounts-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/accounts/accounts-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/accounts/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/balance-sheet/page.tsx` | 51 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/banking/banking-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/banking/banking-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/banking/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/banking/page.tsx` | 52 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/accounting/dashboard-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/dashboard-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/general-ledger/page.tsx` | 42 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/jobs/jobs-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/jobs/jobs-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/jobs/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/jobs/page.tsx` | 18 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/accounting/jobs/page.tsx` | 22 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/accounting/journal-entries/[id]/detail-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/journal-entries/[id]/detail-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/journal-entries/[id]/page.tsx` | 16 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/journal-entries/new/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/journal-entries/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/page.tsx` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/page.tsx` | 34 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/accounting/page.tsx` | 46 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/accounting/payment-entries/[id]/detail-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/payment-entries/[id]/detail-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/payment-entries/[id]/page.tsx` | 16 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/payment-entries/new/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/payment-entries/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/profit-loss/page.tsx` | 61 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/purchase-invoices/[id]/detail-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/purchase-invoices/[id]/detail-client.tsx -> src/components/monolith/accounting-invoice-detail.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx -> src/components/monolith/accounting-invoice-form.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/purchase-invoices/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/quotations/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/quotations/quotations-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/accounting/reports/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/reports/reports-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/reports/reports-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/reports/reports-client.tsx` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/accounting/sales-invoices/[id]/detail-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/sales-invoices/[id]/detail-client.tsx -> src/components/monolith/accounting-invoice-detail.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/sales-invoices/[id]/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx -> src/components/monolith/accounting-invoice-form.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/sales-invoices/new/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/sales-invoices/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/settings/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/accounting/settings/settings-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/accounting/settings/settings-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/accounting/trial-balance/page.tsx` | 36 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/admin-cha-testing-action.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/admin/admin-cha-testing-action.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/admin/data-tools/actions.ts` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/admin/data-tools/actions.ts` | 5 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `src/app/(dashboard)/admin/data-tools/actions.ts` | 16 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/data-tools/actions.ts` | 24 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/data-tools/actions.ts` | 97 | `database-in-loop` | Potential database operation inside a loop. |
| `src/app/(dashboard)/admin/data-tools/page.tsx` | 17 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/data-tools/workbook-import-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/admin/data-tools/workbook-import-form.tsx -> src/app/(dashboard)/admin/data-tools/actions.ts. |
| `src/app/(dashboard)/admin/design-system/design-system-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/admin/design-system/design-system-client.tsx -> src/components/monolith/app-shell.tsx -> src/lib/rbac.ts. |
| `src/app/(dashboard)/admin/design-system/design-system-client.tsx` | 1 | `large-client-component` | 1076 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/admin/design-system/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/google-chat/page.tsx` | 97 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/admin/notifications/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/admin/notifications/page.tsx` | 20 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/page.tsx` | 27 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/passkeys/actions.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/admin/passkeys/actions.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/passkeys/actions.ts` | 37 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/passkeys/page.tsx` | 35 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/passkeys/page.tsx` | 51 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/roles/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/sessions/actions.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/admin/sessions/actions.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/sessions/actions.ts` | 31 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/actions.ts` | 38 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 37 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 44 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 57 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 64 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 81 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/page.tsx` | 88 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx -> src/app/(dashboard)/admin/sessions/actions.ts. |
| `src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx` | 128 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx` | 133 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/admin/settings/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/settings/settings-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/admin/settings/settings-client.tsx -> src/modules/ams/settings.ts. |
| `src/app/(dashboard)/admin/simulation/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/admin/simulation/simulation-client.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/[id]/appraisal-detail.tsx` | 1 | `large-client-component` | 1598 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/management-review-client.tsx` | 1 | `large-client-component` | 599 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/management-review-client.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/page.tsx` | 17 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/appraisals/[id]/management-review/page.tsx` | 29 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/appraisals/[id]/page.tsx` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/[id]/page.tsx` | 19 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/appraisals/assign/[employeeId]/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/assign/[employeeId]/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/appraisals/assign/[employeeId]/start-appraisal-client.tsx` | 1 | `large-client-component` | 838 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/ams/appraisals/assign/[employeeId]/start-appraisal-client.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/appraisals/page.tsx` | 94 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/assets/[id]/page.tsx` | 31 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/assets/assets-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/ams/assets/assets-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/ams/assets/assets-client.tsx` | 1 | `large-client-component` | 567 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/ams/assets/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/criteria/criteria-client.tsx` | 1 | `large-client-component` | 2243 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/ams/criteria/criteria-client.tsx` | 1 | `sequential-await-review` | 15 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/criteria/criteria-client.tsx` | 1673 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/app/(dashboard)/ams/criteria/page.tsx` | 147 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/criteria/seed-action.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/criteria/seed-action.ts` | 565 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/cycles/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/extensions/actions.ts` | 1 | `sequential-await-review` | 15 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/extensions/actions.ts` | 14 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/extensions/actions.ts` | 22 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/extensions/actions.ts` | 34 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/extensions/actions.ts` | 80 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/extensions/actions.ts` | 95 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/extensions/extensions-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/ams/extensions/extensions-client.tsx -> src/app/(dashboard)/ams/extensions/actions.ts. |
| `src/app/(dashboard)/ams/extensions/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/extensions/page.tsx` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/extensions/page.tsx` | 38 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/extensions/page.tsx` | 51 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/extensions/page.tsx` | 79 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/history/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/history/page.tsx` | 84 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/history/page.tsx` | 89 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/history/page.tsx` | 154 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/history/page.tsx` | 165 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/history/page.tsx` | 171 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/ams/kpi/page.tsx` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/page.tsx` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/self-assessment-form.tsx` | 158 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/ams/my-appraisal/page.tsx` | 44 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/my-reviews/[id]/_components/my-review-detail-client.tsx` | 1 | `large-client-component` | 682 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/ams/my-reviews/[id]/_components/my-review-detail-client.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/my-reviews/[id]/_components/my-review-detail-client.tsx` | 159 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/ams/my-reviews/[id]/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/my-reviews/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/page.tsx` | 36 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/pms/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/slabs/actions.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/ams/slabs/actions.ts` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/slabs/page.tsx` | 42 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/ams/slabs/slab-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/ams/slabs/slab-form.tsx -> src/app/(dashboard)/ams/slabs/actions.ts. |
| `src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx` | 1 | `large-client-component` | 1381 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx` | 317 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx` | 362 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx` | 419 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/attendance/biometric-sync/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/leaves/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/leaves/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 1 | `sequential-await-review` | 132 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 78 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 104 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 135 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 182 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 199 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 232 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 240 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 312 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 351 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 404 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 474 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 541 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 575 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 602 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 619 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 639 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 681 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 698 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 717 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 743 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 784 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 801 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 826 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 852 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 880 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 905 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 941 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 983 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/actions.ts` | 1236 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/ot-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/attendance/ot/ot-client.tsx -> src/app/(dashboard)/attendance/ot/actions.ts. |
| `src/app/(dashboard)/attendance/ot/ot-client.tsx` | 1 | `large-client-component` | 3652 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/attendance/ot/ot-client.tsx` | 1 | `sequential-await-review` | 17 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/ot/ot-client.tsx` | 15 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `src/app/(dashboard)/attendance/ot/page.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/ot/page.tsx` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/ot/page.tsx` | 97 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/page.tsx` | 129 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/page.tsx` | 139 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/ot/page.tsx` | 175 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/attendance/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/page.tsx` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/punch/page.tsx` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/punch/page.tsx` | 93 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/punch/punch-card.tsx` | 1 | `large-client-component` | 1059 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/attendance/punch/punch-card.tsx` | 129 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/attendance/punch/punch-card.tsx` | 277 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/attendance/reports/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/attendance/reports/page.tsx` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/attendance/timesheets/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/_components/job-delete-inline-button.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/_components/job-delete-inline-button.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/approvals/page.tsx` | 16 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx` | 1 | `large-client-component` | 1167 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/customers/[id]/edit/page.tsx` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/customers/new/new-customer-client.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx` | 1 | `large-client-component` | 1065 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/customers/new/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/customers/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/customers/page.tsx` | 46 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/expenses/expenses-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/expenses/expenses-client.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/expenses/expenses-client.tsx` | 1 | `large-client-component` | 2005 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/expenses/expenses-client.tsx` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/expenses/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/expenses/page.tsx` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/jobs/[jobId]/do-validity-panel.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/jobs/[jobId]/do-validity-panel.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` | 1 | `large-client-component` | 11988 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` | 1 | `sequential-await-review` | 81 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` | 2633 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` | 2809 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx` | 38 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/jobs/[jobId]/workflow-documents-section.tsx` | 1 | `large-client-component` | 1099 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/jobs/jobs-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/jobs/jobs-client.tsx -> src/components/cha/create-job-dialog.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/jobs/jobs-client.tsx` | 1 | `large-client-component` | 705 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/jobs/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/jobs/page.tsx` | 35 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/page.tsx` | 121 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/page.tsx` | 226 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/page.tsx` | 273 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/page.tsx` | 290 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/page.tsx` | 298 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/reports/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/reports/page.tsx` | 32 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/reports/page.tsx` | 54 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/reports/page.tsx` | 65 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/reports/page.tsx` | 74 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/cha/settings/filing-workflows/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/settings/filing-workflows/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx` | 1 | `large-client-component` | 3682 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/settings/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/cha/settings/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/cha/settings/settings-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/cha/settings/settings-form.tsx -> src/modules/cha/actions.ts. |
| `src/app/(dashboard)/cha/settings/settings-form.tsx` | 1 | `large-client-component` | 1664 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/cha/settings/settings-form.tsx` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/_components/chat-provider.tsx` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/_components/chat-provider.tsx` | 245 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/communication/_components/chat-provider.tsx` | 286 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/communication/calendar/page.tsx` | 30 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/chat/page.tsx` | 1 | `large-client-component` | 2424 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 1 | `sequential-await-review` | 28 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 116 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 147 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 163 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 176 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 297 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 368 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 483 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 532 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 600 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 608 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 630 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 661 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 689 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/chat/page.tsx` | 715 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/drive/actions.ts` | 1 | `sequential-await-review` | 28 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/drive/actions.ts` | 116 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/drive/actions.ts` | 150 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/communication/drive/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/drive/page.tsx` | 32 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/drive/page.tsx` | 37 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/communication/drive/SyncDriveButton.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/communication/drive/SyncDriveButton.tsx -> src/app/(dashboard)/communication/drive/actions.ts. |
| `src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-settings.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-settings.tsx -> src/app/(dashboard)/communication/google-chat-live-view/actions.ts. |
| `src/app/(dashboard)/communication/google-chat-live-view/actions.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/google-chat-live-view/actions.ts` | 16 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/google-chat-live-view/actions.ts` | 72 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/google-chat-live-view/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/google-chat-live-view/page.tsx` | 30 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/job-spaces/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/job-spaces/page.tsx` | 38 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/layout.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/layout.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/mail/page.tsx` | 1 | `large-client-component` | 1444 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 1 | `sequential-await-review` | 21 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 69 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 85 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 107 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 143 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 234 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 250 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 262 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 275 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 303 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 328 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 366 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 886 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 914 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/mail/page.tsx` | 955 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/meetings/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/meetings/page.tsx` | 25 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/meetings/page.tsx` | 40 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/page.tsx` | 68 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/search/page.tsx` | 61 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/communication/settings/page.tsx` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/communication/settings/page.tsx` | 25 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/communication/settings/page.tsx` | 61 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/_components/activities-panel.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/_components/activities-panel.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/_components/attachments-panel.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/_components/attachments-panel.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/_components/notes-panel.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/_components/notes-panel.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/[...slug]/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/approvals/approvals-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/approvals/approvals-client.tsx -> src/modules/crm/approval-actions.ts. |
| `src/app/(dashboard)/crm/approvals/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/approvals/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/calls/page.tsx` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/calls/page.tsx` | 58 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/calls/page.tsx` | 67 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/calls/page.tsx` | 87 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/contacts/[id]/contact-detail-wrapper.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/contacts/[id]/contact-detail-wrapper.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/contacts/[id]/edit/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/contacts/[id]/edit/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/contacts/[id]/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/contacts/[id]/page.tsx` | 19 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/contacts/contact-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/contacts/contact-form.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/contacts/new/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/contacts/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/contacts/page.tsx` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/customers/[id]/account-detail-wrapper.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/customers/[id]/account-detail-wrapper.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/customers/[id]/account-detail-wrapper.tsx` | 1 | `large-client-component` | 785 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/customers/[id]/edit/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/customers/[id]/edit/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/customers/[id]/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/customers/[id]/page.tsx` | 22 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/customers/account-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/customers/account-form.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/customers/account-form.tsx` | 1 | `large-client-component` | 946 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/customers/new/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/customers/page.tsx` | 33 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/dashboard/demo-data-button.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/dashboard/demo-data-button.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/dashboard/page.tsx` | 34 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/dashboard/page.tsx` | 78 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/deals/[id]/deal-detail-wrapper.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/deals/[id]/deal-detail-wrapper.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/deals/[id]/edit/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/deals/[id]/edit/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/deals/[id]/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/deals/[id]/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/deals/deal-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/deals/deal-form.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/deals/deals-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/deals/deals-client.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/deals/new/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/deals/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/deals/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/efficiency/page.tsx` | 22 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/efficiency/page.tsx` | 62 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` | 1 | `large-client-component` | 1616 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` | 61 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 54 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 78 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 86 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 89 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/enquiries/[id]/page.tsx` | 92 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/enquiries/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/enquiries/page.tsx` | 30 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/invoices/_components/InvoiceDetailsPage.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/invoices/_components/InvoiceDetailsPage.tsx -> src/modules/crm/approval-workflow.ts. |
| `src/app/(dashboard)/crm/invoices/_components/InvoiceDetailsPage.tsx` | 1 | `large-client-component` | 527 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/invoices/[invoiceId]/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/invoices/[invoiceId]/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/invoices/[invoiceId]/page.tsx` | 24 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/invoices/[invoiceId]/page.tsx` | 32 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/invoices/[invoiceId]/page.tsx` | 86 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/invoices/invoice-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/invoices/invoice-form.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/invoices/invoice-form.tsx` | 1 | `large-client-component` | 548 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/lead-sources/import-button.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/lead-sources/import-button.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/lead-sources/import-button.tsx` | 83 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/crm/lead-sources/justdial-toggle.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/lead-sources/justdial-toggle.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/lead-sources/justdial/justdial-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/lead-sources/justdial/justdial-form.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/lead-sources/justdial/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/lead-sources/justdial/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/lead-sources/logs/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/lead-sources/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/lead-sources/page.tsx` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/leads/[id]/convert-modal.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/leads/[id]/convert-modal.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/leads/[id]/edit/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/leads/[id]/edit/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/leads/[id]/follow-up-modal.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/leads/[id]/follow-up-modal.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/leads/[id]/interested-modal.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/leads/[id]/interested-modal.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/leads/[id]/interested-modal.tsx` | 1 | `large-client-component` | 742 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` | 1 | `large-client-component` | 1682 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` | 1269 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 20 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 46 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 70 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 88 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 91 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/leads/[id]/page.tsx` | 94 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/leads/[id]/remarks-modal.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/leads/[id]/remarks-modal.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/leads/lead-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/leads/lead-form.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/leads/lead-form.tsx` | 1 | `large-client-component` | 560 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/leads/new/page.tsx` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/leads/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/leads/page.tsx` | 32 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/page.tsx` | 5 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/products/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/products/page.tsx` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/projects/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/projects/page.tsx` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/quotes/_components/NewQuotePage.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/quotes/_components/NewQuotePage.tsx -> src/modules/crm/actions.ts. |
| `src/app/(dashboard)/crm/quotes/_components/QuoteDetailsPage.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/quotes/_components/QuoteDetailsPage.tsx -> src/modules/crm/approval-workflow.ts. |
| `src/app/(dashboard)/crm/quotes/_components/QuoteDetailsPage.tsx` | 1 | `large-client-component` | 1003 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/edit/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/edit/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/quotes/[quoteId]/edit/page.tsx` | 23 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | 27 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | 47 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | 55 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/quotes/new/page.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/quotes/new/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/quotes/page.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/quotes/page.tsx` | 17 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/quotes/page.tsx` | 31 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/quotes/page.tsx` | 70 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | 23 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | 30 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | 45 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | 64 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/[id]/page.tsx` | 69 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/[id]/ticket-detail-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/tickets/[id]/ticket-detail-client.tsx -> src/app/(dashboard)/crm/tickets/actions.ts. |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 1 | `sequential-await-review` | 21 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 25 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 33 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 95 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 108 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 163 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/actions.ts` | 203 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/new/page.tsx` | 14 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/tickets/page.tsx` | 16 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/page.tsx` | 23 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/crm/tickets/page.tsx` | 44 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/crm/tickets/ticket-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/tickets/ticket-form.tsx -> src/app/(dashboard)/crm/tickets/actions.ts. |
| `src/app/(dashboard)/crm/tickets/tickets-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/crm/tickets/tickets-client.tsx -> src/app/(dashboard)/crm/tickets/actions.ts. |
| `src/app/(dashboard)/crm/vendors/page.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/crm/vendors/page.tsx` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/dashboard/_components/attendance-command.tsx` | 90 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/dashboard/module-dashboard.test.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `src/app/(dashboard)/dashboard/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/dashboard/page.tsx` | 54 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/dashboard/portal-client.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/expense/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/expense/page.tsx` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/approvals/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/employees/[id]/employee-profile.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/hrms/employees/[id]/employee-profile.tsx -> src/lib/caps-context.tsx -> src/lib/rbac.ts. |
| `src/app/(dashboard)/hrms/employees/[id]/employee-profile.tsx` | 1 | `large-client-component` | 1357 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/hrms/employees/[id]/employee-profile.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/employees/[id]/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/employees/[id]/page.tsx` | 17 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/employees/employee-account-actions.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/hrms/employees/employee-account-actions.tsx -> src/lib/caps-context.tsx -> src/lib/rbac.ts. |
| `src/app/(dashboard)/hrms/employees/employee-directory-actions.tsx` | 1 | `large-client-component` | 873 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/hrms/employees/employee-directory-actions.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/employees/employee-directory-actions.tsx` | 293 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/app/(dashboard)/hrms/employees/new/onboard-form.tsx` | 1 | `large-client-component` | 674 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/hrms/employees/new/page.tsx` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/employees/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/employees/page.tsx` | 19 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/files/page.tsx` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/helpdesk/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/letters/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/letters/view/[id]/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/letters/view/[id]/page.tsx` | 41 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/letters/view/[id]/page.tsx` | 75 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/on-duty-admin/page.tsx` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/onboarding/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/org-structure/org-structure-manager.tsx` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/org-structure/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/ownership/actions.ts` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/ownership/actions.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/ownership/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/ownership/page.tsx` | 43 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/(dashboard)/hrms/ownership/page.tsx` | 99 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/page.tsx` | 30 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/payroll/page.tsx` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/payroll/payroll-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/(dashboard)/hrms/payroll/payroll-client.tsx -> src/modules/accounting/actions.ts. |
| `src/app/(dashboard)/hrms/payroll/payroll-client.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/recruit/audit/page.tsx` | 46 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/applications/page.tsx` | 68 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/applications/page.tsx` | 83 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/assistant/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/recruit/career/assistant/page.tsx` | 28 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/assistant/page.tsx` | 39 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/assistant/page.tsx` | 50 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/assistant/page.tsx` | 74 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/jobs/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/recruit/career/jobs/page.tsx` | 45 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/jobs/page.tsx` | 59 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/jobs/page.tsx` | 70 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/recruit/career/profile/page.tsx` | 98 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/profile/page.tsx` | 112 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/resumes/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/recruit/career/resumes/page.tsx` | 38 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/resumes/page.tsx` | 55 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/career/resumes/page.tsx` | 80 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/applications/page.tsx` | 73 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/candidates/new/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/recruit/employer/candidates/new/page.tsx` | 42 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/candidates/new/page.tsx` | 64 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/candidates/page.tsx` | 38 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/jobs/new/page.tsx` | 40 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/jobs/page.tsx` | 52 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/employer/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/recruit/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/recruit/settings/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/recruit/settings/page.tsx` | 55 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/recruit/settings/page.tsx` | 104 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/(dashboard)/hrms/reimbursement/page.tsx` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/salary-revisions/page.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/hrms/salary-revisions/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/salary-structure/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/salary-structure/salary-structure-client.tsx` | 1 | `large-client-component` | 745 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/hrms/settings/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/tasks/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/tracking/page.tsx` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/travel/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/users/page.tsx` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/hrms/work-reports/page.tsx` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/layout.tsx` | 20 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/lms/_components/lms-route-page.tsx` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/notifications/page.tsx` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/product-catalogue/page.tsx` | 1 | `large-client-component` | 566 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/todo/page.tsx` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/(dashboard)/todo/todo-client.tsx` | 1 | `large-client-component` | 804 lines in a client module; review bundle and hydration boundaries. |
| `src/app/(dashboard)/todo/todo-client.tsx` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/app/(dashboard)/todo/todo-client.tsx` | 217 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/(dashboard)/todo/todo-ui.test.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `src/app/api/admin/ams-reset/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/admin/ams-reset/route.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/admin/modules/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/admin/notifications/[id]/resend/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/admin/settings/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/admin/settings/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/admin/settings/route.ts` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/admin/simulation/route.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/app/api/admin/simulation/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/admin/simulation/route.ts` | 22 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/admin/simulation/route.ts` | 46 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/ams/appraisals/[id]/availability/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/claim-management/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/claim-management/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/ams/appraisals/[id]/hike/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/management-review/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/meeting/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/minutes/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/reviewer-rating/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/reviewers/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/score-preview/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/[id]/self-assessment/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/appraisals/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/criteria/route.ts` | 1 | `sequential-await-review` | 16 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/criteria/seed/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/cycles/[id]/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/cycles/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/ams/self-form-template/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/day-punches/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/holidays/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/leave-types/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/leaves/[id]/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/leaves/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/ot/[id]/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/ot/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/punch/route.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/sync/biometric/live/route.ts` | 1 | `sequential-await-review` | 38 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/sync/biometric/route.ts` | 1 | `sequential-await-review` | 26 await expressions; review independent work for safe parallelization. |
| `src/app/api/attendance/sync/biometric/route.ts` | 48 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/checklist-files/[id]/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/cha/checklist-files/[id]/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/cha/checklist-files/[id]/route.ts` | 27 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/checklist-files/[id]/route.ts` | 31 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/customer-documents/[id]/route.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/app/api/cha/customer-documents/[id]/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/cha/customer-documents/[id]/route.ts` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/cha/customer-documents/[id]/route.ts` | 26 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/customer-documents/[id]/route.ts` | 30 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/documents/[id]/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/cha/documents/[id]/route.ts` | 4 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/app/api/cha/documents/[id]/route.ts` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/cha/documents/[id]/route.ts` | 30 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/documents/[id]/route.ts` | 34 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/expense-artifacts/[...path]/route.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/app/api/cha/expense-artifacts/[...path]/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/cha/expense-artifacts/[...path]/route.ts` | 29 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/cha/expense-artifacts/[...path]/route.ts` | 43 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cha/reports/jobs/[jobId]/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/cha/reports/jobs/[jobId]/route.ts` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/check-new/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/check-new/route.ts` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/dm/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/dm/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/list/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/list/route.ts` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/messages/route.ts` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/messages/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/messages/route.ts` | 199 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/space/members/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/space/members/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/space/members/route.ts` | 79 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/space/members/route.ts` | 126 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/space/route.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/space/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/space/route.ts` | 43 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/space/route.ts` | 129 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/sse/route.ts` | 1 | `sequential-await-review` | 16 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/chat/sse/route.ts` | 30 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/chat/sse/route.ts` | 153 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/api/communication/chat/sse/route.ts` | 154 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/api/communication/chat/sse/route.ts` | 155 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/api/communication/chat/sync/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/labels/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/mail/labels/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/labels/route.ts` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/labels/route.ts` | 50 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/link/route.ts` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/mail/link/route.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/link/route.ts` | 40 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/list/route.ts` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/modify/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/send/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/mail/send/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/mail/thread/route.ts` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/oauth/callback/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/oauth/callback/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/oauth/connect/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/oauth/disconnect/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/oauth/disconnect/route.ts` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/communication/search/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/communication/search/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/crm/justdial-live/route.ts` | 6 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/crm/recordings/[id]/download/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/crm/recordings/[id]/download/route.ts` | 4 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/app/api/crm/recordings/[id]/download/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/crm/recordings/[id]/download/route.ts` | 28 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/crm/recordings/[id]/playback/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/crm/recordings/[id]/playback/route.ts` | 4 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/app/api/crm/recordings/[id]/playback/route.ts` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/crm/recordings/[id]/playback/route.ts` | 29 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/crm/recordings/[id]/reviews/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/crm/recordings/[id]/reviews/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/crm/recordings/[id]/reviews/route.ts` | 26 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/crm/recordings/[id]/reviews/route.ts` | 38 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/cron/justdial-import/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/auth/forgot-password/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/checklist-files/[id]/route.test.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/checklist-files/[id]/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/checklist-files/[id]/route.ts` | 6 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/app/api/customer-portal/checklists/[checklistId]/decision/route.test.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/checklists/[checklistId]/decision/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/document-versions/[id]/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/document-versions/[id]/route.ts` | 2 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/app/api/customer-portal/documents/[versionId]/route.test.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/documents/[versionId]/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/customer-portal/documents/[versionId]/route.ts` | 6 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/app/api/customer-portal/shipments/[shipmentId]/documents/route.ts` | 1 | `sequential-await-review` | 17 await expressions; review independent work for safe parallelization. |
| `src/app/api/google-chat/admin/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/google-chat/admin/route.ts` | 26 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/google-chat/link/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/google-chat/webhook/route.ts` | 1 | `sequential-await-review` | 20 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/approvals/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/approvals/route.ts` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/approvals/route.ts` | 39 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/attendance/month/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/attendance/punch/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/dashboard/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/dashboard/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/dashboard/route.ts` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/employees/[id]/invitation/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/employees/[id]/profile/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/employees/[id]/salary-structure/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/employees/export/route.ts` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/employees/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/employees/route.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/employees/route.ts` | 50 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/employees/route.ts` | 75 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/app/api/hrms/files/[id]/download/route.ts` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/files/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/files/route.ts` | 42 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/files/route.ts` | 83 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/hr-cases/[id]/comments/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/hr-cases/[id]/comments/route.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/hr-cases/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/hr-cases/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/hr-cases/route.ts` | 25 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/invitations/basic/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/invitations/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/leave/requests/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/leave/summary/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/[id]/accept/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/[id]/accept/route.ts` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/[id]/action/route.ts` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/[id]/action/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/[id]/action/route.ts` | 44 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/hrms/letters/[id]/route.ts` | 1 | `sequential-await-review` | 18 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/[id]/route.ts` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/[id]/route.ts` | 40 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/[id]/route.ts` | 90 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/assets/upload/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/assets/upload/route.ts` | 2 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/app/api/hrms/letters/assets/upload/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/route.ts` | 1 | `sequential-await-review` | 16 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/route.ts` | 17 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/route.ts` | 56 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/hrms/letters/route.ts` | 68 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/settings/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/settings/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/settings/route.ts` | 22 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/share-mail/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/share-mail/route.ts` | 13 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/app/api/hrms/letters/share-mail/route.ts` | 17 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/letters/templates/upload/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/letters/templates/upload/route.ts` | 2 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/app/api/hrms/letters/templates/upload/route.ts` | 10 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/lms/route.ts` | 1 | `sequential-await-review` | 11 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/lms/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/lms/route.ts` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/lms/route.ts` | 45 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/me/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/on-duty/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/on-duty/route.ts` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/on-duty/route.ts` | 47 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/onboarding/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/onboarding/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/onboarding/route.ts` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/performance/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/performance/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/performance/route.ts` | 26 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/reimbursement/route.ts` | 1 | `sequential-await-review` | 11 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/reimbursement/route.ts` | 20 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/reimbursement/route.ts` | 54 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/settings/employee-fields/[id]/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/settings/employee-fields/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/settings/services/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/settings/services/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/settings/services/route.ts` | 23 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/settings/work-reports/[id]/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/settings/work-reports/[id]/route.ts` | 11 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/settings/work-reports/route.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/settings/work-reports/route.ts` | 15 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/tasks/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/tasks/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/tasks/route.ts` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/team/reportees/route.ts` | 7 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/timetracker/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/timetracker/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/timetracker/route.ts` | 33 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/tracking/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/tracking/route.ts` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/tracking/route.ts` | 39 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/hrms/tracking/route.ts` | 43 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/hrms/travel/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/travel/route.ts` | 8 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/travel/route.ts` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/work-reports/[id]/approve/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/work-reports/[id]/approve/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/work-reports/location/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/work-reports/location/route.ts` | 13 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/work-reports/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/hrms/work-reports/route.ts` | 9 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/hrms/work-reports/route.ts` | 47 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/mobile/auth/login/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/auth/login/route.ts` | 64 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/mobile/auth/login/route.ts` | 68 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/mobile/crm/auth/login/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/crm/auth/login/route.ts` | 46 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/mobile/crm/call-attempts/[callAttemptId]/complete/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/crm/call-attempts/[callAttemptId]/recording/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/crm/call-attempts/[callAttemptId]/recording/status/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/crm/leads/[leadId]/call-attempts/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/crm/leads/[leadId]/status/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/crm/leads/route.ts` | 35 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/mobile/hrms/agreement/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/hrms/attendance/check-in/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/hrms/attendance/check-out/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/hrms/face/enroll/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/hrms/on-duty/route.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/hrms/tracking/heartbeat/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/mobile/hrms/tracking/heartbeat/route.ts` | 24 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/api/mobile/mona/chat/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/mona/chat/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/mona/chat/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/mona/model/route.ts` | 12 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/mona/model/route.ts` | 27 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/api/org/branches/[id]/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/org/branches/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/org/departments/[id]/divisions/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/org/departments/[id]/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/org/departments/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/org/divisions/[id]/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/applications/[id]/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/applications/[id]/stage/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/applications/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/candidates/[id]/route.ts` | 1 | `sequential-await-review` | 19 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/candidates/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobs/[id]/route.ts` | 1 | `sequential-await-review` | 18 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobs/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/applications/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/career/conversations/[id]/messages/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/career/conversations/[id]/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/career/conversations/route.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/listings/route.ts` | 1 | `sequential-await-review` | 11 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/profile/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/jobseeker/resumes/route.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/app/api/recruit/settings/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/roles/[id]/permissions/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/roles/route.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/app/api/setup/route.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/app/api/setup/route.ts` | 72 | `database-in-loop` | Potential database operation inside a loop. |
| `src/app/api/todos/[id]/route.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/app/api/todos/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/todos/subtasks/[id]/route.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/api/users/[id]/password/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/users/[id]/roles/route.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/api/users/[id]/route.ts` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/app/api/users/route.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/app/customer-portal/_components/client-actions.tsx` | 1 | `large-client-component` | 1770 lines in a client module; review bundle and hydration boundaries. |
| `src/app/customer-portal/_components/client-actions.tsx` | 1 | `sequential-await-review` | 21 await expressions; review independent work for safe parallelization. |
| `src/app/customer-portal/_components/portal-kyc-workspace.tsx` | 1 | `large-client-component` | 712 lines in a client module; review bundle and hydration boundaries. |
| `src/app/customer-portal/_components/portal-kyc-workspace.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/customer-portal/layout.tsx` | 51 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/customer-portal/layout.tsx` | 72 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/app/customer-portal/shipments/[shipmentId]/checklist-decisions-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/customer-portal/shipments/[shipmentId]/checklist-decisions-client.tsx -> src/modules/customer-portal/shipments.ts. |
| `src/app/customer-portal/shipments/[shipmentId]/documents-table-client.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/app/customer-portal/shipments/[shipmentId]/documents-table-client.tsx -> src/modules/customer-portal/shipments.ts. |
| `src/app/google-chat-link/page.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/app/google-chat-link/page.tsx` | 70 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/app/google-chat-link/page.tsx` | 89 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/app/google-chat-link/page.tsx` | 89 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/google-chat-link/page.tsx` | 150 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/app/google-chat-link/page.tsx` | 150 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/app/invite/employee/employee-invitation-acceptance.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/app/invite/employee/employee-invitation-acceptance.tsx` | 37 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/app/page.tsx` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/app/verify/[id]/page.tsx` | 63 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/components/ams/criteria-points-form.tsx` | 1 | `large-client-component` | 1841 lines in a client module; review bundle and hydration boundaries. |
| `src/components/ams/criteria-points-form.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/components/auth/monolith-logistics-login.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/auth/monolith-logistics-login.tsx -> src/lib/logout.ts -> src/lib/auth-actions.ts. |
| `src/components/cha/create-job-dialog.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/cha/create-job-dialog.tsx -> src/modules/cha/actions.ts. |
| `src/components/cha/create-job-dialog.tsx` | 1 | `large-client-component` | 1604 lines in a client module; review bundle and hydration boundaries. |
| `src/components/cha/create-job-dialog.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/components/cha/dashboard-create-job.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/cha/dashboard-create-job.tsx -> src/components/cha/create-job-dialog.tsx -> src/modules/cha/actions.ts. |
| `src/components/crm/ApprovalActionBar.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/crm/ApprovalActionBar.tsx -> src/modules/crm/approval-workflow.ts. |
| `src/components/hrms/app-settings-page.tsx` | 10 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/components/hrms/app-settings-page.tsx` | 17 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/components/hrms/approvals-view.tsx` | 1 | `large-client-component` | 513 lines in a client module; review bundle and hydration boundaries. |
| `src/components/hrms/approvals-view.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/employee-profile-fields.tsx` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/files-view.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/files-view.tsx` | 170 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/components/hrms/letters-view.tsx` | 1 | `large-client-component` | 1410 lines in a client module; review bundle and hydration boundaries. |
| `src/components/hrms/letters-view.tsx` | 1 | `sequential-await-review` | 26 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/lms-view.tsx` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/on-duty-admin-view.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/onboarding-view.tsx` | 1 | `large-client-component` | 542 lines in a client module; review bundle and hydration boundaries. |
| `src/components/hrms/onboarding-view.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/pms-view.tsx` | 1 | `large-client-component` | 559 lines in a client module; review bundle and hydration boundaries. |
| `src/components/hrms/pms-view.tsx` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/reimbursement-admin-view.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/tasks-view.tsx` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/tracking-dashboard-view.tsx` | 105 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/components/hrms/travel-view.tsx` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/user-control-page.tsx` | 8 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/components/hrms/user-control-page.tsx` | 17 | `render-network-call` | Potential external network dependency in a page/layout render path. |
| `src/components/hrms/work-report-settings.tsx` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/components/hrms/work-reports.tsx` | 1 | `large-client-component` | 1290 lines in a client module; review bundle and hydration boundaries. |
| `src/components/hrms/work-reports.tsx` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/components/mona/mona-provider.tsx` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/components/monolith/accounting-commercial-document-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/monolith/accounting-commercial-document-form.tsx -> src/modules/crm/actions.ts. |
| `src/components/monolith/accounting-invoice-detail.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/monolith/accounting-invoice-detail.tsx -> src/modules/accounting/actions.ts. |
| `src/components/monolith/accounting-invoice-detail.tsx` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/components/monolith/accounting-invoice-form.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/monolith/accounting-invoice-form.tsx -> src/modules/accounting/actions.ts. |
| `src/components/monolith/accounting-items.tsx` | 1 | `large-client-component` | 532 lines in a client module; review bundle and hydration boundaries. |
| `src/components/monolith/accounting-workspace.tsx` | 1 | `large-client-component` | 611 lines in a client module; review bundle and hydration boundaries. |
| `src/components/monolith/app-shell.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/monolith/app-shell.tsx -> src/lib/rbac.ts. |
| `src/components/monolith/app-shell.tsx` | 1 | `large-client-component` | 668 lines in a client module; review bundle and hydration boundaries. |
| `src/components/monolith/crm-workspace.tsx` | 1 | `large-client-component` | 940 lines in a client module; review bundle and hydration boundaries. |
| `src/components/monolith/people-workspace.tsx` | 1 | `large-client-component` | 720 lines in a client module; review bundle and hydration boundaries. |
| `src/components/monolith/performance-workspace.tsx` | 1 | `large-client-component` | 566 lines in a client module; review bundle and hydration boundaries. |
| `src/components/monolith/workspace-dialog.test.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `src/components/notifications/notification-provider.tsx` | 1 | `sequential-await-review` | 11 await expressions; review independent work for safe parallelization. |
| `src/components/notifications/notification-provider.tsx` | 186 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/components/notifications/notification-provider.tsx` | 221 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/components/root-signout-button.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/root-signout-button.tsx -> src/lib/logout.ts -> src/lib/auth-actions.ts. |
| `src/components/session-sync.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/session-sync.tsx -> src/lib/logout.ts -> src/lib/auth-actions.ts. |
| `src/components/sidebar.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/sidebar.tsx -> src/lib/rbac.ts. |
| `src/components/sidebar.tsx` | 1 | `large-client-component` | 697 lines in a client module; review bundle and hydration boundaries. |
| `src/components/todo/todo-reminder-agent.tsx` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/components/todo/todo-reminder-agent.tsx` | 34 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/components/todo/todo-reminder-agent.tsx` | 98 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/components/welcome-bar.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/components/welcome-bar.tsx -> src/lib/caps-context.tsx -> src/lib/rbac.ts. |
| `src/components/welcome-bar.tsx` | 32 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/components/welcome-bar.tsx` | 141 | `no-store-fetch` | Uncached fetch; verify it is required and not duplicated during rendering. |
| `src/components/welcome-bar.tsx` | 152 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/lib/__tests__/ot.test.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/lib/__tests__/session-security.test.ts` | 1 | `sequential-await-review` | 51 await expressions; review independent work for safe parallelization. |
| `src/lib/api-helpers.ts` | 5 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/lib/auth-actions.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/lib/auth-actions.ts` | 24 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/lib/auth.ts` | 1 | `sequential-await-review` | 17 await expressions; review independent work for safe parallelization. |
| `src/lib/auth.ts` | 150 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/auth.ts` | 292 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/auth.ts` | 380 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/lib/auth.ts` | 381 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/lib/cache.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/lib/caps-context.tsx` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/lib/caps-context.tsx -> src/lib/rbac.ts. |
| `src/lib/db.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/lib/db.ts` | 96 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/lib/email.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/lib/email.ts` | 34 | `heavy-static-import` | Static heavy/server integration import: resend. |
| `src/lib/email.ts` | 65 | `heavy-static-import` | Static heavy/server integration import: nodemailer. |
| `src/lib/essl.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/lib/fetch-with-auth.ts` | 1 | `circular-import` | src/lib/fetch-with-auth.ts -> src/lib/fetch-with-auth.ts |
| `src/lib/fetch-with-auth.ts` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/lib/fetch-with-auth.ts -> src/lib/logout.ts -> src/lib/auth-actions.ts. |
| `src/lib/google-calendar-client.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/lib/google-chat-client.ts` | 1 | `sequential-await-review` | 57 await expressions; review independent work for safe parallelization. |
| `src/lib/google-chat-client.ts` | 578 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/lib/google-drive-client.ts` | 1 | `sequential-await-review` | 40 await expressions; review independent work for safe parallelization. |
| `src/lib/google-gmail-client.ts` | 1 | `sequential-await-review` | 33 await expressions; review independent work for safe parallelization. |
| `src/lib/google-workspace.test.ts` | 1 | `sequential-await-review` | 28 await expressions; review independent work for safe parallelization. |
| `src/lib/google-workspace.test.ts` | 370 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/job-workspace-profile.ts` | 1 | `sequential-await-review` | 11 await expressions; review independent work for safe parallelization. |
| `src/lib/logout.ts` | 1 | `client-server-boundary` | Client dependency reaches server-only code: src/lib/logout.ts -> src/lib/auth-actions.ts. |
| `src/lib/mobile-auth.ts` | 26 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/mobile-auth.ts` | 30 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/ot.ts` | 1 | `sequential-await-review` | 32 await expressions; review independent work for safe parallelization. |
| `src/lib/ot.ts` | 259 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/ot.ts` | 1036 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/lib/ot.ts` | 1096 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/ot.ts` | 1112 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/rbac.ts` | 1 | `sequential-await-review` | 8 await expressions; review independent work for safe parallelization. |
| `src/lib/session-service.ts` | 1 | `sequential-await-review` | 15 await expressions; review independent work for safe parallelization. |
| `src/lib/transcription.ts` | 1 | `sequential-await-review` | 18 await expressions; review independent work for safe parallelization. |
| `src/lib/transcription.ts` | 27 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/workspace-oauth.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/lib/workspace-provisioning.ts` | 1 | `sequential-await-review` | 47 await expressions; review independent work for safe parallelization. |
| `src/lib/workspace-provisioning.ts` | 124 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/workspace-provisioning.ts` | 211 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/workspace-provisioning.ts` | 214 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/lib/workspace-provisioning.ts` | 215 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/__tests__/accounting.test.ts` | 1 | `sequential-await-review` | 69 await expressions; review independent work for safe parallelization. |
| `src/modules/accounting/__tests__/accounting.test.ts` | 268 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/actions.ts` | 1 | `sequential-await-review` | 145 await expressions; review independent work for safe parallelization. |
| `src/modules/accounting/actions.ts` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 36 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 56 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 74 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 93 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 114 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 132 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 151 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 172 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 190 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 209 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 230 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 248 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 267 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 288 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 306 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 327 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 339 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/actions.ts` | 393 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 410 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 427 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 445 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 464 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 485 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 502 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 519 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 537 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 558 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 571 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 584 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 598 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 614 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 627 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 640 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 654 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 669 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 682 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 697 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 710 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 723 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 737 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 753 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 767 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 781 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 798 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 815 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 832 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 849 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 866 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 880 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 897 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 910 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 933 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 1006 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 1023 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/actions.ts` | 1039 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/accounting/reports.ts` | 1 | `sequential-await-review` | 22 await expressions; review independent work for safe parallelization. |
| `src/modules/accounting/reports.ts` | 36 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 361 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 403 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 459 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 518 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 563 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 685 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 723 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 755 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 787 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/reports.ts` | 849 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1 | `sequential-await-review` | 236 await expressions; review independent work for safe parallelization. |
| `src/modules/accounting/service.ts` | 316 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 356 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 401 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 436 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 445 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 453 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 466 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 530 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 597 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 607 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 611 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 618 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 631 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 645 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 777 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 859 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 907 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 917 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 921 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 927 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 940 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 954 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1079 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1161 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1208 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1219 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1224 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1330 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1367 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1401 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1457 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1494 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1530 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1556 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1593 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 1661 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1733 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1959 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1968 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 1972 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2192 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2200 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2260 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2352 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2360 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2411 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2503 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2511 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2562 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2684 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 2783 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/accounting/service.ts` | 2855 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 2938 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 3026 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 3034 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/accounting/service.ts` | 3039 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/daily-job.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/modules/ams/daily-job.ts` | 24 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/daily-job.ts` | 26 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/daily-job.ts` | 26 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/daily-job.ts` | 46 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1 | `sequential-await-review` | 153 await expressions; review independent work for safe parallelization. |
| `src/modules/ams/service.ts` | 254 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 300 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 322 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 812 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 815 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 823 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 836 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 838 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 839 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 846 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 925 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1000 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1056 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1076 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1099 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1126 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1182 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1292 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1387 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1406 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1547 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1641 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1722 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1724 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1896 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1898 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 1901 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/ams/service.ts` | 2055 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/attendance/service.ts` | 1 | `sequential-await-review` | 20 await expressions; review independent work for safe parallelization. |
| `src/modules/attendance/service.ts` | 84 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/attendance/service.ts` | 121 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/attendance/service.ts` | 134 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/attendance/service.ts` | 169 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/attendance/service.ts` | 229 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/attendance/service.ts` | 243 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/__tests__/cha.test.ts` | 1 | `sequential-await-review` | 342 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/__tests__/cha.test.ts` | 562 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/__tests__/cha.test.ts` | 637 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/__tests__/cha.test.ts` | 658 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/__tests__/cha.test.ts` | 690 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/__tests__/cha.test.ts` | 2082 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/__tests__/checklist-email-automation.test.ts` | 1 | `sequential-await-review` | 43 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/__tests__/do-extension.test.ts` | 1 | `sequential-await-review` | 37 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/actions.ts` | 1 | `sequential-await-review` | 213 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/actions.ts` | 21 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/cha/actions.ts` | 1204 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/checklist-email-automation.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/job-report.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/job-report.ts` | 92 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 99 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 101 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 103 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 111 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 113 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 114 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 119 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 126 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 128 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 141 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 143 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 146 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 152 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/job-report.ts` | 153 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 1 | `sequential-await-review` | 861 await expressions; review independent work for safe parallelization. |
| `src/modules/cha/service.ts` | 4 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `src/modules/cha/service.ts` | 5 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/modules/cha/service.ts` | 352 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 364 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 1433 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 1564 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 1807 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 1863 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 1891 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2163 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2289 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2299 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 2317 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 2573 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 2612 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2714 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2718 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2732 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2736 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2743 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2745 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2746 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2748 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2763 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2767 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2772 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2783 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2783 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2783 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2783 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2784 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2785 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2795 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2798 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2799 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2950 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 2961 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3079 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3235 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3269 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3319 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3432 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3439 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3449 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3480 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3689 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3693 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3741 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 3910 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 4141 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 4343 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 4644 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/service.ts` | 4936 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5115 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5119 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5311 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5315 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5488 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5491 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5603 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5607 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 5791 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 5814 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 5944 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 5993 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 6158 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 6208 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 6316 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 6424 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 6557 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 6680 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 6719 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 6764 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 6841 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7090 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 7435 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/service.ts` | 7614 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 7732 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7736 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7737 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7757 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7764 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7843 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7869 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7879 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 7884 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 8160 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 8242 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 8246 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 8249 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 8886 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 8890 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10303 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 10347 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 10470 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/service.ts` | 10505 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 10638 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10650 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10667 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/service.ts` | 10749 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10789 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10800 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10950 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 10998 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 11271 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11276 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11294 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11297 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11380 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11387 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11506 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11519 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11527 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11534 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 11537 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12039 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12047 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12051 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12073 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12118 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 12158 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 12207 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 12282 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 12308 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 12337 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 12382 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12383 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12607 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12610 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12611 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 12796 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13059 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13062 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13063 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13154 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13157 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13284 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13321 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 13369 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 13399 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/cha/service.ts` | 13476 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13515 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/service.ts` | 13622 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/cha/service.ts` | 13779 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13781 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13859 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 13922 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 14088 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 14428 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 14732 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/cha/service.ts` | 14787 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/communication/__tests__/chat-integration.test.ts` | 1 | `sequential-await-review` | 15 await expressions; review independent work for safe parallelization. |
| `src/modules/communication/__tests__/chat-integration.test.ts` | 119 | `broad-find-many` | findMany has no explicit bounded projection or arguments. |
| `src/modules/communication/__tests__/chat-integration.test.ts` | 323 | `broad-find-many` | findMany has no explicit bounded projection or arguments. |
| `src/modules/core/organisation/module-settings.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/modules/core/organisation/service.ts` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/modules/core/organisation/service.ts` | 98 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/core/organisation/service.ts` | 145 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/core/user/service.ts` | 1 | `sequential-await-review` | 20 await expressions; review independent work for safe parallelization. |
| `src/modules/core/user/service.ts` | 118 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/core/user/service.ts` | 122 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/core/user/service.ts` | 178 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/core/user/service.ts` | 182 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/core/user/special-account-bootstrap.ts` | 1 | `sequential-await-review` | 10 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/actions.ts` | 1 | `sequential-await-review` | 211 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/actions.ts` | 18 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 79 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 146 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 280 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 328 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 563 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 608 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 767 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 817 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 854 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 875 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 923 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 946 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 964 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1073 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1122 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1145 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1317 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1340 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1378 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1401 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1431 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1463 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1484 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1517 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1558 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1581 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1635 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1707 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1744 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1775 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1814 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1843 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1874 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 1892 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2217 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2252 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2297 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2339 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2361 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2378 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2405 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2585 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2645 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2675 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2721 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2759 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2890 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/actions.ts` | 2901 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/actions.ts` | 2904 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/actions.ts` | 2907 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/approval-actions.ts` | 1 | `sequential-await-review` | 26 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/approval-actions.ts` | 23 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/crm/approval-workflow.ts` | 1 | `sequential-await-review` | 88 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/approval-workflow.ts` | 146 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/crm/approval-workflow.ts` | 586 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/approval-workflow.ts` | 672 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/crm/approval-workflow.ts` | 714 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/approval-workflow.ts` | 876 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/approval-workflow.ts` | 937 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/approval-workflow.ts` | 978 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/crm/approval-workflow.ts` | 1003 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/approval-workflow.ts` | 1031 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/crm/crm-lead-conversion.service.ts` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/crm-lead-conversion.service.ts` | 123 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/crm/crm-lead-conversion.service.ts` | 178 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/justdial-import.service.ts` | 1 | `sequential-await-review` | 72 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/justdial-import.service.ts` | 2 | `heavy-static-import` | Static heavy/server integration import: node:fs. |
| `src/modules/crm/lead-source.service.ts` | 6 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 1 | `sequential-await-review` | 34 await expressions; review independent work for safe parallelization. |
| `src/modules/crm/service.ts` | 30 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 67 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 123 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 168 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 201 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 210 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 280 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 290 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 353 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 363 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 426 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 436 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 519 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 533 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 646 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 656 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/crm/service.ts` | 702 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/__tests__/dashboard.test.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/modules/customer-portal/__tests__/shipments.test.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/modules/customer-portal/actions.ts` | 1 | `sequential-await-review` | 17 await expressions; review independent work for safe parallelization. |
| `src/modules/customer-portal/actions.ts` | 16 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/customer-portal/actions.ts` | 96 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/customer-portal/actions.ts` | 108 | `direct-auth` | Direct auth() call; server render trees should use request-scoped getSession(). |
| `src/modules/customer-portal/auth.ts` | 1 | `sequential-await-review` | 20 await expressions; review independent work for safe parallelization. |
| `src/modules/customer-portal/auth.ts` | 130 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/feature-flags.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/modules/customer-portal/feature-flags.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/modules/customer-portal/service.ts` | 1 | `sequential-await-review` | 137 await expressions; review independent work for safe parallelization. |
| `src/modules/customer-portal/service.ts` | 3 | `heavy-static-import` | Static heavy/server integration import: fs/promises. |
| `src/modules/customer-portal/service.ts` | 75 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/customer-portal/service.ts` | 89 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/customer-portal/service.ts` | 225 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 250 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 305 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 364 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 496 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 548 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 626 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 659 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 731 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 738 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 745 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 755 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 763 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 846 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 855 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 862 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 873 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 886 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 987 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 1060 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/customer-portal/service.ts` | 1101 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 1179 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 1210 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/service.ts` | 1426 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/customer-portal/shipments.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/modules/dashboard/service.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/modules/dashboard/service.ts` | 495 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/google-chat/commands.ts` | 1 | `sequential-await-review` | 17 await expressions; review independent work for safe parallelization. |
| `src/modules/google-chat/commands.ts` | 187 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/google-chat/delivery.ts` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/modules/google-chat/identity.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/modules/google-chat/identity.ts` | 31 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/google-chat/identity.ts` | 280 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/google-chat/router.ts` | 1 | `sequential-await-review` | 7 await expressions; review independent work for safe parallelization. |
| `src/modules/google-chat/router.ts` | 63 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/google-chat/router.ts` | 172 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/google-chat/router.ts` | 183 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/google-chat/space.ts` | 1 | `sequential-await-review` | 9 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/__tests__/employee-directory-export.test.ts` | 2 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `src/modules/hrms/__tests__/letters.test.ts` | 1 | `sequential-await-review` | 13 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/__tests__/work-report.test.ts` | 1 | `sequential-await-review` | 5 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/document-drive.ts` | 1 | `sequential-await-review` | 31 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/employee-directory-export.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: xlsx. |
| `src/modules/hrms/employee-invitation.ts` | 1 | `sequential-await-review` | 35 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/employee-invitation.ts` | 498 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/employee-invitation.ts` | 535 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/employee-invitation.ts` | 565 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/employee-profile.ts` | 1 | `sequential-await-review` | 14 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/employee-profile.ts` | 330 | `database-in-loop` | Potential database operation inside a loop. |
| `src/modules/hrms/employee-profile.ts` | 473 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/face-enrollment.ts` | 1 | `sequential-await-review` | 16 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/letter-template-import.ts` | 1 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/modules/hrms/letters-service.ts` | 1 | `sequential-await-review` | 30 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/letters-service.ts` | 5 | `heavy-static-import` | Static heavy/server integration import: fs. |
| `src/modules/hrms/letters-service.ts` | 396 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/letters-service.ts` | 434 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/letters-service.ts` | 441 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/letters-service.ts` | 449 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/letters-service.ts` | 499 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/letters-service.ts` | 794 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/mobile-attendance.ts` | 1 | `sequential-await-review` | 34 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/on-duty.ts` | 1 | `sequential-await-review` | 68 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/on-duty.ts` | 143 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 493 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 760 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 768 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 772 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 789 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 826 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/on-duty.ts` | 837 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1 | `sequential-await-review` | 82 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/service.ts` | 331 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 337 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 368 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 399 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 406 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 450 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 458 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 487 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 601 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 901 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 913 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1080 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1218 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1439 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1540 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1547 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1620 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1671 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1727 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1734 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1740 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1746 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1752 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/service.ts` | 1758 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/hrms/user-agreement.ts` | 1 | `sequential-await-review` | 12 await expressions; review independent work for safe parallelization. |
| `src/modules/hrms/user-agreement.ts` | 240 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/mona/gemini-client.ts` | 1 | `sequential-await-review` | 6 await expressions; review independent work for safe parallelization. |
| `src/modules/mona/local-engine.ts` | 1 | `sequential-await-review` | 11 await expressions; review independent work for safe parallelization. |
| `src/modules/mona/service.ts` | 1 | `sequential-await-review` | 4 await expressions; review independent work for safe parallelization. |
| `src/modules/mona/service.ts` | 60 | `polling` | Repeated polling timer; verify visibility pause, singleton, and in-flight coordination. |
| `src/modules/mona/service.ts` | 177 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/mona/tools.ts` | 1 | `sequential-await-review` | 22 await expressions; review independent work for safe parallelization. |
| `src/modules/mona/tools.ts` | 305 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/mona/tools.ts` | 311 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/notifications/service.ts` | 1 | `sequential-await-review` | 60 await expressions; review independent work for safe parallelization. |
| `src/modules/notifications/service.ts` | 210 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/notifications/service.ts` | 222 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/notifications/service.ts` | 355 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/notifications/service.ts` | 414 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/notifications/service.ts` | 418 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/notifications/service.ts` | 455 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/notifications/service.ts` | 525 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/notifications/service.ts` | 736 | `unbounded-promise-all` | Promise.all over a collection may exceed the database or network concurrency budget. |
| `src/modules/recruit/employer-service.ts` | 1 | `sequential-await-review` | 28 await expressions; review independent work for safe parallelization. |
| `src/modules/recruit/employer-service.ts` | 60 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 247 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 255 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 405 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 422 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 427 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 432 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 599 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 621 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/employer-service.ts` | 648 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/recruit/jobseeker-service.ts` | 1 | `sequential-await-review` | 20 await expressions; review independent work for safe parallelization. |
| `src/modules/todo/service.ts` | 1 | `sequential-await-review` | 36 await expressions; review independent work for safe parallelization. |
| `src/modules/todo/service.ts` | 228 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 250 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 311 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 381 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 422 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 439 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 483 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 523 | `broad-include` | Broad relational include; verify only rendered fields are selected. |
| `src/modules/todo/service.ts` | 537 | `database-in-loop` | Potential database operation inside a loop. |

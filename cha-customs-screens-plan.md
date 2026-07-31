# CHA Customs Masters, Import, and Export Filing - Phase 0 Plan

Generated on 2026-07-31 from repository inspection only.

No production code, Prisma schema, routes, or runtime behavior were changed in this phase.

## 1. Current Route Map

Current discovered CHA pages under `src/app/(dashboard)/cha`:

| Route | Source | Purpose | Current guard/data owner |
| --- | --- | --- | --- |
| `/cha` | `src/app/(dashboard)/cha/page.tsx` | CHA dashboard, assigned jobs, operations overview, warnings | `getSession`, `requirePermission("cha.dashboard.view")`, Prisma/dashboard queries |
| `/cha/jobs` | `src/app/(dashboard)/cha/jobs/page.tsx` | Active/completed job register, filters, lazy create dialog | `requirePermission("cha.job.read")`, `src/modules/cha/jobs/queries.ts` |
| `/cha/jobs/[jobId]` | `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx` | Existing job aggregate workspace | `getJobDetails`, assignment/view-all gate, route-private client |
| `/cha/approvals` | `src/app/(dashboard)/cha/approvals/page.tsx` | Checklist and deletion approvals | `cha.checklist.manager_approve`, `listManagerChecklistApprovals`, `listManagerJobDeletionRequests` |
| `/cha/expenses` | `src/app/(dashboard)/cha/expenses/page.tsx` | CHA expense request/review/payment workspace | `cha.access` plus expense permissions |
| `/cha/reports` | `src/app/(dashboard)/cha/reports/page.tsx` | Completed job reports and audit/report view | `cha.audit.view` |
| `/cha/customers` | `src/app/(dashboard)/cha/customers/page.tsx` | Customer master backed by CRM accounts | `cha.customer.read`, Prisma `CrmAccount` |
| `/cha/customers/new` | `src/app/(dashboard)/cha/customers/new/page.tsx` | New customer profile | `cha.customer.manage`, CRM actions |
| `/cha/customers/[id]/edit` | `src/app/(dashboard)/cha/customers/[id]/edit/page.tsx` | Edit customer profile/KYC | `cha.customer.manage`, CRM actions |
| `/cha/settings` | `src/app/(dashboard)/cha/settings/page.tsx` | CHA settings, job types, teams, document requirements | `cha.settings.manage`, `src/modules/cha/service.ts` |
| `/cha/settings/filing-workflows` | `src/app/(dashboard)/cha/settings/filing-workflows/page.tsx` | Filing workflow template builder | `cha.settings.manage`, filing workflow services |
| `/cha/labs/import-job-creation` | `src/app/(dashboard)/cha/labs/import-job-creation/page.tsx` | Existing URL-only isolated prototype from prior worktree | `cha.access`; localStorage only; not production navigation |

Current non-page CHA API routes:

| Route | Purpose |
| --- | --- |
| `/api/cha/jobs/create-options` | Lazy job creation options |
| `/api/cha/documents/[id]` | Job document access |
| `/api/cha/checklist-files/[id]` | Checklist file access |
| `/api/cha/customer-documents/[id]` | Customer portal document access |
| `/api/cha/due-date-warnings` | Warning acknowledgement/list support |
| `/api/cha/reports/jobs/[jobId]` | Job report export/read |
| `/api/cha/expense-artifacts/[...path]` | Protected expense artifact access |

## 2. Current CHA Model and Relation Map

`ChaJob` is the existing aggregate root and must remain the aggregate root.

Core aggregate:

| Model | Existing purpose | Relation to filing work |
| --- | --- | --- |
| `ChaJob` | Job number, customer, job type, shipment type, branch, priority, stage, status, owner, manager, deletion state | Parent for all import/export filing data |
| `ChaJobType` | Clearance type taxonomy; includes `movementDirection`, `manifestRequirement`, `filingFlowCategory` | Determines Import BE vs Export SB filing workspace |
| `ChaShipmentType` | Shipment mode/type catalog | Reuse for transport/shipment mode options where possible |
| `ChaBranchNumberingRule` | Branch job numbering | Reuse for job numbers; customs filing refs should not replace this |
| `ChaJobAssignment` | User responsibilities | Reuse for owner, manager, filing, approval permissions |
| `ChaAuditLog` | Audit events scoped by org/job/entity | Extend for all customs filing and master edits |

Existing job child domains:

| Domain | Models |
| --- | --- |
| Documents | `ChaDocumentDefinition`, `ChaJobDocumentRequirement`, `ChaDocumentRequirementCategory`, `ChaDocumentRequirementItem`, `ChaDocumentVersion`, `ChaDocumentException` |
| Additional data | `ChaJobAdditionalData`, `ChaDoExtension`, `FilingSection49Flag`, `FilingSection49Extension` |
| Checklist | `ChaChecklist`, `ChaChecklistFileVersion`, `ChaChecklistDecision`, `ChaChecklistMailLog`, `ChaChecklistImport`, `ChaChecklistSection`, `ChaChecklistItem`, `ChaChecklistApproval`, `ChaChecklistReworkNote` |
| Filing timeline | `ChaFiling`, `ChaFilingDateHistory` |
| Workflow builder/runtime | `FilingWorkflowTemplate`, `FilingWorkflowVersion`, `FilingWorkflowNode`, `FilingWorkflowEdge`, `FilingWorkflowInstance`, `FilingNodeRun`, `FilingFieldValue`, `FilingToggleState`, `FilingWorkflowQuery`, `FilingChecklistResponse`, `FilingAttachment` |
| Advances | `ChaCustomerAdvance`, `ChaCustomerAdvanceReceipt` |
| Expenses | `ChaExpenseRequest`, `ChaExpenseLine`, `ChaExpensePayment`, `ChaExpenseQuery`, `ChaExpenseStatusHistory` |
| Customer portal | `CustomerDocumentSubmission`, `CustomerDocumentVersion`, `CustomerChecklistResponse`, `CustomerQueryThread`, `CustomerQueryMessage`, `ShipmentServiceRating` |

Fields already present for requested behavior:

- Import/export direction: `ChaJobType.movementDirection`.
- Manifest requirement: `ChaJobType.manifestRequirement` and `ChaJobAdditionalData.importGeneralManifest` / `exportGeneralManifest` / `customManifestValue`.
- BE/SB filing references: `ChaFiling.billOfEntryNumber`, `ChaFiling.shippingBillNumber`, `ChaFiling.filingRef`, `ChaFiling.actualFilingDate`.
- Filing workflow categorization: `ChaJobType.filingFlowCategory`, `FilingWorkflowTemplate.filingFlowCategory`.
- Document uploads, validity, checklist decisions, customer submissions, expenses, audit, due-date warnings: existing model coverage is substantial.

Fields/tables not present and likely needed additively:

- Customs master data tables for RITC, Cess Rate, RoDTEP, RoSCTL, Drawback, Scheme Code, RoDTEP EOU, SW CTH, AIDC, BCD, Master Notification, Supporting Document, UOM.
- Historical snapshots for master codes/rates/formulas/version used by each filing.
- Typed import/export filing data under `ChaJob`, not standalone jobs.
- Filing line tables for invoices, items, declarations, supporting document rows, generated flat-file artifacts, and external submission attempts.
- Optional ICEGATE configuration and operation state tables, server-only.

## 3. Existing Import Master Reuse Assessment

The repository does not currently contain production customs-master routes or Prisma models for the screenshots' ZEALIT-style Import Master pages. Searches for RITC, RoDTEP, RoSCTL, Drawback, AIDC, BCD, SW CTH, Scheme Code, Supporting Document, UOM, and Master Notification found only:

- the isolated lab fixtures under `src/modules/cha/labs/import-job-creation`;
- general CHA document requirement setup under `ChaDocumentRequirement*`;
- CRM customer KYC/IEC fields;
- labels and tests in existing CHA job/document/checklist code.

Reusable existing "master" concepts:

| Existing area | Reuse decision |
| --- | --- |
| `ChaJobType` | Reuse for import/export clearance type and filing flow selection |
| `ChaShipmentType` | Reuse where values align; do not overload for customs UOM/ports |
| `ChaDocumentRequirementCategory` / `ChaDocumentRequirementItem` | Reuse for job document gates; add separate customs Supporting Document master only when needed for filing code lookup |
| CRM `CrmAccount` customer profile | Reuse for importer/exporter/consignee/customer identity snapshots |
| `AccountingExchangeRate` | Evaluate for invoice exchange-rate snapshots; do not use live accounting rates without snapshotting |
| Lab master fixtures | Useful field vocabulary only; not production data |

Conclusion: Phase 1 should create a shared customs master-data engine and typed master definitions. It should not duplicate `ChaJob`, CRM customer masters, or document requirement models.

## 4. Component Reuse Matrix

Use existing production Monolith components and CSS tokens. Do not copy the ZEALIT visual style.

| Need | Canonical component/source | Notes |
| --- | --- | --- |
| Page shell | `ChaWorkspaceFrame`, `WorkspacePage`, `MonolithAppShell` | Existing `/cha/layout.tsx` already wraps CHA routes |
| Page header | `ChaRoutePageHeader`, `WorkspacePageHeader`, `WorkspaceSectionHeading` | Major section headings must use `WorkspaceSectionHeading` |
| Panels/cards | `WorkspacePanel`, `ChaSection`, `MonolithSurface`, `Card` only when established | No nested card-in-card layouts |
| Metrics | `mnx-workspace-metrics` + `WorkspaceMetric` | Reuse for filing completeness/validation counts |
| Forms | `WorkspaceField`, `WorkspaceInput`, `WorkspaceTextarea`, `DateInput`, `NativeSelect`, `DropdownSelect`, `NeonCheckbox` | Use semantic classes: `mnx-field`, `mnx-field-control`, `mnx-label` |
| Tabs | Existing `ChaTabs`/`ChaTabButton` style from `cha-workspace` or add one shared component to `src/components/monolith` if missing | Must be in design-system catalogue before broad use |
| Buttons/icon buttons | `Button`, `WorkspaceAction`, lucide icons | No one-off controls |
| Badges/status | `Badge`, `WorkspaceBadge`, CHA badge helpers | Extend badge helpers for customs states |
| Alerts/errors | `WorkspaceAlert`, `WorkspaceState`, `ChaErrorState`, `ChaLoadingState` | Keep typed unsupported/not-configured states |
| Tables | `WorkspaceTable` and `src/components/monolith/workspace-data-table.tsx` | Server pagination and filter controls should reuse datatable primitives |
| Filters | `ChaFilterMenu`, `FilterMenu`, `mnx-filter-button` | Shared master engine should use one filter component |
| Dialogs/drawers | `WorkspaceDialogLayer`, `ChaDialogLayer`, `Modal` | Use for edit/import/download states |
| File uploads | `FileUploadField`, existing CHA document upload patterns | Server validation remains mandatory |
| Toasts | `sonner` as existing app convention | No confidential values in toast |

Semantic style sources inspected:

- `src/styles/monolith-tokens.css`
- `src/styles/monolith-system.css`
- `_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies/app/globals.css` (read-only)

Theme support exists through Light, Night, and Violet root theme classes and Monolith tokens.

Ownership issue found:

- `src/app/(dashboard)/cha/customers/page.tsx` imports route-private CRM `DeleteRecordButton` from `src/app/(dashboard)/crm/_components/delete-record-button`. Move this to a shared location such as `src/components/monolith` or `src/modules/crm/components` before further reuse.

## 5. Screenshot Field and Action Matrix

The screenshots are functional references only.

### Import transaction - BE Main Details

| Area | Fields/actions observed |
| --- | --- |
| Header | Job Creation, breadcrumb New, message/action buttons, Lock, Close |
| Tabs | BE Main Details, IGM, Invoice, Item Details, Declaration, Supporting Document, CheckList, Flat File |
| Job Details | Job No, Job Date, BE Type, Transport Mode, Filing Type, Customs House, Code, Warehouse Code, W.H Customs Site ID, No. of PKG, PKG Code, Grs.Wt, UOM |
| BE Details | BE No, BE Date, Examination Date, OOC, Duty Paid, Delivered |
| CHA Details | ICEGATE ID, CHA PAN No, ATP Name, ATP PAN No |
| Importer Details | Standard IEC, Importer Name, IEC No, Branch SI No, Importer Category, Type, Address, Class, City, State, PIN Code, AD Code, State Of Origin, GSTN Type, Tax Reg No |
| Switches/options | First Check, Green Channel, Kaccha BE, Provisional Assess, High Sea Sale, Ex-Bond, UCR Type, UCR No, Payment Method |
| Shipment Details | Port Of Shipment, Code, Country Of Shipment, Code, Port of Origin, Code, Country Of Origin, Code, Other Details |
| Actions | Bond Details, Certificate Details, importer lookup/add, Save |

### Import transaction - IGM

| Area | Fields/actions observed |
| --- | --- |
| IGM Details | IGM No, File Type, IGM Date, Inward Date, Gateway Port, Gateway Mode |
| Manifest/shipping | MBL No, NOMBL checkbox, MBL Date, HBL No, HBL Date, Marks & Nos |
| Package/weight | No Of package, Package Code, 20 FT, 40 FT, Gross Weight, Net Weight, UOM |
| Other | Section 48 checkbox/value |
| Actions/table | IGM lookup button, disabled Container Details, Clear, Save, paginated IGM table |

### Import transaction - Invoice

| Area | Fields/actions observed |
| --- | --- |
| Invoice Details | Job No, Sl.No, Invoice No, Invoice Date, Nature of Payment, Nature of Transaction, Currency, Exchange Rate, Invoice Value, Invoice Val INR, Inco Terms, Valuation Method, Total Invoice |
| Supplier Details | Use For All Invoice, Use as Default Manufacture, Supplier Name, Supplier Address, Supplier Country, Zip Code, Seller Details, Broker Details, Third Party, AEO, SVB Details |
| Contract Details | Single Freight & Insurance, Actual Freight, Miscellaneous, Freight, Insurance, Agency, Loading, Discount, High Sea Sale, Currency, Ex.Rate, Rate, Amount, INR, Assessable Val |
| Actions/table | Other Charges, Upload, New, Save, Reset/Clear, invoice table, total amount footer |

### Import transaction - Declaration

| Area | Fields/actions observed |
| --- | --- |
| Declaration form | Serial No, Statement Type, Statement Code, Statement Text, Declaration Type, Declaration No, Date, Invoice Sl No, Item Sl No |
| Actions/table | Upload, Add Default Row, Clear, Save, declaration table |

### Master data

| Screen | Columns/fields/actions observed |
| --- | --- |
| RITC UNIT | Tariff Item, Description, UOM, Import Policy, Import Policy Condition, Export Policy, Export Policy Condition, SIMS, NFMIMS, PIMS, BIS, Tobacco; row edit, column filters, pagination |
| Cess Rate | RITC Code, Cess Serial No, Cess Flag, TAR Value, TAR Accounting Unit, Cess Rate Advance, Cess Value, Cess Accounting Unit, Status; row edit, filters, pagination |
| RoDTEP | RITC No, Description, Rate, Rate Per, UQC, Cap Rate, Status; edit, filter, pagination |
| RoSCTL | RoSCTL Code, Description, Percentage, Rate Amount, Accounting Unit, Schedule, Status; edit, filter, pagination |
| Drawback | DBK Header, DBK Serial NO, Description, Rate Advance, Specific Value, Accounting Unit, Per Unit, Status; edit, filter, pagination |
| Scheme Code | Exim Code, Exp Scheme Name, Imp Scheme Name, Scheme Type, Applicable Exp Schemes, Description, Exp License, Imp License, License DEPB, Exp EOU, Exp DFIA License, Exp Drawback; edit, filter, pagination |
| RoDTEP EOU | RITC No, Description, Rate, Rate Per, UQC, Cap Rate; edit, filter, pagination |
| SW CTH | From Cth, To Cth, Agency Name, Agency Code, Effective Date, End Date, Remarks; Search, Download, Upload, Clear, Submit, edit/duplicate, table |
| AIDC | Notn Type, Notn, Notn Date, Sl No, CTH, Rate, Amount, Uqc, Flag, Condition, CVD Rate, CVD Amount, CVD Uqc, CVD Flag, AD Flag, Item Description; Search, Download, Upload, Clear, Submit, edit/duplicate |
| BCD | CTH, Item Description, BCD Flag, BCD Rate, Amount, UQC, Preferential, PFlag, PRate, PAMTS, PUQC, SUQC; Search, Download, Upload, Clear, Submit, edit/duplicate |
| Master Notification | Notification, Notification Type, PFLG, Category, Quota, Notification Date, Port, Country FTA, Serial No, Sub Sl No, CTH, List Item, Item Description, Rate, Amount, UQC, Flag, Condition, CVD Rate, CVD Amount, CVD UQC, CVD Flag, Amend Notification, Amend Year, Amend Sl No, Status, AD Flag, Preferential Duty Flag, BCD Amount, BCD UQC, Bond Code, Scheme Code, Drawback Type, Notn Eff Date, Notn End Date; Search, Download, Upload, Clear, Submit |
| Supporting Document | Document Code, Document Name, Invoice SL No, Item SL No, Document Description, Status; edit, filters, pagination |
| UOM Master | Quantity Code, Quantity Description, Quantity Type, Status; edit, filters, pagination |

### Export transaction

| Screen | Fields/actions observed |
| --- | --- |
| Export Job list | Job No, Sl.No, Job Date, SB No, SB Date, SB Type, Mode, Custom House, Code, Exporter Name, Br Sl.No, Consignee Name, Consignee Country, Buyer Name, Buyer Country, Port Of Discharge, Port Of Destination, Invoice No, Scheme, Total Inv, Total Item, Action; File Read, Create New, Search, row actions |
| SB Main Details | Job No, Date, SB Type, Transport Mode, Booking No, Booking Date, Customs House, Code, SB No, SB Date, Examination, LEO Date, ICEGATE ID, CHA/Exporter PAN No, Exporter fields, Consignee fields, Shipment fields, Annexure C, Rotation & Stuffing, Package Details, Container Details, EOU Details, Save |
| Invoice Details | Job No, Sl.No, Invoice No, Invoice Date, Contract No, Nature of Payment, Period of Payment, Currency, Exchange Rate, Product Value, Product Val INR, Inco Terms, Add Freight, Buyer Details, Contract Details, Third Party, AEO, Save, table |
| Item Details | Job No, Inv Sl.No, Inv No, Total No. of Product, Product Sl.No, RITC No, Item Description, Scheme Code, Quantity, Unit, Unit Price, Per, Item Amt, Item Amt INR, Total PMV, End Use, Single Window/Info Details, GST Details, Drawback & RoSCTL, Other Details, New, Save, table |
| Supporting Documents | Sl No, Doc Type Code, IRN No, DRN No, Issue Date, Declaration Type, File Type, Place of Issue, Invoice Sl No, Item Sl No, Expiry Date, Invoice No, ICE Gate ID, Issuing Party Details, Beneficiary Details, Save, table |
| Checklist | Job No, Job Date, With Declaration, Generate PDF, Download, Cancel, Job Summary groups |
| Flat File | Job No, Job Date, Dummy Job, History, Generate, Sign, Sign Tool, Cancel, Job Summary groups |

## 6. Proposed Route Map

Production routes should extend the existing CHA module:

| Proposed route | Purpose | Notes |
| --- | --- | --- |
| `/cha/masters` | Customs master index/landing | Optional if navigation grouping is needed |
| `/cha/masters/[masterKey]` | Shared master-data register for RITC, Cess Rate, RoDTEP, RoSCTL, Drawback, Scheme Code, RoDTEP EOU, SW CTH, AIDC, BCD, Master Notification, Supporting Document, UOM | One route + typed config, not 13 duplicated pages |
| `/cha/jobs/[jobId]?tab=customsFiling` | Existing job workspace with Customs Filing Data tab | Preferred entry, keeps `ChaJob` root |
| `/cha/jobs/[jobId]/filing-data` | Optional direct deep-link route to the same job-scoped filing data workspace | Can redirect or render same component |
| `/cha/jobs/[jobId]/filing-data/import` | Optional deep link for Import BE tab state | Use only if URL state becomes unwieldy |
| `/cha/jobs/[jobId]/filing-data/export` | Optional deep link for Export SB tab state | Use only if URL state becomes unwieldy |
| `/api/cha/masters/[masterKey]` | Import/download/query endpoint if server actions are not enough | Server-only permission/org scope |
| `/api/cha/jobs/[jobId]/customs-filing/...` | File download/generation operations | No credentials or sensitive payloads in browser |

Phase 7 actual export/shared master paths:

| Master | Actual route | Model/service |
| --- | --- | --- |
| RITC UNIT | `/cha/masters/ritc-unit` | `ChaRitcTariffMaster`, shared master grid/import service |
| Cess Rate | `/cha/masters/cess-rate` | `ChaCessRateMaster`, shared master grid/import service |
| RoDTEP | `/cha/masters/rodtep` | `ChaRodtepRateMaster`, shared master grid/import service |
| RoSCTL | `/cha/masters/rosctl` | `ChaRosctlRateMaster`, shared master grid/import service |
| Drawback | `/cha/masters/drawback` | `ChaDrawbackRateMaster`, shared master grid/import service |
| Scheme Code | `/cha/masters/scheme-code` | `ChaSchemeCodeMaster`, shared master grid/import service |
| RoDTEP EOU | `/cha/masters/rodtep-eou` | `ChaRodtepEouRateMaster`, shared master grid/import service |
| Filtered export | `/cha/masters/[masterKey]/download` | bounded CSV export from the current server filter |

Phase 8 actual import/single-window/common master paths:

| Master | Actual route | Model/service |
| --- | --- | --- |
| SW CTH | `/cha/masters/sw-cth` | `ChaSingleWindowCthMaster`, shared master grid/import service, `lookupSingleWindowAgency` |
| AIDC | `/cha/masters/aidc` | `ChaAidcRateMaster`, shared master grid/import service, `lookupAidcByCth` |
| BCD | `/cha/masters/bcd` | `ChaBcdRateMaster`, shared master grid/import service, `lookupBcdByCth` |
| Master Notification | `/cha/masters/master-notification` | `ChaCustomsNotificationMaster`, shared master grid/import service, `lookupNotification` |
| Supporting Document | `/cha/masters/supporting-document` | `ChaSupportingDocumentMaster`, shared master grid/import service, `lookupSupportingDocument` |
| UOM Master | `/cha/masters/uom-master` | `ChaUomMaster`, shared master grid/import service, `lookupUom` |

Navigation:

- Add master links only when Phase 1 creates production masters and permissions.
- Do not expose the existing `/cha/labs/import-job-creation` lab in production navigation.

## 7. Proposed Module Ownership Map

| Area | Proposed location |
| --- | --- |
| Master config/types/schema | `src/modules/cha/customs-masters/master-definitions.ts`, `schemas.ts`, `types.ts` |
| Master repository/service | `src/modules/cha/customs-masters/service.ts`, `queries.ts`, `bulk-import.ts`, `download.ts`, `audit.ts` |
| Master route UI | `src/app/(dashboard)/cha/masters/[masterKey]/page.tsx`, `master-register-client.tsx` |
| Filing data domain | `src/modules/cha/customs-filing/types.ts`, `schemas.ts`, `calculations.ts`, `snapshots.ts`, `flat-file.ts` |
| Filing data repository/service | `src/modules/cha/customs-filing/service.ts`, `queries.ts`, `actions.ts` or extend `src/modules/cha/actions.ts` with bounded wrappers |
| Job workspace production UI | `src/modules/cha/customs-filing/components/*` imported by `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` |
| ICEGATE integration shell | `src/modules/cha/icegate/types.ts`, `client.server.ts`, `service.ts`, `config.ts` |
| Tests | `src/modules/cha/customs-masters/__tests__/*`, `src/modules/cha/customs-filing/__tests__/*`, existing CHA integration tests extended |

Move route-private shared pieces before reuse:

- `src/app/(dashboard)/cha/_components/cha-operations-shared.tsx` can remain route-private unless used outside CHA routes.
- `src/app/(dashboard)/crm/_components/delete-record-button` should move before being imported by CHA or other modules.

## 8. Proposed Schema Additions and Reuse Decisions

All schema changes must be additive Prisma migrations.

Suggested master tables:

- `ChaCustomsMasterSource`: source/version/import metadata, org scope, file hash, effective dates, uploaded by.
- `ChaCustomsMasterRecord`: generic record base for shared pagination/filter/import/download/audit, or one typed table per master where query/index requirements justify it.
- Typed tables where strong numeric/query constraints are needed:
  - `ChaRitcUnit`
  - `ChaCessRate`
  - `ChaRodtepRate`
  - `ChaRosctlRate`
  - `ChaDrawbackRate`
  - `ChaSchemeCode`
  - `ChaRodtepEouRate`
  - `ChaSingleWindowCth`
  - `ChaAidcNotification`
  - `ChaBcdNotification`
  - `ChaMasterNotification`
  - `ChaSupportingDocumentMaster`
  - `ChaUomMaster`

Suggested filing tables, all child records of `ChaJob`:

- `ChaCustomsFiling`: one per job; direction `IMPORT_BE`/`EXPORT_SB`, status, locked state, current version, validation state.
- `ChaImportBeHeader`, `ChaImportIgm`, `ChaImportInvoice`, `ChaImportItem`, `ChaImportDeclaration`, `ChaImportSupportingDocument`.
- `ChaExportSbHeader`, `ChaExportInvoice`, `ChaExportItem`, `ChaExportSupportingDocument`.
- `ChaFilingChecklistSummary`: generated checklist/PDF metadata.
- `ChaFlatFileArtifact`: generated flat-file content hash, storage key, test/production mode, generated by/at.
- `ChaFilingSubmissionAttempt`: server-only external submission/signing state; no raw confidential response in UI.
- `ChaFilingMasterSnapshot`: immutable snapshot per field/row referencing master record id, code, description, rate, formula, source version, effective date.

Reuse:

- Link to `ChaJob.id`, `CrmAccount.id`, `ChaFiling.id`, existing `FilingWorkflowInstance.id`, existing document requirement/version records.
- Keep current `ChaFiling.billOfEntryNumber` and `shippingBillNumber` as summary/search fields; detailed BE/SB data belongs in new child tables.
- Use existing `ChaAuditLog` for audit events rather than creating a parallel audit system.

## 9. Proposed Permissions

Existing permissions to reuse:

- `cha.access`, `cha.job.read`, `cha.job.create`, `cha.job.update`, `cha.job.view_all`
- `cha.document.read`, `cha.document.upload`, `cha.document.exception`
- `cha.checklist.*`
- `cha.filing.manage`
- `cha.audit.view`
- `cha.settings.manage`

New permissions proposed:

| Permission | Purpose |
| --- | --- |
| `cha.master.read` | View customs master registers |
| `cha.master.manage` | Create/edit/activate/deactivate master rows |
| `cha.master.import` | Bulk upload master data |
| `cha.master.export` | Download master data |
| `cha.filing_data.view` | View job customs filing data |
| `cha.filing_data.edit` | Edit draft filing data |
| `cha.filing_data.lock` | Lock/unlock filing data for review |
| `cha.filing_data.generate` | Generate checklist/flat-file artifacts |
| `cha.filing_data.submit` | Server-side external submission when configured |
| `cha.icegate.configure` | Manage server-only ICEGATE configuration |
| `cha.icegate.operate` | Trigger configured ICEGATE operations |
| `cha.icegate.audit` | View non-confidential external operation audit |

Every read/write must check `orgId` from session server-side and enforce assignment/view-all access where job-scoped.

## 10. ICEGATE Capability and Configuration Matrix

Current repository has no production ICEGATE client, credentials, endpoint config, signing integration, CACHI01/CACHE01/eSanchit implementation, or official message schema. Current ICEGATE references are limited to the isolated lab labels and safety text.

Environment variable names found:

- No existing `ICEGATE_*`, `ESANCHIT_*`, `CACHI01_*`, or `CACHE01_*` variables.
- Existing relevant non-ICEGATE names include `CHA_JOB_REPORT_AI_MODEL`, Google Workspace/Chat variables, and customer portal upload variables. Values were not inspected or printed.

| Requested function | Existing code | Officially documented endpoint/message | Credentials required | Safe implementation phase | Manual fallback |
| --- | --- | --- | --- | --- | --- |
| Master data lookup/import | No production customs master engine | Not present in repo | None for manual upload; external source contract if automated | Phase 1/2 | Admin CSV/XLSX upload/download |
| IGM fetch | No ICEGATE client; existing manual IGM field on `ChaJobAdditionalData` | Not verified | Unknown subscription/credential | Do not implement until contract supplied | Manual IGM entry |
| BE/SB data capture | Existing `ChaFiling` summary fields only | Not applicable | None | Phase 3/4 | Manual form and job audit |
| Checklist/PDF generation | Existing checklist files and lab summary only | Not applicable | None | Phase 5 | Manual checklist file upload |
| Flat-file generation | Lab deterministic test serializer only | Message format not verified | None for test artifact | Phase 5 as test/manual export; production only after contract | Download test/manual flat file |
| Digital signing | No implementation | Not verified | Certificate/token/tooling unknown | Later phase only | Manual signing outside system |
| ICEGATE submission | No implementation | Not verified | ICEGATE enabled subscription, server credentials, certificate/token | Later phase after official contract | Manual ICEGATE portal submission |
| Acknowledgements/query polling | No implementation | Not verified | Same as above | Later phase after official contract | Manual status update and upload acknowledgement |
| eSanchit upload | No implementation | Not verified | Same as above | Later phase after official contract | Manual document upload and evidence attachment |

Security requirements:

- ICEGATE calls must be server-only.
- Store credentials encrypted or reference external secret manager; never expose raw credentials, certificates, tokens, payloads, or confidential responses to browser JS, logs, URLs, analytics, or toasts.
- Unsupported operations return typed `NOT_CONFIGURED` / `NOT_SUPPORTED` states.

## 11. Migration and Backfill Strategy

1. Create additive Prisma migrations only.
2. Start with master source/version tables and one representative master, then expand using the shared engine.
3. Backfill no existing jobs in Phase 1 unless required; when needed, populate filing summaries from current `ChaFiling` and `ChaJobAdditionalData` without overwriting.
4. Preserve `ChaJob` numbering and branch rules.
5. For existing `ChaFiling.billOfEntryNumber` / `shippingBillNumber`, create read compatibility into new filing data and keep existing columns as denormalized search/summary fields.
6. Create immutable master snapshots when a filing row is saved/locked/generated, not merely when displayed.
7. Rehearse migrations with `npm run staging:db:setup/start`, `npm run staging:db:migrate`, seed fixtures, and compatibility reads.
8. Never use production `db push`, reset, truncate, or destructive migration commands.

## 12. Feature-Flag Strategy

Suggested flags:

| Flag | Default | Purpose |
| --- | --- | --- |
| `chaCustomsMastersEnabled` | off | Enables master routes/navigation |
| `chaCustomsFilingDataEnabled` | off | Enables job workspace Customs Filing Data tab |
| `chaImportBeWorkspaceEnabled` | off | Enables import subtabs |
| `chaExportSbWorkspaceEnabled` | off | Enables export subtabs |
| `chaFlatFileGenerationEnabled` | off | Enables local/manual flat-file artifact generation |
| `chaIcegateIntegrationEnabled` | off | Enables server-only configured external operations |

Storage options:

- Use org-scoped settings in `ChaSettings` or a new typed `ChaFeatureFlag` table.
- Keep manual operation available even when external integration flags are off.

## 13. Testing Matrix

| Area | Tests |
| --- | --- |
| Master engine | Unit tests for schema parsing, filtering, pagination, activation, audit, version snapshots |
| Bulk import/download | CSV/XLSX import validation, partial failure reports, formula injection protection, row caps |
| Permissions | Read/manage/import/export forbidden and allowed tests, cross-org probes |
| Filing data | Import/export draft save, row CRUD, validation, lock/unlock, summary denormalization |
| Snapshot accuracy | Master update after filing does not mutate historical filing snapshot |
| Existing workflow regression | Current documents, additional data, checklist, filing, expenses, deletion approvals, customer portal tests unchanged |
| Flat-file generation | Deterministic output, test watermark, checksum, no production submission side effect |
| ICEGATE shell | `NOT_CONFIGURED` and `NOT_SUPPORTED` state tests; no secrets in client payloads/loggable responses |
| UI | Static verifier for route imports/components/tokens, responsive Playwright once browser is available |
| Build gates | Targeted ESLint, `npx tsc --noEmit`, focused Vitest, production build with required Node heap |

## 14. Risks and Explicit Non-goals

Risks:

- Official ICEGATE contracts, credentials, signing flow, and enabled subscription details are not present.
- Master datasets may be very large; server-side pagination, indexes, and import batching are required from the start.
- Screenshots use a dense legacy product style; copying that style would violate the Monolith design-system rules.
- Existing CHA job workspace is very large; Phase 3 should extract shared job filing components before adding complexity.
- Dirty worktree exists from prior URL-only lab/docs work; avoid mixing that into production customs filing implementation unintentionally.

Non-goals for Phase 0:

- No schema migration.
- No production route.
- No ICEGATE endpoint implementation.
- No sidebar/navigation changes.
- No changes inside `_design-reference` or `OLD UI code`.
- No production submission/signing/eSanchit operation without verified official contract.

## 15. Phase-by-phase File Impact Forecast

| Phase | Expected file impact | Completion gate |
| --- | --- | --- |
| Phase 0 | `cha-customs-screens-plan.md` only | Planning doc created; no runtime changes |
| Phase 1 - master engine foundation | Add `src/modules/cha/customs-masters/*`, shared master components, Prisma additive migration, seed permissions | One/two master types live behind flag; lint/type/tests/build pass |
| Phase 2 - all master pages | Add typed master definitions/routes/import/download/audit for all screenshot masters | Shared engine covers all masters; upload/download/filter/pagination/audit pass |
| Phase 3 - job filing data shell | Add `src/modules/cha/customs-filing/*`, attach `Customs Filing Data` tab to existing `ChaJob` workspace behind flag | Existing job workflow unaffected; save/load draft filing data |
| Phase 4 - import BE workspace | Add import header, IGM, invoice, item, declaration, supporting docs subtabs | Import validation/snapshots pass; no ICEGATE side effects |
| Phase 5 - export SB workspace | Add export header, invoice, item, supporting docs, checklist, flat-file views | Export validation/snapshots pass; manual artifacts only |
| Phase 6 - artifact generation | Add checklist/PDF/flat-file generation, immutable artifacts, checksums | Generated output deterministic, test/manual mode explicit |
| Phase 7 - ICEGATE integration shell | Add server-only config/client abstraction and typed unsupported/configured states | No secrets leak; unsupported returns typed states |
| Phase 8 - verified external operations | Implement only contracted endpoints/messages after official documentation and subscription confirmation | Contract tests/staging rehearsal/manual fallback pass |

## Inspected Files and Sources

Primary files/directories inspected:

- `AGENTS.md`
- `docs/full-ui-migration-prompt.md`
- `docs/ui-migration-status.md`
- `docs/ui-migration-handoff.md`
- `docs/cha-module.md`
- `docs/cha-production-readiness.md`
- `_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies/app/globals.css` as read-only
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma.config.ts`
- `scripts/run-with-staging-env.ts`
- `src/lib/navigation.ts`
- `src/components/monolith/index.ts`
- `src/components/monolith/workspace.tsx`
- `src/components/monolith/workspace-data-table.tsx`
- `src/components/monolith/cha-workspace.tsx`
- `src/app/(dashboard)/cha/**`
- `src/modules/cha/actions.ts`
- `src/modules/cha/service.ts`
- `src/modules/cha/jobs/queries.ts`
- `src/modules/cha/dashboard/queries.ts`
- `src/modules/cha/warnings/queries.ts`
- `src/modules/cha/labs/import-job-creation/**`

Missing/renamed expected doc:

- `docs/monolith-design-system-reference.md` was referenced by the outer AGENTS instructions but does not exist on this cleaned-up branch. The current authoritative equivalents inspected were `docs/full-ui-migration-prompt.md`, `docs/ui-migration-status.md`, `docs/ui-migration-handoff.md`, production `src/components/monolith`, `/admin/design-system` source, and the read-only design reference directory.

Current dirty working tree at Phase 0 start:

- Modified from prior work: `docs/ui-migration-handoff.md`, `docs/ui-migration-status.md`.
- Untracked from prior work: `src/app/(dashboard)/cha/labs/`, `src/modules/cha/labs/`.
- New Phase 0 file: `cha-customs-screens-plan.md`.

## Phase 9 Implementation Notes - 2026-07-31

Actual job entry routes:

- Import saved view: `/cha/jobs/import`
- Export saved view: `/cha/jobs/export`
- New import job entry: `/cha/jobs?new=true&customsDirection=IMPORT`
- New export job entry: `/cha/jobs?new=true&customsDirection=EXPORT`
- Job workspace shell: `/cha/jobs/[jobId]?tab=customsFiling&customsSubtab=...`

The saved views reuse the standard CHA job query with an additive
`movementDirection` filter. Customs profile/list fields are loaded for the
visible job page only via one `ChaCustomsFilingProfile.findMany` query bounded
by `jobId in (...)`; no second job table, second numbering flow, or copied job
query was introduced.

The existing create-job dialog and `chaService.createJob` remain authoritative.
When `customsDirection` is present, the action validates the matching feature
flag, `cha.customs.filing.edit_draft`, and the selected job type movement
before creating the standard `ChaJob`; it then creates the customs filing
profile through an idempotent follow-up and redirects to the existing job
workspace with `Customs Filing Data` selected.

The workspace now has a gated top-level `Customs Filing Data` tab. Import
subtabs are `be-main`, `igm`, `invoice`, `item-details`, `declaration`,
`supporting-documents`, `checklist`, and `flat-file`. Export subtabs are
`sb-main`, `invoice-details`, `item-details`, `supporting-documents`,
`checklist`, and `flat-file`. The tab shell shows profile status, draft version,
concurrency version, completeness badges, permission/disabled states, and does
not query unopened detailed form data in this phase.

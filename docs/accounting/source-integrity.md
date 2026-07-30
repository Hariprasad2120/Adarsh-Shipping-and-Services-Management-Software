# Phase 0 Source Integrity and Readability Gate

Date: 2026-07-29
Scope: readability and integrity only; no source file was edited.

## Mandatory readability table

| File | Exists | Opened | Read completely | First substantive heading | Final substantive heading | Problems |
|---|---:|---:|---:|---|---|---|
| `docs/accounting/sources/Accounting_Software_Build_Specification.md` | Yes | Yes | Yes | `ACCOUNTING SOFTWARE — FUNCTIONAL & DATA-FLOW BUILD SPECIFICATION` | `G.5 Document Index Summary` | Complete and readable. Appendix E contains an internally inconsistent worked-example arithmetic result; see `DEC-0001`. |
| `docs/accounting/sources/Zoho Books Workings.md` | Yes | Yes | Yes | `Zoho Books Software Process and Workflow**` | `24. Ledger Statement` | Complete and readable. The title has an unmatched trailing `**`, several headings are bold text rather than Markdown headings, wording/typographical defects exist, and `Ledger Statement` is duplicated as reports 15 and 24; see `DEC-0002`. |
| `Monolith_Accounting_Codex_Implementation_Plan.md` | Yes | Yes | Yes | `Monolith Accounting Module — Codex Step-by-Step Implementation Plan` | `12. Recommended first action` | Complete and readable; no truncation observed. |
| `Monolith_Accounting_Full_Implementation_Guide.md` | Yes | Yes | Yes | `Monolith Accounting — Full Step-by-Step Codex Implementation Guide` | `15. First action` | Complete and readable; no truncation observed. |

## Per-file evidence

| Repository-relative path | Bytes | Physical lines | SHA-256 | Complete text accessible | Tables/lists/workflows readable | Truncated, malformed, or missing |
|---|---:|---:|---|---|---|---|
| `docs/accounting/sources/Accounting_Software_Build_Specification.md` | 331,389 | 2,808 | `BEEFE63745F753BC2664903B5113F23D89A67CC2B9F07F350FC8CC09BAD9D28A` | Yes | Yes; all parts, tables, posting examples, appendices A–G, and endpoint index were accessible | Not truncated. Appendix E arithmetic is inconsistent, but the text itself is present. |
| `docs/accounting/sources/Zoho Books Workings.md` | 39,961 | 579 | `CB7B078F232B7CFD36144CF43443B61974043F52257BD728FC65DF4C9BFE2080` | Yes | Yes; all operational workflows, field lists, defaults, and 24 numbered report entries were accessible | Not truncated. Markdown/title artefacts and duplicate report naming are present. |
| `Monolith_Accounting_Codex_Implementation_Plan.md` | 56,967 | 1,153 | `C3958609C47EE0421E8FB6AF0954549752106C52589281791658906CC148EC23` | Yes | Yes | No |
| `Monolith_Accounting_Full_Implementation_Guide.md` | 33,695 | 681 | `C76D90C1F67C5E84D0D3C5A9C8753493C512285313AEBE1D27EA67AB6237E839` | Yes | Yes | No |

## Appendix E independent recomputation

The transactions and journals listed in source lines 2531–2633 imply:

- bank balance: 10,150, not 9,650;
- trial-balance debits and credits: 12,290 each;
- net profit: 440;
- total assets: 10,440 after including receivables, inventory, and accumulated depreciation.

The source's stated 9,940 balance-sheet total follows the understated bank balance. The source has not been changed. No test oracle may use the published Appendix E totals until Finance resolves `DEC-0001`.

## Other instructions read

- `AGENTS.md` at repository root (applies).
- `Adarsh-Shipping-and-Services-Management-Software/AGENTS.md` in a nested duplicate-looking tree (does not govern the current root unless work later enters that subtree).
- Relevant repository documentation read completely: `README.md`, `docs/product-catalogue.generated.md`, `docs/cha-module.md`, `docs/cha-production-readiness.md`, `docs/session-security.md`, and `mobile/sales-crm-android/README.md`.

The root UI-migration documents were not required because Phase 0 makes no UI or product-code changes.

# India Statutory Leave — Compliance Templates Research

**Purpose:** Reference dataset to seed `LeaveComplianceTemplate` rows (see
`prisma/schema.prisma` and `docs/leave-management/ARCHITECTURE.md` §9,
Phase 10 "Compliance packs", and master spec §27 "Regulatory / Compliance
Framework").

**⚠️ NOT LEGAL ADVICE.** Every row below is a *statutory minimum as stated
in a publicly available secondary or primary source*, not a certified legal
opinion. Every entry MUST be reviewed and sign-off given by qualified legal
counsel before being marked `PUBLISHED` in the `LeaveComplianceTemplate`
table. Until reviewed, seed rows should be created with
`status = "DRAFT"`, never `"VERIFIED"` or `"PUBLISHED"` — those status
transitions belong to counsel/compliance, not to this research pass.

Access date for all sources below: **2026-08-14**.

## Why these jurisdictions

`prisma/seed.ts` sets `legalJurisdiction: "Chennai, Tamil Nadu"` for the
org record, and seed data references a Mumbai-based staff email
(`ravi.mumbai@adarshshipping.in`), consistent with a shipping/logistics
company operating out of major port cities. Shops & Establishments Acts
are state legislation, so this research covers **Tamil Nadu** (registered
jurisdiction) and **Maharashtra** (Mumbai/Nhava Sheva port operations are
a near-certainty for a shipping company), plus **Gujarat** (Kandla/Mundra
ports) and **Delhi** (common HQ/liaison-office state for logistics firms)
as the other major states named in the task brief. This is an inference
from available code, not a confirmed branch list — HR/legal should confirm
actual branch office states before finalizing which state templates to
publish.

---

## 1. Maternity Benefit Act, 1961 (as amended by the Maternity Benefit
   (Amendment) Act, 2017) — Central, applies to all states

| Field | Value |
|---|---|
| statutory_name | Maternity Benefit Act, 1961 (as amended 2017) |
| jurisdiction | Country: India; State: N/A (central act) |
| leave_category | Maternity Leave |
| entitlement | 26 weeks paid leave for women with fewer than two surviving children; 12 weeks for the third child onward; not more than 8 weeks may be taken before the expected delivery date. Commissioning/adopting mothers (adoption of a child under 3 months) get 12 weeks from the date the child is handed over. |
| eligibility | Must have actually worked not less than 80 days in the 12 months immediately preceding the expected delivery date (Section 5(2)). |
| medical_bonus | ₹1,000 statutory medical bonus (Section 8) where employer does not provide free pre/post-natal care — commonly cited as revised upward by later central notification; **exact current amount unverified from a .gov.in source in this pass, flag for legal review**. |
| creche_requirement | Establishments with 50 or more employees must provide a crèche facility within a prescribed distance; the woman is entitled to 4 visits a day to the crèche (Section 11A, inserted by the 2017 amendment). |
| nursing_breaks | Nursing breaks provision exists under Section 11 (two breaks of prescribed duration until the child turns 15 months) — general provision confirmed, exact wording not re-verified against primary text in this pass. |
| effective_from | 1961-12-12 (original act); amendment provisions operative 2017-04-01 |
| legal_source | Maternity Benefit Act, 1961, Sections 5, 5(2), 8, 11, 11A |
| source_url | https://www.indiacode.nic.in/bitstream/123456789/9324/1/the_maternity_benefit_act_1961.pdf (India Code bare act PDF; primary source could not be fetched directly by this research tool due to a 403 response, but is the authoritative citation — HR/legal should download and diff against the summary below); corroborating: https://blog.ipleaders.in/the-maternity-benefit-act/, https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1898874&reg=48&lang=2 |
| access_date | 2026-08-14 |
| verification_status | **Duration (26/12 weeks), 8-week pre-delivery cap, and 80-day eligibility: solidly corroborated** across India Code bare-act text (as quoted in search excerpts), PIB press release, and multiple legal-reference sites — low risk. **Medical bonus exact current ₹ amount and full nursing-break clause text: unverified — requires legal review** against the current bare act / latest central notification, since bonus amounts are periodically revised by notification rather than the act's original text. |

---

## 2. Paternity Leave — Central Government employees only; **no central
   statutory minimum for private-sector employees**

| Field | Value |
|---|---|
| statutory_name | Central Civil Services (Leave) Rules, 1972 — Rule 551(A) (Paternity Leave) |
| jurisdiction | Country: India; State: N/A; **applies only to Central Government servants**, not private-sector employees |
| leave_category | Paternity Leave |
| entitlement | 15 days, for a male government servant with fewer than two surviving children, available from 15 days before to 6 months after the wife's confinement; same 15 days on valid adoption of a child under 1 year, within 6 months of adoption. Paid at full pay; not debited against the general leave account. |
| eligibility | Central Government employee only |
| effective_from | Rule in force under CCS (Leave) Rules, 1972 (dated 1972, Rule 551A inserted later) — precise insertion date not independently re-verified in this pass |
| legal_source | CCS (Leave) Rules, 1972, Rule 551(A) |
| source_url | https://www.gconnect.in/orders-in-brief/leave-ltc/central-civil-services-leave-rules-1972-updated-as-on-24-09-2024.html ; https://www.referencer.in/CS_Regulations/CCS_Leave_Rules_1972/Chapter_05.aspx |
| access_date | 2026-08-14 |
| verification_status | **Important finding, recorded as-is per task instructions: there is NO central statutory paternity leave law covering private-sector employees in India.** Adarsh Shipping & Services, as a private company, has **no statutory paternity leave obligation** under central law. Any paternity leave the company offers is a discretionary/company-policy benefit, not a compliance floor. This entry should be seeded into `LeaveComplianceTemplate` as an explicit "no statutory minimum — private sector" record (e.g. `statutoryMinimum: { amount: 0, unit: "days", note: "no central statutory minimum for private sector; policy-only benefit" }`) so the compliance-template UI doesn't silently omit paternity leave and doesn't invent a number either. The CCS Rule itself is **solidly verified** as applying to central govt staff only — the "no private-sector law" conclusion is corroborated by every source consulted and is the well-established consensus position (not itself something requiring "unverified" flagging), but should still get a legal-review pass before publishing since labour codes are an active legislative area. |

---

## 3. Shops and Establishments Acts (state-specific)

### 3a. Tamil Nadu Shops and Establishments Act, 1947

| Field | Value |
|---|---|
| jurisdiction | Country: India; State: Tamil Nadu |
| establishment_type | Shops and commercial establishments |
| earned_leave | 1 day for every 20 days worked, after 12 months of continuous service (12 days/year at full attendance); accumulation up to 45 days |
| casual_leave | Up to 12 days/year, on any reasonable ground |
| sick_leave | Up to 12 days/year, for sickness or accident |
| continuity_rule | Service is deemed continuous through interruptions from sickness/accident/authorised leave up to 90 days aggregate, or a legal strike, or involuntary unemployment up to 30 days aggregate |
| effective_from | 1947 (act); leave provisions per Section 25 |
| legal_source | Tamil Nadu Shops and Establishments Act, 1947, Section 25 |
| source_url | https://www.indiacode.nic.in/bitstream/123456789/13171/1/tn-shops-and-establishments-act_1947.pdf (India Code bare act); corroborating: https://indiankanoon.org/doc/64000295/, https://corridalegal.com/the-tamil-nadu-shops-and-establishments-act-1947-executive-summary-and-bare-act/ |
| access_date | 2026-08-14 |
| verification_status | **Solidly verified** — the 12+12 days casual/sick, 1-day-per-20-worked earned leave, and 45-day accumulation cap are consistent across the India Code bare-act citation and two independent legal-reference summaries. Recommend a final read of the indiacode.nic.in PDF directly (this tool received a 403 fetching it live; text above is reconstructed from search-engine excerpts of that same PDF) before publishing. |

### 3b. Maharashtra Shops and Establishments (Regulation of Employment and
   Conditions of Service) Act, 2017

| Field | Value |
|---|---|
| jurisdiction | Country: India; State: Maharashtra |
| establishment_type | Shops and commercial establishments |
| casual_leave | 8 days/year, credited quarterly, lapses if unused at year end |
| earned_leave | Two overlapping formulas appear in the Act/commentary: (a) 1 day per 20 days worked for workers with 240+ days worked in the calendar year, and (b) up to 5 days per 60 days worked for workers employed 3+ months. Accumulation capped at 45 days; excess may be encashed if the employer refuses leave on a worker's 15-day-advance application after 240+ days worked. |
| sick_leave | No distinct statutory sick-leave provision found under this Act (sickness is generally covered via casual leave in practice) — **flag for legal review**, since this differs from Tamil Nadu/Gujarat which have explicit sick-leave clauses. |
| effective_from | 2017 (Act LXI of 2017) |
| legal_source | Maharashtra Shops and Establishments (Regulation of Employment and Conditions of Service) Act, 2017, Section 18 |
| source_url | https://www.indiacode.nic.in/bitstream/123456789/19710/1/shops_and_establishments.pdf (India Code bare act); corroborating: https://indiankanoon.org/doc/58904765/, https://blog.ipleaders.in/need-know-provisions-relating-working-hours-overtime-leaves-maharashtra-shops-establishment-act-2017/ |
| access_date | 2026-08-14 |
| verification_status | **Casual leave (8 days) and the 45-day accumulation cap: solidly verified**, consistent across three sources. **The dual earned-leave formula (1/20 vs 5/60) is verified as present in the Act but its precise interaction/precedence is not fully resolved from secondary sources — requires legal review** to confirm which formula is authoritative or whether they apply to different worker categories. **No sick-leave line item found — requires legal review** to confirm whether this is a genuine gap in the Act or a naming difference (e.g., folded into casual leave) before seeding a "0 days" template. |

### 3c. Gujarat Shops and Establishments (Regulation of Employment and
   Conditions of Service) Act, 2019

| Field | Value |
|---|---|
| jurisdiction | Country: India; State: Gujarat |
| establishment_type | Shops and commercial establishments |
| earned_leave | 1 day for every 20 days worked, for workers with 240+ days worked in the calendar year; accumulation up to 63 days |
| casual_leave | 7 days/year, credited at start of year, lapses if unused |
| sick_leave | 7 days/year (leave "on medical grounds"), credited at start of year, lapses if unused |
| wage_during_leave | Daily average wage over the preceding 3 months worked (excludes overtime) |
| effective_from | 2019 (Act supersedes the earlier 1948 Bombay-era Gujarat Act) |
| legal_source | Gujarat Shops and Establishments (Regulation of Employment and Conditions of Service) Act, 2019, Section 18 |
| source_url | India Code listing: https://www.indiacode.nic.in/handle/123456789/19334 and https://www.indiacode.nic.in/handle/123456789/15202; corroborating: https://indiankanoon.org/doc/108676263/, independently corroborated twice via search (consistent figures both times) |
| access_date | 2026-08-14 |
| verification_status | **Solidly verified** — 7 days casual, 7 days sick, 1-day-per-20-worked earned leave with a 63-day cap were returned identically across two independent search passes and multiple legal-reference sites. Recommend confirming against the India Code PDF directly before publishing (not independently re-fetched by this tool). |

### 3d. Delhi Shops and Establishments Act, 1954

| Field | Value |
|---|---|
| jurisdiction | Country: India; State: Delhi (NCT) |
| establishment_type | Shops and commercial establishments |
| earned_leave | "Privilege leave": not less than 15 days after every 12 months' continuous employment (pro-rated at not less than 5 days per completed 4-month period); accumulation capped at 3x the annual entitlement (i.e., up to 45 days). Watchmen/caretakers get a minimum of 30 days/year. |
| casual_sick_leave | Combined "sickness or casual leave": not less than 12 days/year, accruing at not less than 1 day per completed month of continuous service. Does not carry forward across years. Casual leave capped at 3 continuous days per instance except once; sick leave beyond 3 days requires a medical certificate and a fitness-to-resume certificate. |
| wage_during_leave | Daily average wage over the preceding 3 months actually worked (excludes overtime, includes DA) |
| legal_source | Delhi Shops and Establishments Act, 1954, Sections 22 and 23 |
| source_url | https://labour.delhi.gov.in/labour/delhi-shops-act-1954 (Delhi Labour Department, official .gov.in page — fetched directly and successfully in this research pass); corroborating: https://indiankanoon.org/doc/20103116/ |
| access_date | 2026-08-14 |
| verification_status | **Solidly verified** — this is the one jurisdiction where the official .gov.in page (labour.delhi.gov.in) was fetched directly and returned Section 22/23 text matching the search-engine summaries exactly. Highest-confidence entry in this document. |

---

## 4. National / Festival Holidays

| Field | Value |
|---|---|
| statutory_name | Tamil Nadu Industrial Establishments (National, Festival and Special Holidays) Act, 1958 (representative state example — most states have an analogous act, not a single central law) |
| jurisdiction | Country: India; State: Tamil Nadu (other states have their own versions, e.g. Kerala Industrial Establishments (National and Festival Holidays) Act, 1958) |
| entitlement | 4 fixed national/state holidays — 26 January (Republic Day), 1 May (May Day), 15 August (Independence Day), 2 October (Gandhi Jayanti) — plus 5 additional festival holidays selected by the Inspector in consultation with employer and employees, for a total of at least 10 paid whole-day holidays/year. |
| legal_source | Tamil Nadu Industrial Establishments (National, Festival and Special Holidays) Act, 1958 |
| source_url | https://labour.tn.gov.in/pdf/archives/NATIONAL-FESTIVAL-AND-SPECIAL-HOLIDAYS-ACT-1958.pdf (official Tamil Nadu Labour Department PDF — located but this tool could not parse the binary/text-extraction of the PDF; figures below are reconstructed from search-engine excerpts of the same document plus corroborating summaries, not independently re-verified against parsed primary text); corroborating: https://indiankanoon.org/doc/83688640/, https://www.indiacode.nic.in/bitstream/123456789/13151/1/tnie_national-festival-and-special-holidays-act_1958.pdf |
| access_date | 2026-08-14 |
| verification_status | **Broadly verified** (4 national + 5 festival = ~10 holidays is consistent across sources) but **the underlying primary PDF could not be machine-parsed in this pass — mark "unverified — requires legal review" before treating the exact day count as final**, and note explicitly that this is NOT a single central act — Maharashtra, Gujarat, and Delhi each have their own separate state legislation/notifications for national and festival holidays that were **not individually researched in this pass** and should be added as separate template rows before go-live if those states are confirmed as actual branch locations. |

---

## 5. Factories Act, 1948 — Section 79, Annual Leave with Wages

| Field | Value |
|---|---|
| statutory_name | Factories Act, 1948 |
| jurisdiction | Country: India (central act; applies where a warehouse/facility is registered as a "factory" under the Act's definition — relevant only if Adarsh Shipping operates a factory-registered warehouse, not typical office/CFS operations) |
| leave_category | Annual Leave with Wages |
| entitlement | Adult workers: 1 day of leave for every 20 days worked in the preceding calendar year. Child workers (15–18 yrs, where applicable): 1 day for every 15 days worked. Leave taken in the subsequent calendar year. |
| eligibility | Worked 240 days or more in the factory during the calendar year |
| encashment | On discharge, dismissal, resignation, superannuation, or death in service, the worker (or heir/nominee) is entitled to wages in lieu of unavailed accrued leave. |
| legal_source | Factories Act, 1948, Section 79 |
| source_url | https://www.indiacode.nic.in/show-data?actid=AC_CEN_6_6_000010_194863_1517807319577&sectionId=9386&sectionno=79&orderno=92 (India Code, primary source — 403 on direct fetch by this tool, text reconstructed from search-engine excerpt of the same page); corroborating: https://indiankanoon.org/doc/982016/, https://www.legalserviceindia.com/legal/article-11871-annual-leave-with-wages-section-79-factory-act-1948.html |
| access_date | 2026-08-14 |
| verification_status | **Solidly verified** — the 240-day threshold, 1-day-per-20 (adult) / 1-day-per-15 (child) formula, and encashment-on-separation clause are consistent across the India Code excerpt and two independent legal reference sites. **Applicability to Adarsh Shipping is conditional** — only relevant if any branch/warehouse is registered as a "factory" under the Act; this should be confirmed operationally (not a legal-text question) before seeding as an active template rather than a reference-only entry. |

---

## Summary: seeding recommendation

Recommend seeding **8 distinct `LeaveComplianceTemplate` entries**, all at
`status = "DRAFT"` pending legal review:

1. Central — Maternity Benefit Act, 1961 (as amended 2017) — maternity leave
2. Central — Paternity leave "no statutory minimum, private sector" marker record
3. Tamil Nadu — Shops & Establishments Act, 1947 — earned/casual/sick leave
4. Maharashtra — Shops & Establishments Act, 2017 — earned/casual leave (sick leave gap flagged)
5. Gujarat — Shops & Establishments Act, 2019 — earned/casual/sick leave
6. Delhi — Shops & Establishments Act, 1954 — privilege/casual-sick leave
7. Tamil Nadu — National, Festival and Special Holidays Act, 1958 — public holidays
8. Central — Factories Act, 1948, Section 79 — annual leave with wages (conditional on factory registration)

### Solidly verified (high confidence, low legal-review burden)
- Delhi S&E Act leave entitlements (only entry fetched directly from an
  official .gov.in page)
- Maternity Benefit Act core duration/eligibility figures (26/12 weeks, 8-week
  cap, 80-day eligibility)
- Gujarat S&E Act leave entitlements (7/7/1-per-20/63-day cap)
- Tamil Nadu S&E Act leave entitlements (12/12/1-per-20/45-day cap)
- Factories Act Section 79 formula and encashment rule
- The "no central paternity leave law for private sector" finding itself

### Needs follow-up legal review before publishing
- Maternity Benefit Act medical bonus exact current ₹ amount (likely revised
  by notification since the original ₹1,000 figure) and full nursing-break
  clause text
- Maharashtra sick-leave provision (apparent gap — confirm real vs. naming
  artifact) and the two overlapping earned-leave formulas' precedence
- Tamil Nadu National/Festival Holidays Act exact day count (primary PDF
  not machine-parseable in this pass) and equivalent acts for Maharashtra,
  Gujarat, and Delhi (not researched — no PDF/page was located and verified
  for those three states in this pass)
- Factories Act applicability trigger (whether any Adarsh Shipping facility
  is factory-registered) — an operational fact, not a legal-text question,
  but gates whether entry 8 should be active
- Confirm actual Adarsh Shipping branch states (Tamil Nadu is confirmed via
  `prisma/seed.ts`'s `legalJurisdiction` field; Maharashtra, Gujarat, and
  Delhi are inferred from industry context and a single Mumbai staff email,
  not confirmed against an authoritative branch/address list)

**All entries require a licensed labour-law counsel review and explicit
sign-off before any `LeaveComplianceTemplate` row is promoted from `DRAFT`
to `VERIFIED` or `PUBLISHED` status**, per spec §27.

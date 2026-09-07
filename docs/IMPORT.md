# Importing the Astonic / TSHCL workbook

The live database holds **real** Indiramma Indlu data for Astonic Construction
(TSHCL, managed by EESHA INFRA), loaded from
`ASTONIC_CONSTRUCTION_TSHCL_REPORT ...xlsx`.

## Re-run the import (refresh with a newer workbook)

1. Put the new workbook at `data/astonic-report.xlsx` (this folder is gitignored —
   it contains Aadhaar / bank / card numbers).
2. Dry run — parses and reports, writes nothing:
   ```bash
   npx tsx scripts/import-astonic.ts --dry-run
   ```
   Check the district list, stage counts and totals look right.
3. Real run — **wipes all operational data** (beneficiaries, houses, stages,
   cards, payments, cash, contractors, districts…; user logins are kept) and
   reloads from the workbook:
   ```bash
   npx tsx scripts/import-astonic.ts
   ```
   `DATABASE_URL` in `.env` decides which database it hits (currently the Atlas
   cluster used by both local dev and the Vercel deployment). ~90 s against Atlas.
4. If the schema changed, sync indexes afterwards:
   ```bash
   npx prisma db push
   ```

## What maps where

| Workbook sheet | → Database |
|---|---|
| `Mapped_List` | `Beneficiary` + `House` + `District` / `Mandal` / `Village` |
| `Inventory - Summary` | `HouseStageProgress` (per stage: approval chain PS→AE→PD→Collector→EE→CE→MD, labour contractor, supervisor, bill / received / payment mode) + `BeneficiaryPayment` |
| `CMS_Report` | `BeneficiaryCard` (linked to beneficiary by Application ID) |
| `Cash_Transcation_Details` | `CashCollection` |
| derived | one `Astonic Construction` contractor, one project + one `GovernmentFund` per district, `LabourContractor` + `Supervisor` masters |

Stages: **Auger → BL → RL → RC → COMP** (`src/lib/constants.ts` `CONSTRUCTION_STAGES`).
Aadhaar is stored as last-4 + salted hash only; card / account numbers are masked
except for roles with `sensitive:view`.

Normalisation on import: district / name casing is fixed (`HAnumakonda` →
`Hanumakonda`, `Warangal Urban` → `Hanumakonda`, `Warangal Rural` → `Warangal`),
labour-contractor names de-duplicated (`RAja Sekhar` / `Raja sekhar` → `Raja Sekhar`).

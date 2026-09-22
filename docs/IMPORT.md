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

## Expenses — "EESHA Telangana Astonic Payment Summary" workbook

```bash
cp "<downloaded workbook>.xlsx" data/payment-summary.xlsx
npx tsx scripts/import-expenses.ts --dry-run   # totals, category split, unmatched places
npx tsx scripts/import-expenses.ts             # replaces every PAY-/EXP- expense
```

| Sheet | → `Expense` |
|---|---|
| `PAYMENTS SUMMARY` | `PAY-<Sno>` — vendor payments (vendor, Chq./Ref.No., purpose → category, place → district/mandal), mode Bank Transfer / PhonePe |
| `Prasad Expenses` | `EXP-<Sno>` — site expenses (Payment By → Paid By, Code → category, DIST/Mandal matched to masters), mode Site Cash |

All rows are imported as `PAID`. Spelling variants of the sheet "Code" are folded into
~35 categories (`CATEGORY_ALIASES` in the script; the original code is kept in remarks).
Date ranges like `12/01/2026-22/01/2026` use the first date. `AAC BLOCKS` and
`MATERIAL INVENTORY` are purchase registers behind the vendor payments and are not
imported (would double-count); `Sheet1-5` are scratch/pivots. Expenses entered in the
app via **New Expense** get `EXM-xxxx` codes and are untouched by a re-run.

**Heads-up:** a re-run rebuilds every `PAY-`/`EXP-` row from the workbook, so edits and
deletes made on the Expenses page to those rows are lost — make corrections in the
workbook too (the audit log keeps every in-app edit/delete with old values).

# Indiramma Illu Management Tool

Government housing **beneficiary, construction & project management platform**.
Client: **EESHA INFRA GLOBAL PRIVATE LIMITED**.

Enterprise Government-ERP style: executive command dashboard, interactive Telangana
district map, State → District → Mandal → Village → Project → Beneficiary → House
drill-down, stage-wise construction monitoring, contractors / supervisors / labour,
inventory, expenses, government funds, beneficiary payments, quality, issues,
approvals, audit trail and role-based access.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, full-stack) + React 19 + TypeScript |
| UI | Tailwind CSS, shadcn-style components, Radix primitives, Recharts, d3-geo map |
| Data / query | TanStack Query, React Hook Form, Zod |
| Database | MongoDB (replica set) via Prisma ORM |
| Auth | JWT access + rotating refresh tokens (httpOnly cookies), bcrypt, RBAC |

## Requirements

- Node.js 20+ (tested on 24)
- No external database needed for local dev — `npm run dev` boots an in-memory
  MongoDB **replica set** automatically (`scripts/mongo-dev.mjs`, data persisted
  under `node_modules/.cache/indiramma-mongo/`). For production set `DATABASE_URL`
  to a real MongoDB / Atlas cluster — see `DEPLOYMENT.md`.

## Getting started

```bash
npm install
cp .env.example .env          # already present with dev defaults
npm run dev                   # starts MongoDB + Next.js together (port 3000)
```

In a **second terminal** (first run only — while `npm run dev` keeps the DB up):

```bash
npm run setup                 # prisma db push + seed demo data
```

Open http://localhost:3000 and sign in.

### Demo accounts (password: `password123`)

| Employee ID | Role |
|---|---|
| `ADMIN001` | Super Admin |
| `DM-RANGA` | District Manager (Rangareddy) |
| `PM-001` | Project Manager |
| `ENG-014` | Site Engineer / Supervisor |
| `CON-007` | Builder / Contractor |
| `ACC-002` | Accounts / Finance |

Public registration is disabled — users are provisioned by administrators.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | MongoDB (in-memory RS) + Next dev server |
| `npm run dev:web` | Next dev server only (bring your own MongoDB) |
| `npm run db:local` | Just the local MongoDB replica set |
| `npm run setup` | `prisma db push` + seed |
| `npm run seed` | Re-seed demo data (clears + repopulates) |
| `npm run build` / `npm start` | Production build / serve |

> **Do not run `npm run build` while `npm run dev` is running** — they share the
> `.next` folder. Stop dev, `rm -rf .next`, then build.

## What is implemented in this build ("running foundation")

**End-to-end, wired to one data model:**

- Authentication, refresh-token rotation, account lockout, RBAC (10 roles),
  feature gating in middleware, per-district data scoping.
- Location master: State / District / Mandal / Village.
- Executive Command Centre dashboard: 17 KPIs, interactive Telangana choropleth
  map (hover stats, click-to-filter), project-health donut, construction trend,
  district performance table, material alerts, live activity feed.
- Command Center + Executive MIS one-screen management reports.
- Beneficiaries: searchable/sortable/paginated register, **360° profile**
  (overview, personal + masked Aadhaar/bank, house, stage progress, payments,
  documents), registration form with cascading location selects.
- Projects: master + profile with rolled-up house/finance stats.
- Construction: every house as its own unit; **25-stage workflow** with a stage
  update dialog. House % is **derived** from weighted stage progress (not free
  text); a quality-checkpoint stage cannot complete without a passed inspection;
  updates cascade to beneficiary status and project totals.
- Contractors, Inventory (warehouse-aware stock + reorder alerts), Expenses,
  Government Funds (utilisation), Beneficiary Payments (milestone ledger),
  Issues, Approval Inbox (approve/reject with side effects), Daily Progress,
  Users, **Audit Log** (immutable, admin/auditor only).
- Global search, notification centre, activity feed, audit + activity logging
  on every write.

**Scaffolded (nav + RBAC + data model present, screens in a later phase):**
Supervisors, Labour vendors, Material requests, Purchases & GRN, Quality
inspection UI, Documents repository, Reports/MIS exports, Master-data settings.

## Project layout

```
prisma/schema.prisma      Full data model (40+ models, MongoDB)
prisma/seed.ts            Deterministic demo data (~280 beneficiaries, 10 districts)
src/middleware.ts         Auth + feature-level RBAC gate
src/lib/                  auth, rbac, prisma, dashboard aggregation, house/stage
                          recompute, sequence (code generation), validators
src/app/(app)/            Authenticated pages (shared shell layout)
src/app/api/              REST route handlers
src/components/           UI primitives, app shell, dashboard widgets, data table
src/data/                 Telangana district GeoJSON
```

## Security notes

- Aadhaar is stored only as last-4 + a salted hash — never in cleartext.
- Bank account is masked except for roles with `sensitive:view`; sensitive views
  are audit-logged.
- Passwords: bcrypt (cost 12). Access token 12h (dev), refresh 14d with
  reuse-detection family revocation.
- For production: move `bankAccountEnc` to real field-level encryption, put file
  storage behind signed URLs, enable TLS + secure cookies, and point
  `DATABASE_URL` at a managed replica set.

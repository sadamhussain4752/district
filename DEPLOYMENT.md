# Deploying to Vercel

The `500` on `POST /api/auth/login` means **Prisma cannot reach a database** from
the deployment. The app itself is fine — pages, middleware and auth-gating all
work; only DB queries fail. Fix = give Vercel a real MongoDB + the env vars.

## 1. Create a MongoDB database (Atlas — free)

1. https://cloud.mongodb.com → sign up → **Create** a free **M0** cluster.
2. **Database Access** → *Add New Database User* → username + password (no `@` `/`
   `:` in the password, or URL-encode them).
3. **Network Access** → *Add IP Address* → **`0.0.0.0/0`** (Allow from anywhere —
   Vercel functions have no fixed IPs).
4. **Connect → Drivers** → copy the connection string. Insert the DB name
   `indiramma_illu` right before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/indiramma_illu?retryWrites=true&w=majority
   ```

## 2. Set environment variables in Vercel

Project → **Settings → Environment Variables** (tick Production, Preview,
Development for each), then **redeploy**:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Atlas SRV string from step 1 |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (different) |
| `BOOTSTRAP_SECRET` | any random string (guards the seed endpoint) |
| `NEXT_PUBLIC_DEPLOY_STATE` | `TG` |

## 3. Seed the database

Prisma + MongoDB is schemaless, so you mainly need indexes + data.

**Option A — from your machine (full demo dataset, recommended):**

```bash
DATABASE_URL="<your Atlas SRV string>" npm run db:push   # creates indexes
DATABASE_URL="<your Atlas SRV string>" npm run seed       # ~280 beneficiaries etc.
```

**Option B — minimal seed via the deployed app (no local setup):**

```bash
curl -X POST https://<your-app>.vercel.app/api/admin/bootstrap \
  -H "x-bootstrap-key: <BOOTSTRAP_SECRET>"
```

Creates the state, 10 districts, mandals/villages, 25 construction stages and the
demo users — enough to log in and see the dashboard/map.

## 4. Verify

```
https://<your-app>.vercel.app/api/health
```

- `"DATABASE_URL not set"` → env var missing (step 2)
- `"database unreachable"` → the `hint` field tells you what to fix (usually
  Atlas Network Access, or wrong user/password)
- `"connected but not seeded"` → do step 3
- `"healthy"` → log in at `/login`

## Demo logins

`ADMIN001`, `STATE001`, `DM-RANGA`, `PM-001`, `ENG-014`, `CON-007`, `ACC-002`
— password `password123`.

## What was changed for Vercel

- `schema.prisma` → `binaryTargets = ["native", "rhel-openssl-3.0.x"]`
- `next.config.mjs` → `serverExternalPackages: ["@prisma/client", ...]`
- `package.json` → `postinstall: "prisma generate"`
- `/api/auth/login` and the API wrapper now return a clean `503 DB_UNAVAILABLE`
  (with a real reason in the Vercel function logs) instead of a bare `500`.
- New `/api/health` diagnostics and `/api/admin/bootstrap` minimal seeder.

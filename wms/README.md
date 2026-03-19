# Warehouse Management System (WMS)

A production-style operations demo: inventory, inbound/outbound logistics, labor scheduling, returns, and role-based access — built for **Next.js on Vercel** with **PostgreSQL** and **Prisma**.

## Stack

| Layer | Tech |
|--------|------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Data | Prisma 7, PostgreSQL (`@prisma/adapter-pg`, `pg`) |
| Auth | Supabase Auth (SSR cookies) + Prisma `User` / `Role` / `UserRole` |
| UI | Tailwind CSS 4, Lucide icons |
| Validation | Zod |

## Prerequisites

- Node.js 20+
- PostgreSQL database (local install, Docker, or hosted Neon / Supabase / etc.)
- [Supabase](https://supabase.com) project (for authentication)

### PostgreSQL not running? (P1001)

Prisma needs a reachable server. Pick one:

1. **Docker** (from this folder): `docker compose up -d` — then use the URL in [`.env.example`](.env.example) (`database` name **`wms`**).
2. **Homebrew (macOS)**: e.g. `brew services start postgresql@16` and create a DB whose name matches your `DATABASE_URL`.
3. **Hosted**: put your provider’s connection string in `DATABASE_URL`.

Your `DATABASE_URL` must use the **same database name** the server exposes (compose creates `wms`; if you use `mydb`, either create that database in Postgres or change the URL).

## Local setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# If using docker-compose.yml: docker compose up -d
npm run prisma:migrate   # or: npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a user that exists in **both** Supabase Auth and the seeded Prisma `User` table (same email).

**Demo accounts (after seed):**

| Email | Role (per warehouse) |
|--------|----------------------|
| `admin@wms.demo` | `admin` — full access + `/admin/users` |
| `manager@wms.demo` | `warehouse_manager` |
| `viewer@wms.demo` | `viewer` — read-mostly |

Create matching users in **Supabase → Authentication** with the same emails and your chosen passwords.

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` and set `DATABASE_URL` there. **`prisma.config.ts` loads `.env` then `.env.local`** (local overrides), so Prisma CLI commands use the same URL as Next.js — if you only had Supabase in `.env` and localhost in `.env`, you’d see `localhost:5432` errors from the CLI.

Summary:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | **Postgres** connection string. With Supabase: **Project Settings → Database → Connection string** (URI). This is separate from the Auth URL below. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase **API** URL (Authentication / client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only; optional for future admin invite flows |

Never commit `.env.local` or service role keys.

## Database

```bash
npx prisma migrate dev     # create/apply migrations (local)
npx prisma migrate deploy  # apply migrations (CI / production)
npm run prisma:seed        # demo data
```

- Schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Client singleton: `src/server/db/prisma.ts` (uses `DATABASE_URL`)

### Serverless / Vercel notes

- Use a **hosted Postgres** URL in `DATABASE_URL` (Vercel Postgres, Neon, Supabase DB, etc.).
- If the provider uses **PgBouncer** or **transaction mode**, add the query parameters they document (e.g. pooling / SSL flags).
- `postinstall` runs `prisma generate` so Vercel builds have a generated client without extra steps.

## Production build

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## Deploying to Vercel

1. Push the repo to GitHub/GitLab/Bitbucket and **Import** the project in Vercel.
2. If this app lives in a monorepo folder, set **Root Directory** to `wms` (the folder containing `package.json` and `next.config.ts`).
3. **Environment variables**: add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same as local; use production DB URL).
4. **Build command**: default `npm run build` (runs `next build` after `postinstall` → `prisma generate`).
5. **Install command**: default `npm install`.
6. Run migrations against the production database:

   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

7. Optionally seed a **staging** database only (avoid seeding production with demo data unless intended).

### Post-deploy checklist

- [ ] `DATABASE_URL` points at production Postgres  
- [ ] Migrations applied (`prisma migrate deploy`)  
- [ ] Supabase Auth users created for each Prisma `User` email that should log in  
- [ ] `NEXT_PUBLIC_*` Supabase vars match the same Supabase project  

## Project layout

- `src/app/` — App Router pages, layouts, `loading.tsx`, `error.tsx`
- `src/features/` — Domain modules (`schemas`, `service`, `actions`)
- `src/lib/auth/` — RBAC permissions and session helpers
- `src/components/` — Shared UI
- `prisma/` — Schema and migrations

See [`src/features/README.md`](./src/features/README.md) for feature-module conventions.

## License

Private / demo — adjust as needed.

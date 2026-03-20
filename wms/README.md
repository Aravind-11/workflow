# Warehouse Management System (WMS)

A production-style operations demo: inventory, inbound/outbound logistics, labor scheduling, returns, and role-based access — built for **Next.js on Vercel** with **MongoDB Atlas** and **Prisma**.

**Live:** [wms-peach.vercel.app](https://wms-peach.vercel.app)

## Stack

| Layer | Tech |
|--------|------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Data | Prisma 6, MongoDB Atlas |
| Auth | Supabase Auth (SSR cookies) + Prisma `User` / `Role` / `UserRole` |
| UI | Tailwind CSS 4, Lucide icons |
| Validation | Zod |

## Prerequisites

- Node.js 20+
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works fine)
- [Supabase](https://supabase.com) project (for authentication)

## Local setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local: DATABASE_URL (MongoDB URI), NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npx prisma db push
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

Copy [`.env.example`](./.env.example) to `.env.local`. The `prisma.config.ts` file loads `.env` then `.env.local` (local overrides), so Prisma CLI commands use the same URL as Next.js.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/wms?retryWrites=true&w=majority`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase **API** URL (Authentication / client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only; optional for future admin invite flows |

Never commit `.env.local` or service role keys.

## Database

```bash
npx prisma db push        # sync schema to MongoDB (no migrations needed)
npx prisma generate        # regenerate client after schema changes
npm run prisma:seed        # demo data
```

- Schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Client singleton: `src/server/db/prisma.ts`

MongoDB uses `db push` instead of SQL migrations. There is no `migrate dev` / `migrate deploy` step.

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

1. Push the repo to GitHub and **Import** the project in Vercel.
2. If this app lives in a monorepo folder, set **Root Directory** to `wms`.
3. **Environment variables**: add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Build command**: default `npm run build` (runs `next build` after `postinstall` → `prisma generate`).
5. Optionally seed a **staging** database only (avoid seeding production with demo data unless intended).

### Post-deploy checklist

- [ ] `DATABASE_URL` points at your MongoDB Atlas cluster
- [ ] Schema pushed (`npx prisma db push`)
- [ ] Supabase Auth users created for each Prisma `User` email that should log in
- [ ] `NEXT_PUBLIC_*` Supabase vars match the same Supabase project

## Project layout

- `src/app/` — App Router pages, layouts, `loading.tsx`, `error.tsx`
- `src/features/` — Domain modules (`schemas`, `service`, `actions`)
- `src/lib/auth/` — RBAC permissions and session helpers
- `src/components/` — Shared UI
- `prisma/` — Schema

See [`src/features/README.md`](./src/features/README.md) for feature-module conventions.

## License

Private / demo — all rights reserved.

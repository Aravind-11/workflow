# Team Setup (Local Development)

Use this when setting up the WMS app on a new machine.

## 1) Clone and install

```bash
git clone <repo-url>
cd nventr-wms/wms
npm install
```

## 2) Configure environment

```bash
cp .env.example .env.local
```

Update `wms/.env.local` with your values:

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/wms?retryWrites=true&w=majority"
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-public-key>"
```

Optional server-only key:

```env
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## 3) Initialize DB

```bash
npx prisma db push
npm run prisma:seed
```

## 4) Run locally

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

`http://127.0.0.1:3000`

## Notes

- Do not commit `.env.local`.
- Use the same Supabase project for URL + anon key.
- If port 3000 is busy:

```bash
lsof -ti:3000 | xargs kill -9
```

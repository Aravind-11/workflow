# Feature Architecture

This project follows a feature-first structure for domain modules.

## Layout

- `src/features/<feature>/schemas.ts` - Zod validation and input parsing.
- `src/features/<feature>/service.ts` - server-side business logic and Prisma queries.
- `src/features/<feature>/components/*` - UI components scoped to a feature.
- `src/server/db/prisma.ts` - shared Prisma client singleton.

## Design goals

- Keep data access near domain logic.
- Keep route handlers and pages thin.
- Prefer simple composition over heavy abstractions.

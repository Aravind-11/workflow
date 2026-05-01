# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Multi-stage build for the Nventr WMS Next.js app.
#
# Stage 1 (deps):    install all dependencies (incl. dev) for the build step.
# Stage 2 (builder): generate Prisma client + run `next build` (standalone).
# Stage 3 (runner):  copy the standalone server bundle + minimal node_modules
#                    into a tiny Alpine image and run as a non-root user.
#
# Build:  docker build -t nventr-wms:local .
# Run:    docker run --rm -p 3000:3000 --env-file .env.local nventr-wms:local
# -----------------------------------------------------------------------------

ARG NODE_VERSION=22-alpine

# ---------- 1. Dependencies ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# libc6-compat is needed by some npm packages on Alpine (e.g. prisma engines)
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---------- 2. Builder ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# NEXT_PUBLIC_* must exist at build time — Next inlines them into the client bundle.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Stable per-build identifier — fed by the GitHub Actions workflow as the
# commit SHA. Surfaced at runtime via /api/build-id so the client can
# detect new deploys and prompt a reload.
ARG BUILD_ID=dev
ENV BUILD_ID=$BUILD_ID

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client must be generated against the same OS/arch as the runtime.
RUN npx prisma generate
RUN npm run build

# ---------- 3. Runtime ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl wget \
    && addgroup -g 1001 -S nodejs \
    && adduser  -u 1001 -S nextjs -G nodejs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Carry the build identifier into the runtime image so /api/build-id
# can return it without rebuilding the layer.
ARG BUILD_ID=dev
ENV BUILD_ID=$BUILD_ID

# Standalone bundle: server.js, minimal node_modules, package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and the public/ folder are NOT copied automatically by `output: standalone`
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma engines + schema needed at runtime for `@prisma/client`
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Container-level health probe used by ECS/ALB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

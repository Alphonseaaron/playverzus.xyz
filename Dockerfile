# Multi-stage Dockerfile for PlayVerzus NestJS API in PNPM Monorepo
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Copy workspace configuration and dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

# Install dependencies and build db, core, and API packages
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @playverzus/db build
RUN pnpm --filter @playverzus/core build
RUN pnpm --filter @playverzus/api build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]

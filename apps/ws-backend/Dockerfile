FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm and dependencies
RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/ws-backend ./apps/ws-backend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db run db:generate || true
RUN pnpm --filter ws-backend run build

EXPOSE 8080

CMD ["node", "apps/ws-backend/dist/index.js"]

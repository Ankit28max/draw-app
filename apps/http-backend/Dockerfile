FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm and dependencies
RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/http-backend ./apps/http-backend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db run db:generate || true
RUN pnpm --filter http-backend run build

EXPOSE 3001

CMD ["node", "apps/http-backend/dist/index.js"]

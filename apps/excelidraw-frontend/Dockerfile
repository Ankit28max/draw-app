FROM node:20-alpine AS base

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/excelidraw-frontend ./apps/excelidraw-frontend

RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_HTTP_BACKEND
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_HTTP_BACKEND=$NEXT_PUBLIC_HTTP_BACKEND
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN pnpm --filter excelidraw-frontend run build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

WORKDIR /app/apps/excelidraw-frontend

CMD ["pnpm", "start"]

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web-app/package.json ./apps/web-app/
RUN pnpm install --frozen-lockfile --filter @instigi/types --filter @instigi/ui --filter @instigi/web-app

COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY apps/web-app ./apps/web-app
RUN pnpm --filter @instigi/types build
RUN pnpm --filter @instigi/ui build
RUN pnpm --filter @instigi/web-app build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web-app/dist /usr/share/nginx/html
COPY apps/web-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

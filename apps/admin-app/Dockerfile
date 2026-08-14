FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin-app/package.json ./apps/admin-app/
RUN pnpm install --frozen-lockfile --filter @instigi/types --filter @instigi/ui --filter @instigi/admin-app

COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY apps/admin-app ./apps/admin-app
RUN pnpm --filter @instigi/types build
RUN pnpm --filter @instigi/ui build

# Vite inlines this at build time; supply the public auth API origin so the
# shipped bundle does not fall back to the localhost dev default.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @instigi/admin-app build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/admin-app/dist /usr/share/nginx/html
COPY apps/admin-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

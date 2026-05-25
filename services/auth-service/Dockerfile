FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY services/auth-service/package.json ./services/auth-service/
RUN pnpm install --frozen-lockfile --filter @instigi/types --filter @instigi/auth-service

COPY packages/types ./packages/types
COPY services/auth-service ./services/auth-service
RUN pnpm --filter @instigi/types build
RUN pnpm --filter @instigi/auth-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/prisma ./services/auth-service/prisma
COPY --from=builder /app/services/auth-service/node_modules ./services/auth-service/node_modules

WORKDIR /app/services/auth-service
RUN npx prisma generate

EXPOSE 4000
CMD ["node", "dist/index.js"]

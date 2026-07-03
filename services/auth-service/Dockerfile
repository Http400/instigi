FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

FROM base AS builder
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY services/auth-service/package.json ./services/auth-service/
RUN pnpm install --frozen-lockfile --filter @instigi/types --filter @instigi/utils --filter @instigi/auth-service

COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY services/auth-service ./services/auth-service
RUN pnpm --filter @instigi/types build
RUN pnpm --filter @instigi/utils build
RUN pnpm --filter @instigi/auth-service build
RUN cd services/auth-service && npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/utils ./packages/utils
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/prisma ./services/auth-service/prisma
COPY --from=builder /app/services/auth-service/prisma.config.ts ./services/auth-service/prisma.config.ts
COPY --from=builder /app/services/auth-service/node_modules ./services/auth-service/node_modules

WORKDIR /app/services/auth-service
EXPOSE 4000
CMD ["node", "dist/index.js"]

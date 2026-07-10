FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

FROM base AS builder
ARG DATABASE_URL=******localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY services/training-service/package.json ./services/training-service/
RUN pnpm install --frozen-lockfile --filter @instigi/types --filter @instigi/utils --filter @instigi/training-service

COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY services/training-service ./services/training-service
RUN pnpm --filter @instigi/types build
RUN pnpm --filter @instigi/utils build
RUN pnpm --filter @instigi/training-service build
RUN cd services/training-service && npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/utils ./packages/utils
COPY --from=builder /app/services/training-service/dist ./services/training-service/dist
COPY --from=builder /app/services/training-service/src/generated ./services/training-service/src/generated
COPY --from=builder /app/services/training-service/prisma ./services/training-service/prisma
COPY --from=builder /app/services/training-service/prisma.config.ts ./services/training-service/prisma.config.ts
COPY --from=builder /app/services/training-service/node_modules ./services/training-service/node_modules

WORKDIR /app/services/training-service
EXPOSE 4001
CMD ["node", "dist/index.js"]

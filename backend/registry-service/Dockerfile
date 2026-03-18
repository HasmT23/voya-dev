FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# Build
FROM base AS builder
COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install
COPY src ./src/
RUN npx prisma generate
RUN npx tsc

# Production
FROM base AS runner
RUN addgroup --system --gid 1001 voya && \
    adduser --system --uid 1001 --ingroup voya voya

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/
COPY package.json ./

USER voya
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/index.js"]

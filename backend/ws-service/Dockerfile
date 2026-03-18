FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

FROM base AS builder
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src/
RUN npx tsc

FROM base AS runner
RUN addgroup --system --gid 1001 voya && \
    adduser --system --uid 1001 --ingroup voya voya

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER voya
EXPOSE 3002
ENV NODE_ENV=production
ENV PORT=3002

CMD ["node", "dist/index.js"]

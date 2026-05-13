# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["npm", "run", "start"]

# ==========================================
# 1. Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source files and compile TypeScript
COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# ==========================================
# 2. Production Runner Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npm cache clean --force
RUN npx prisma generate

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory and ensure node user permissions
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Productionda avval Prisma migratsiyalarini qo'llaydi, keyin serverni ishga tushiradi
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]

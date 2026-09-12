# ==============================================================================
# Core Quest Finder — Backend Dockerfile (Multi-Stage Production Build)
# ==============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for TypeScript build
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to dist/
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache dumb-init

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled JavaScript output from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for container security
USER node

EXPOSE 5000

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

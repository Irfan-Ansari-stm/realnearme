# ─────────────────────────────────────────────────────────────────
# NearMe Backend — Multi-stage Dockerfile
# Stage 1: base — shared Node.js setup
# Stage 2: development — with nodemon + ts-node
# Stage 3: builder — compile TypeScript
# Stage 4: production — minimal runtime image
# ─────────────────────────────────────────────────────────────────

# ── Base ──────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./

# ── Development ───────────────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# ── Builder ───────────────────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=production
RUN npm ci --only=production
COPY . .
RUN npm run build

# ── Production ────────────────────────────────────────────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nearme -u 1001
COPY --from=builder --chown=nearme:nodejs /app/dist ./dist
COPY --from=builder --chown=nearme:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nearme:nodejs /app/package.json ./package.json
USER nearme
EXPOSE 3000
CMD ["dumb-init", "node", "dist/server.js"]

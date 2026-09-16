# Stage 1: Build Frontend Web Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Build Backend API & SSH Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# Stage 3: Production Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy server package manifests and install only production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# Copy compiled backend JavaScript from server-builder
COPY --from=server-builder /app/server/dist ./server/dist

# Copy compiled frontend SPA static assets from client-builder
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=client-builder /app/client/dist ./server/public

# Expose web application port (HTTP REST API + WebSocket SSH + Static Web UI)
EXPOSE 3000

WORKDIR /app/server

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start ProxMobile unified server
CMD ["node", "dist/index.js"]

# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:current-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build
# Output: /frontend/dist/

# ── Stage 2: Install backend deps (needs build tools for native module) ───────
FROM node:current-slim AS backend-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ .

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:current-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-0 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-builder /app ./
# Frontend build goes into /app/public/ — Express serves it as static files
COPY --from=frontend-builder /frontend/dist ./public
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "server.js"]

# TableForge — Go API + React SPA in one image.
# `docker compose up --build` builds the SPA (frontend/) and Go serves it at /app.
#
# Optimizations:
#  - BuildKit cache mounts for npm + Go module/build cache (fast rebuilds)
#  - `npm ci` on locked deps (reproducible, prunes dev-only drift)
#  - Production Vite build without sourcemaps (smallest dist)
#  - Go: CGO_ENABLED=0, -trimpath, -ldflags="-s -w" (small static binary)
#  - Minimal alpine runtime with only ca-certificates + postgresql-client (pg_dump)
#  - Non-root user, healthcheck, baked-in docker default config

# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------- frontend
FROM node:22-alpine AS febuild
WORKDIR /build/frontend

# Install deps first for max layer-cache reuse.
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Build the SPA. Sourcemaps are forced off for production size
# (vite.config.ts has sourcemap:true for local debugging).
COPY frontend/ ./
ARG VITE_APP_VERSION=1.0.0
ENV NODE_ENV=production \
    VITE_APP_VERSION=${VITE_APP_VERSION}
RUN --mount=type=cache,target=/root/.npm \
    npm run build -- --sourcemap false && \
    ls -lh dist/ && du -sh dist/

# ---------------------------------------------------------------- Go build
FROM golang:1.26-alpine AS gobuild
WORKDIR /app
RUN apk add --no-cache ca-certificates

# Go deps first for layer-cache reuse.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy Go sources only (frontend/ excluded via .dockerignore —
# the built dist is injected in the final stage, not compiled in).
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY config/docker.yaml ./config/docker.yaml

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build \
      -trimpath \
      -ldflags="-s -w" \
      -o /out/tableforge ./cmd/server && \
    ls -lh /out/tableforge

# ---------------------------------------------------------------- runtime
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates postgresql-client wget && \
    addgroup -S app && adduser -S app -G app

# Baked-in defaults for `docker compose up` (compose overrides servers[0]
# via PGHOST/PGPORT/PGSSLMODE env vars; host network → 127.0.0.1 system PG).
# Mount your own file to /config/config.yaml to fully override.
COPY --from=gobuild /out/tableforge /usr/local/bin/tableforge
COPY --from=febuild /build/frontend/dist /app/frontend/dist
COPY config/docker.yaml /config/config.yaml

WORKDIR /app
RUN chown -R app:app /app /config
USER app

EXPOSE 8080
ENV SPA_DIR=/app/frontend/dist

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz | grep -q ok

ENTRYPOINT ["/usr/local/bin/tableforge", "-config", "/config/config.yaml"]

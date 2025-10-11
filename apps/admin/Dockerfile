# syntax=docker/dockerfile:1

#
# Multi-stage build for the @pro/admin Angular dashboard.
# Builder uses Bun workspaces; runtime is a hardened nginx image.
#

FROM oven/bun:1.3.0-alpine AS base

ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

# -----------------------------------------------------------------------------
# deps: install monorepo dependencies once
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

COPY bun.lock package.json turbo.json tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/*/package.json packages/*/

RUN --mount=type=cache,id=bun-admin-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder: compile the Angular dashboard
# -----------------------------------------------------------------------------
FROM base AS builder

ARG AMAP_API_KEY

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

# Provide map key to the build if supplied.
RUN if [ -n "${AMAP_API_KEY}" ]; then \
      printf 'AMAP_API_KEY=%s\n' "${AMAP_API_KEY}" > apps/admin/.env.production; \
    fi

RUN --mount=type=cache,id=bun-admin-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/admin...

RUN set -eux; \
    mkdir -p /app/.release/dist; \
    cp -r apps/admin/dist/admin /app/.release/dist/admin

# -----------------------------------------------------------------------------
# runner: nginx serving the compiled dashboard
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full

COPY --from=builder /app/.release/dist/admin/browser /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

RUN set -eux; \
    printf '{\n  "version": "%s",\n  "buildTime": "%s",\n  "gitCommit": "%s",\n  "buildType": "%s",\n  "stage": "production"\n}\n' \
      "${BUILD_VERSION}" "${BUILD_TIME}" "${GIT_COMMIT}" "${BUILD_TYPE}" \
      > /usr/share/nginx/html/build-info.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

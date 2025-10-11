# syntax=docker/dockerfile:1

#
# Multi-stage build for the @pro/web Angular frontend.
# Produces an nginx runtime image containing only the compiled static assets.
#

FROM oven/bun:1.3.0-alpine AS base

ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

# -----------------------------------------------------------------------------
# deps: install workspace dependencies with maximal cache reuse
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

COPY bun.lock package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/*/package.json packages/*/

RUN --mount=type=cache,id=bun-web-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder: compile the Angular application and its workspace dependencies
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

RUN --mount=type=cache,id=bun-web-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/web...

RUN set -eux; \
    mkdir -p /app/.release/dist; \
    cp -r apps/web/dist/web /app/.release/dist/web

# -----------------------------------------------------------------------------
# runner: nginx serving the compiled static files
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full

COPY --from=builder /app/.release/dist/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

RUN set -eux; \
    printf '{\n  "version": "%s",\n  "buildTime": "%s",\n  "gitCommit": "%s",\n  "buildType": "%s",\n  "stage": "production"\n}\n' \
      "${BUILD_VERSION}" "${BUILD_TIME}" "${GIT_COMMIT}" "${BUILD_TYPE}" \
      > /usr/share/nginx/html/build-info.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# No build args: the image carries no environment-specific configuration. The
# VAPID public key is served to the browser at runtime by GET /api/push/subscribe
# rather than inlined here, so the same image runs against any environment and
# rotating the keypair is a restart rather than a rebuild.
RUN bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd -r -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs && \
    apt-get update -qq && apt-get install -y -qq curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# The standalone bundle traces its own runtime dependencies into
# .next/standalone/node_modules. This copy exists for ONE consumer:
# scripts/migrate.ts, which the entrypoint runs before boot and which the
# tracer never saw. (bun server.js is the launch path — see entrypoint.sh.)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# /api/auth/check answers 200 JSON without a session by design, so it probes
# the whole stack (process up, DB reachable) without auth.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/auth/check || exit 1

ENTRYPOINT ["sh", "./scripts/entrypoint.sh"]

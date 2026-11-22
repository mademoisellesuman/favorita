# syntax=docker/dockerfile:1

# Use the same major version as your own `node -v`.
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# --- Stage 1: install production dependencies only ---
FROM base AS deps
COPY package.json package-lock.json ./
# `npm ci` installs EXACTLY what the lock file says (faster and more repeatable than
# `npm install`). --omit=dev skips development-only packages.
RUN npm ci --omit=dev

# --- Stage 2: the final image ---
FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Run as the unprivileged "node" user that comes with the image, not as root.
USER node

EXPOSE 5000

# Docker runs this periodically and marks the container healthy or unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# "Exec form" (a JSON array) runs node directly, so it receives stop signals.
CMD ["node", "src/server.js"]
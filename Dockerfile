# ---- Build stage ----
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Install build tools for native addons (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# ---- Production stage ----
FROM node:24-slim AS production

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Install sqlite3 shared lib needed by better-sqlite3 at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built output
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Create directories for persistent data
RUN mkdir -p /app/data /app/static/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

EXPOSE 3000

CMD ["node", "build/index.js"]

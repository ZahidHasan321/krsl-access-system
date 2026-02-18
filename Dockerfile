# ---- Build stage ----
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# ---- Production stage ----
FROM node:24-slim AS production

RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# Copy built output
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.json ./drizzle.config.json
COPY --from=builder /app/scripts ./scripts

# Create directories for persistent data
RUN mkdir -p /app/static/uploads

ENV NODE_ENV=production
ENV PORT=3000
## ORIGIN is set via docker-compose.yml or .env (must match the real server URL)

EXPOSE 3000

CMD ["node", "build/index.js"]

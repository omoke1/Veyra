# Web Frontend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Accept build arguments
ARG NEXT_PUBLIC_INDEXER_URL
ARG NEXT_PUBLIC_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_FACTORY_ADDRESS
ARG NEXT_PUBLIC_ORACLE_ADDRESS
ARG NEXT_PUBLIC_ADAPTER_ADDRESS
ARG NEXT_PUBLIC_TEST_TOKEN_ADDRESS

# Set environment variables from build args
ENV NEXT_PUBLIC_INDEXER_URL=$NEXT_PUBLIC_INDEXER_URL
ENV NEXT_PUBLIC_SEPOLIA_RPC_URL=$NEXT_PUBLIC_SEPOLIA_RPC_URL
ENV NEXT_PUBLIC_FACTORY_ADDRESS=$NEXT_PUBLIC_FACTORY_ADDRESS
ENV NEXT_PUBLIC_ORACLE_ADDRESS=$NEXT_PUBLIC_ORACLE_ADDRESS
ENV NEXT_PUBLIC_ADAPTER_ADDRESS=$NEXT_PUBLIC_ADAPTER_ADDRESS
ENV NEXT_PUBLIC_TEST_TOKEN_ADDRESS=$NEXT_PUBLIC_TEST_TOKEN_ADDRESS

# Build Next.js
RUN npm install -g pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

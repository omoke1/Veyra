# Indexer Dockerfile
FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Rebuild native modules for Alpine Linux
RUN npm rebuild better-sqlite3

# Copy source code (excluding node_modules via .dockerignore)
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm run build

# Expose port
EXPOSE 4001

# Start the server
CMD ["node", "dist/server.js"]

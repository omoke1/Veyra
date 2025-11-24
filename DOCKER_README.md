# Veyra Docker Compose Setup

This directory contains Docker Compose configuration to run all Veyra services.

## Services

- **indexer** (port 4001): Blockchain event indexer and API server
- **web** (port 3000): Next.js frontend application
- **avs** (optional): Off-chain AVS operator node

## Quick Start

### 1. Setup Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start Services

```bash
# Start indexer and web only (recommended for development)
docker-compose up -d

# Start all services including AVS
docker-compose --profile avs up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service Details

### Indexer
- Serves REST API on port 4001
- Stores data in SQLite (`indexer/vyro.db`)
- Event listening disabled by default (set `RUN_INDEXER=1` to enable)

### Web Frontend
- Next.js app on port 3000
- Connects to indexer at `http://indexer:4001` (internal network)
- Accessible at `http://localhost:3000`

### AVS Operator
- Only starts with `--profile avs` flag
- Requires `AVS_PRIVATE_KEY` in `.env`
- Listens for `VerificationRequested` events and submits attestations

## Development

For local development without Docker:

```bash
# Terminal 1: Indexer
cd indexer && npm start

# Terminal 2: Web
cd web && pnpm dev

# Terminal 3: AVS (optional)
cd avs && npm start
```

## Troubleshooting

**Indexer connection errors:**
- Ensure indexer is running: `docker-compose ps`
- Check logs: `docker-compose logs indexer`

**Web build fails:**
- Clear Next.js cache: `rm -rf web/.next`
- Rebuild: `docker-compose build web`

**AVS not starting:**
- Verify `AVS_PRIVATE_KEY` is set in `.env`
- Check that `ADAPTER_ADDRESS` is correct

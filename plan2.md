# Veyra Project Plan (v2)

## Overview
Veyra is a verifiable oracle layer that provides deterministic, cryptographically provable event resolutions for prediction markets.

## Current Architecture

### 1. Protocol (`/protocol`)
- **Framework**: Hardhat
- **Purpose**: Core smart contracts (AVS, Market, Oracle adapters).
- **Key Contracts**:
    - `VeyraOracleAVS`: Main entry point for resolution requests.
    - `MarketFactory`: Deploys prediction markets.
    - `Slashing`: Handles operator accountability.

### 2. Web (`/web`)
- **Framework**: Next.js + Tailwind CSS
- **Purpose**: User interface for traders and operators.
- **Features**:
    - Market Explorer
    - Trading Interface
    - Operator Dashboard

### 3. Indexer (`/indexer`)
- **Purpose**: Indexes blockchain events for the frontend.
- **Database**: SQLite (local), Postgres (prod).

### 4. Relayer (`/relayer`)
- **Purpose**: Off-chain service to submit proofs and attestations to the blockchain.

### 5. AVS (`/avs`)
- **Purpose**: The Actively Validated Service logic running on EigenLayer operators.
- **Function**: Validates off-chain data and generates proofs.

### 6. Bridge (`/bridge`)
- **Purpose**: Cross-chain communication (if applicable).

## Development Workflow

### Prerequisites
- Node.js & pnpm
- Docker (for local nodes)

### Commands
- **Start All**: `pnpm dev` (starts web, indexer, and local chain if configured)
- **Build Protocol**: `cd protocol && npm run build`
- **Test Protocol**: `cd protocol && npx hardhat test`
- **Build Web**: `cd web && npm run build`

## Next Steps
- [ ] Consolidate documentation in `README.md`.
- [ ] Ensure all components are wired up correctly in `package.json` scripts.

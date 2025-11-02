# Veyra AVS Service

Mock EigenCloud AVS node that processes verification requests from the VPOAdapter contract.

## Overview

This service simulates an EigenLayer AVS (Actively Validated Service) node that:

1. Listens to `VerificationRequested` events on the VPOAdapter contract
2. Fetches data from multiple sources (mock implementation)
3. Computes outcomes based on the query
4. Generates attestations with proofs
5. Uploads proofs to IPFS (mock)
6. Calls `fulfillVerification` on the adapter contract

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Required environment variables:**
   - `SEPOLIA_RPC_URL` - Sepolia RPC endpoint
   - `ADAPTER_ADDRESS` - Deployed VPOAdapter contract address
   - `AVS_PRIVATE_KEY` - Private key of AVS node (must be registered in adapter)

## Usage

**Start the AVS service:**
```bash
npm start
```

**Development mode (auto-reload):**
```bash
npm run dev
```

## How It Works

1. Service connects to Sepolia via RPC
2. Verifies AVS node is registered in adapter
3. Listens for `VerificationRequested` events
4. When event received:
   - Parses request data
   - Fetches data from sources (mock)
   - Computes outcome
   - Generates IPFS CID (mock)
   - Calls `fulfillVerification` on adapter
5. External markets can then read results via `getFulfillment`

## Registration

Before starting, ensure the AVS node address is registered:

```solidity
// From admin account
adapter.setAVSNode(avsNodeAddress, true);
```

## Mock Implementation

This is a **mock** implementation for testing. In production:

- Would fetch from real APIs (Binance, Coinbase, etc.)
- Would implement proper signature verification
- Would upload to real IPFS
- Would have quorum of multiple AVS nodes
- Would implement slashing mechanisms

## Next Steps

- [ ] Integrate real data sources
- [ ] Implement EIP-712 attestation signing
- [ ] Add IPFS upload (Pinata, Infura, etc.)
- [ ] Add multiple AVS node coordination
- [ ] Add health checks and monitoring


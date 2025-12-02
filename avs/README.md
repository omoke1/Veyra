# Veyra AVS Service

EigenLayer AVS node that processes verification requests from the VeyraOracleAVS contract.

## Overview

This service implements an EigenLayer AVS (Actively Validated Service) node that:

1. Listens to `VerificationRequested` events on the VeyraOracleAVS contract
2. Fetches data from multiple sources (APIs, LLM, etc.)
3. Computes outcomes based on the query
4. Generates EigenVerify proofs
5. Uploads attestations to IPFS via Pinata
6. Submits attestations with quorum consensus
7. Integrates with EigenLayer's DelegationManager for operator stake queries

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
   - `ADAPTER_ADDRESS` - Deployed VeyraOracleAVS contract address
   - `AVS_PRIVATE_KEY` - Private key of operator (must be registered on EigenLayer)
   - `EIGENLAYER_DELEGATION_MANAGER` - EigenLayer DelegationManager contract address (optional but recommended)
   - `PINATA_API_KEY` - Pinata API key for IPFS uploads
   - `PINATA_SECRET_API_KEY` - Pinata secret API key
   - `GEMINI_API_KEY` - (Optional) Google Gemini API key for LLM verification

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
2. Verifies operator is registered to AVS on EigenLayer
3. Queries operator stake from EigenLayer's DelegationManager
4. Listens for `VerificationRequested` events
5. When event received:
   - Parses request data
   - Fetches data from sources (APIs, LLM, etc.)
   - Computes outcome
   - Generates EigenVerify proof
   - Uploads attestation to IPFS (Pinata)
   - Signs attestation with EIP-712
   - Submits attestation via `submitAttestation`
6. Monitors quorum status and finalizes when reached
7. External markets can read results via `getFulfillment`

## Operator Registration

**Important**: Operators must register themselves on EigenLayer before running this service:

1. **Register as EigenLayer Operator**:
   - Follow EigenLayer's operator registration process
   - See: https://docs.eigenlayer.xyz/operators/howto/operator-installation

2. **Opt-in to VeyraOracleAVS AVS**:
   - After AVS is registered on EigenLayer, operators must opt-in
   - This is done through EigenLayer's AllocationManager

3. **Verify Registration**:
   ```bash
   # Check if operator is registered
   veyraOracleAVS.isOperatorRegistered(operatorAddress)
   ```

## EigenLayer Integration

This service now integrates with EigenLayer's official contracts:

- **DelegationManager**: Queries operator stake/shares
- **AllocationManager**: Verifies operator registration to AVS
- **SlashingCoordinator**: Handles slashing for misbehavior
- **EigenVerify**: (Optional) Official verification service

Operator weights are automatically sourced from EigenLayer's DelegationManager, not manually set.

## Features

- ✅ Real IPFS uploads via Pinata
- ✅ EIP-712 attestation signing
- ✅ EigenVerify proof generation
- ✅ Quorum consensus tracking
- ✅ EigenLayer operator integration
- ✅ LLM verification (Gemini) support
- ✅ Multiple data source support

## Next Steps

- [ ] Add health checks and monitoring
- [ ] Implement operator key rotation
- [ ] Add metrics and logging
- [ ] Support for multiple networks


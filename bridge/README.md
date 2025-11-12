# Veyra Bridge Service

Off-chain service that monitors external prediction markets (UMA, Gnosis, Polymarket) and bridges them with Veyra's VPOAdapter for verification.

## Overview

The bridge service:
1. **Monitors** UMA Optimistic Oracle assertions, Gnosis Conditional Tokens conditions, and Polymarket markets
2. **Requests** verification from VPOAdapter when markets are ready for resolution
3. **Submits** verified outcomes back to external platforms after VPOAdapter fulfillment

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SEPOLIA_RPC_URL` - Sepolia RPC endpoint
- `VPO_ADAPTER_ADDRESS` - VPOAdapter contract address
- `UMA_ADAPTER_ADDRESS` - UMAAdapter contract address
- `GNOSIS_ADAPTER_ADDRESS` - GnosisAdapter contract address
- `UMA_ORACLE_ADDRESS` - UMA Optimistic Oracle address
- `GNOSIS_CONDITIONAL_TOKENS` - Gnosis Conditional Tokens address
- `BRIDGE_PRIVATE_KEY` - Private key for bridge service wallet

Optional (for Polymarket):
- `POLYMARKET_API_KEY` - Polymarket API key
- `POLYMARKET_SECRET` - Polymarket API secret
- `POLYMARKET_PASSPHRASE` - Polymarket API passphrase
- `POLYMARKET_ADDRESS` - Polymarket wallet address

### 3. Build

```bash
npm run build
```

### 4. Run

```bash
# Development mode (with TypeScript)
npm run dev

# Production mode
npm start
```

## How It Works

### UMA Flow
1. Bridge listens to `AssertionMade` events from UMA Optimistic Oracle
2. When an assertion is detected, calls `UMAAdapter.handleAssertion()`
3. This creates a VPOAdapter verification request
4. Bridge monitors for `VerificationFulfilled` events
5. When fulfilled, calls `UMAAdapter.submitOutcomeToUMA()` to submit the outcome

### Gnosis Flow
1. Bridge listens to `ConditionPreparation` events from Gnosis Conditional Tokens
2. When a condition is detected, calls `GnosisAdapter.handleCondition()`
3. This creates a VPOAdapter verification request
4. Bridge monitors for `VerificationFulfilled` events
5. When fulfilled, calls `GnosisAdapter.resolveCondition()` to report payouts

### Polymarket Flow
1. Bridge polls Polymarket Subgraph for markets ready for resolution
2. When a market's end date passes, calls `GnosisAdapter.handleCondition()` (Polymarket uses Gnosis Conditional Tokens)
3. This creates a VPOAdapter verification request
4. Bridge monitors for `VerificationFulfilled` events
5. When fulfilled, calls `GnosisAdapter.resolveCondition()` to report payouts

## Monitoring

The bridge service logs all activities:
- 🔍 Market detection
- 📋 Request creation
- ✅ Fulfillment detection
- 📤 Outcome submission

## Security Notes

- **Private Key**: Use a dedicated wallet with minimal funds for the bridge service
- **Access Control**: The bridge service must be authorized as admin on the adapters
- **Network**: Currently configured for Sepolia testnet

## Troubleshooting

### "No signers available"
- Check that `BRIDGE_PRIVATE_KEY` is set correctly in `.env`
- Ensure the private key has funds for gas

### "Adapter address not found"
- Verify adapter addresses are correct in `.env`
- Check that adapters are deployed on the same network as the RPC URL

### "AlreadyFulfilled" errors
- This is normal if a market was already handled
- The bridge will skip already-processed markets

## Next Steps

1. Deploy adapters to mainnet (when ready)
2. Update RPC URLs and addresses for mainnet
3. Set up monitoring/alerting for bridge service
4. Configure Polymarket API credentials for enhanced data


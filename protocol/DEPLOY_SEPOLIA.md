# Sepolia Deployment Guide

## Environment Variables

Create a `.env` file in the `protocol/` directory with the following:

```env
# Sepolia Testnet Configuration
# Chain ID: 11155111
# Network: Ethereum Sepolia

# RPC Endpoint (choose one):
# Option 1: Infura
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Option 2: Alchemy
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Option 3: Public (may be rate-limited)
# SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Deployer Private Key (0x-prefixed, 64 hex chars)
# WARNING: Never commit this key. Use a test account only.
PRIVATE_KEY=0xYourPrivateKeyHere64HexCharacters
```

## Chain Details

- **Chain ID**: `11155111`
- **Network Name**: Ethereum Sepolia
- **Currency**: ETH (testnet)

## Deployment Steps

1. **Set environment variables** (see above)

2. **Compile contracts**:
   ```bash
   cd protocol
   npm run build
   ```

3. **Deploy to Sepolia**:
   ```bash
   npm run deploy:sepolia
   ```

   This deploys:
   - `VPOOracleChainlink`
   - `MarketFactory`

4. **Create a sample market** (optional):
   ```bash
   # Set additional env vars:
   export FACTORY=0xDeployedFactoryAddress
   export COLLATERAL=0xERC20TokenAddress  # e.g., USDC on Sepolia
   export QUESTION="Will BTC close above $100k on Dec 31?"
   export ENDTIME=1735689600  # Unix timestamp
   export FEE_BPS=100  # Optional, default 0

   # Run:
   npx hardhat run scripts/createMarket.ts --network sepolia
   ```

## Example Values

For quick testing:

```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0xYourTestPrivateKey
```

**Note**: Replace `YOUR_INFURA_PROJECT_ID`, `YOUR_ALCHEMY_API_KEY`, or `YourTestPrivateKey` with actual values. Never commit your private key.


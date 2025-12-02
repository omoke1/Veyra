# Deploy VPOOracleRelayer and Updated MarketFactory

This guide covers deploying the VPOOracleRelayer and the updated MarketFactory (with `createMarketWithOracle`) to both Sepolia and Base Sepolia networks.

## Prerequisites

1. **Get testnet ETH**: You'll need Sepolia ETH and Base Sepolia ETH for gas fees
2. **Set up environment variables** (see below)

## Environment Variables

Create a `.env` file in the `protocol/` directory with the following:

```env
# Sepolia Testnet Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
# OR
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
# OR (public, may be rate-limited)
# SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Base Sepolia Testnet Configuration
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# OR
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Deployer Private Key (0x-prefixed, 64 hex chars)
# WARNING: Never commit this key. Use a test account only.
PRIVATE_KEY=0xYourPrivateKeyHere64HexCharacters
```

## Deployment

### Deploy to Sepolia

```bash
cd protocol
pnpm hardhat run scripts/deploy-relayer-and-factory.ts --network sepolia
```

This will deploy:
- `VPOOracleRelayer` - Oracle that accepts EIP-712 signed attestations
- `VPOOracleChainlink` - Chainlink-based oracle (if not already deployed)
- `MarketFactory` - Updated factory with `createMarketWithOracle` function

### Deploy to Base Sepolia

```bash
cd protocol
pnpm hardhat run scripts/deploy-relayer-and-factory.ts --network baseSepolia
```

## What Gets Deployed

### VPOOracleRelayer
- Accepts EIP-712 signed attestations from off-chain relayers
- Supports multiple authorized signers
- Includes replay protection via nonces
- Supports expiry handling

### MarketFactory (Updated)
- Includes `createMarketWithOracle` function
- Allows creating markets with a specific oracle address
- Default oracle can be set via constructor or `setOracle`
- `createMarket` now calls `createMarketWithOracle` internally

## Deployment Output

After deployment, you'll get:
- Contract addresses printed to console
- Deployment info saved to:
  - `deployments/sepolia.json` (or `base-sepolia.json`)
  - `deployments/sepolia-relayer.json` (or `base-sepolia-relayer.json`)

## Post-Deployment Steps

### 1. Authorize Relayer Signers

After deploying the relayer, authorize signers:

```typescript
// Using ethers.js
const relayer = await ethers.getContractAt("VPOOracleRelayer", relayerAddress);
await relayer.setSigner(signerAddress, true);
```

### 2. Update Relayer Service Configuration

Update `relayer/.env` with:

```env
RPC_URL=<SEPOLIA_RPC_URL or BASE_SEPOLIA_RPC_URL>
RELAYER_CONTRACT=<deployed_relayer_address>
CHAIN_ID=<11155111 for Sepolia or 84532 for Base Sepolia>
PRIVATE_KEY=<signer_private_key>
```

### 3. Create Markets with Different Oracles

You can now create markets using either oracle:

```typescript
// Using default Chainlink oracle
const [market, vault] = await factory.createMarket(
  collateralAddress,
  "Will BTC close above $100k?",
  endTime,
  0 // feeBps
);

// Using the Relayer oracle
const [market2, vault2] = await factory.createMarketWithOracle(
  collateralAddress,
  "Will ETH reach $5000?",
  endTime,
  0, // feeBps
  relayerAddress // specific oracle
);
```

## Verification

After deployment, verify contracts on block explorers:

**Sepolia:**
- Etherscan: https://sepolia.etherscan.io/address/{contractAddress}

**Base Sepolia:**
- Basescan: https://sepolia.basescan.org/address/{contractAddress}

## Troubleshooting

### "Empty string for network or forking URL"
- Make sure `SEPOLIA_RPC_URL` or `BASE_SEPOLIA_RPC_URL` is set in `.env`

### "No signers available"
- Make sure `PRIVATE_KEY` is set in `.env`
- Private key should be 0x-prefixed and 64 hex characters

### "Low balance" warning
- Get testnet ETH from faucets:
  - Sepolia: https://sepoliafaucet.com/
  - Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet








# Sepolia Deployment Guide

## Prerequisites

1. **Get Sepolia ETH**: You'll need Sepolia ETH for gas fees (get from a faucet)
2. **Set up EigenLayer contract addresses**: Configure EigenLayer official contract addresses (see EigenLayer Setup below)
3. **Set up environment variables** (see below)

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

# EigenLayer Contract Addresses (optional - will be loaded from deployments/eigenlayer-sepolia.json)
# EIGENLAYER_DELEGATION_MANAGER=0x...
# EIGENLAYER_ALLOCATION_MANAGER=0x...
# EIGENLAYER_SLASHING_COORDINATOR=0x...
# EIGENLAYER_EIGENVERIFY=0x...  # Optional - may not be available on Sepolia
```

## Chain Details

- **Chain ID**: `11155111`
- **Network Name**: Ethereum Sepolia
- **Currency**: ETH (testnet)

## EigenLayer Setup

Before deploying, you need to configure EigenLayer contract addresses:

1. **Get EigenLayer contract addresses**:
   - Visit: https://github.com/Layr-Labs/eigenlayer-contracts#deployments
   - Find Sepolia testnet addresses for:
     - `DelegationManager`
     - `AllocationManager`
     - `SlashingCoordinator`
     - `EigenVerify` (optional - may not be available)

2. **Update EigenLayer config**:
   - Edit `deployments/eigenlayer-sepolia.json`
   - Replace placeholder addresses (`0x0000...`) with actual EigenLayer contract addresses
   - See `EIGENLAYER_SETUP.md` for detailed instructions

## Deployment Steps

1. **Set environment variables** (see above)

2. **Configure EigenLayer addresses** (see EigenLayer Setup above)

3. **Compile contracts**:
   ```bash
   cd protocol
   npm run build
   ```

4. **Deploy to Sepolia**:
   ```bash
   npm run deploy:sepolia
   ```

   This deploys:
   - `VPOOracleChainlink` - Oracle for market resolution
   - `MarketFactory` - Factory for creating prediction markets
   - `VeyraOracleAVS` - AVS contract using EigenLayer infrastructure
   
   **Note**: Custom `EigenVerify` and `Slashing` contracts are no longer deployed.
   The system now uses EigenLayer's official contracts.
   
   Deployment addresses will be saved to `deployments/sepolia.json`

5. **Register AVS on EigenLayer**:
   ```bash
   npx hardhat run scripts/register-avs-eigenlayer.ts --network sepolia
   ```
   
   This registers `VeyraOracleAVS` as an official AVS on EigenLayer and sets the AVS ID.

6. **Verify contracts on Etherscan** (recommended):
   ```bash
   npx hardhat run scripts/verify.ts --network sepolia
   ```
   Then copy and run the verification commands shown in the output.

7. **Operator Onboarding**:
   - Operators must register themselves on EigenLayer
   - Operators must opt-in to the VeyraOracleAVS AVS
   - Operator stakes come from EigenLayer's DelegationManager
   - See EigenLayer operator documentation for details

8. **Create a test market** (optional):
   ```bash
   # Set additional env vars:
   export FACTORY=0xDeployedFactoryAddress  # From deployments/sepolia.json
   export COLLATERAL=0xERC20TokenAddress  # e.g., USDC on Sepolia
   export QUESTION="Will BTC close above $100k on Dec 31?"
   export ENDTIME=1735689600  # Unix timestamp
   export FEE_BPS=0  # Optional, default 0

   # Run:
   npx hardhat run scripts/createMarket.ts --network sepolia
   ```

## Post-Deployment

After deployment, you'll have:
- Deployment addresses in `deployments/sepolia.json`
- Contract addresses for integration with the frontend
- Verified contracts on Etherscan (after verification step)

**Note**: Replace `YOUR_INFURA_PROJECT_ID`, `YOUR_ALCHEMY_API_KEY`, or `YourTestPrivateKey` with actual values. Never commit your private key.


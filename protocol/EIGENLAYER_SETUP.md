# EigenLayer Integration Setup

This document describes how to set up EigenLayer contracts for integration.

## Contract Addresses

Update the addresses in `deployments/eigenlayer-sepolia.json` with official EigenLayer contract addresses from:
- GitHub: https://github.com/Layr-Labs/eigenlayer-contracts#deployments
- Documentation: https://docs.eigencloud.xyz/products/eigenlayer/developers/concepts/eigenlayer-contracts/core-contracts

## Required Contracts

1. **DelegationManager**: Manages operator delegations and stake
2. **AllocationManager**: Manages AVS registrations (replaces deprecated AVSDirectory)
3. **SlashingCoordinator**: Coordinates slashing operations
4. **EigenVerify**: Official verification service (may not be available on Sepolia)

## Interface Files

Interface files have been created in `contracts/interfaces/`:
- `IDelegationManager.sol`
- `IAllocationManager.sol`
- `ISlashingCoordinator.sol`
- `IEigenVerify.sol` (updated)

These interfaces should be verified against the official EigenLayer contracts repository and updated if there are differences.

## Installation Options

### Option 1: Git Submodule (Recommended)
```bash
cd protocol
git submodule add https://github.com/Layr-Labs/eigenlayer-contracts.git libs/eigenlayer-contracts
```

Then update imports in contracts to reference:
```solidity
import {IDelegationManager} from "../libs/eigenlayer-contracts/contracts/interfaces/IDelegationManager.sol";
```

### Option 2: Direct Import from GitHub
Update Hardhat config to allow importing from GitHub URLs (requires additional setup).

### Option 3: Manual Interface Files
The interface files in `contracts/interfaces/` can be used directly. Ensure they match the official contracts.

## Environment Variables

Add to `.env`:
```
EIGENLAYER_DELEGATION_MANAGER=0x...
EIGENLAYER_ALLOCATION_MANAGER=0x...
EIGENLAYER_SLASHING_COORDINATOR=0x...
EIGENLAYER_EIGENVERIFY=0x...  # If available
```

## Next Steps

1. Update contract addresses in `deployments/eigenlayer-sepolia.json`
2. Verify interface files match official contracts
3. Update `VeyraOracleAVS.sol` to use EigenLayer contracts
4. Test integration on Sepolia testnet



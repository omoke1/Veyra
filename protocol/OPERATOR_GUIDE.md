# Operator Opt-In Guide for VeyraOracleAVS

This guide explains how operators opt-in to participate in the VeyraOracleAVS on EigenLayer.

## Overview

Operators must complete two main steps:
1. **Register as an EigenLayer Operator** (one-time setup)
2. **Opt-in to VeyraOracleAVS** (per AVS)

## Step 1: Register as EigenLayer Operator

Before opting into any AVS, you must first register as an operator on EigenLayer:

### Requirements:
- Ethereum validator or restaker
- Sufficient ETH for gas fees
- Operator infrastructure (server, keys, etc.)

### Registration Process:

1. **Install EigenLayer CLI**:
   ```bash
   # See: https://github.com/Layr-Labs/eigenlayer-cli
   npm install -g @eigenlayer/cli
   ```

2. **Configure Operator**:
   - Create `operator.yaml` configuration file
   - Set up metadata and RPC endpoints
   - Fund your operator wallet

3. **Register Operator**:
   ```bash
   eigenlayer operator register
   ```

4. **Verify Registration**:
   - Check on EigenLayer dashboard: https://app.eigenlayer.xyz
   - Or query on-chain: `DelegationManager.isOperator(operatorAddress)`

**Full Documentation**: https://docs.eigenlayer.xyz/operators/howto/operator-installation

## Step 2: Opt-In to VeyraOracleAVS

Once registered as an operator, you can opt-in to VeyraOracleAVS.

### Prerequisites:
- ✅ Registered as EigenLayer operator
- ✅ VeyraOracleAVS deployed and registered as AVS
- ✅ AVS ID known (from `VeyraOracleAVS.avsId()`)

### Method 1: Using EigenLayer Dashboard (Recommended)

1. Visit EigenLayer Dashboard: https://app.eigenlayer.xyz
2. Connect your operator wallet
3. Navigate to "AVSs" section
4. Find "VeyraOracleAVS" in the list
5. Click "Opt-In" or "Register"
6. Confirm the transaction

### Method 2: Using EigenLayer CLI

```bash
# Opt-in to AVS using CLI
eigenlayer operator opt-in-to-avs <AVS_ID>
```

### Method 3: Direct Contract Call

If you have the AVS ID, you can call the contract directly:

```solidity
// From operator account
AllocationManager.optInToAVS(avsId);
```

Or using our helper script:

```bash
# Set operator private key in .env
OPERATOR_PRIVATE_KEY=0x...

# Run opt-in script
npx hardhat run scripts/operator-opt-in.ts --network sepolia
```

### Method 4: Programmatic (Using Script)

We provide a helper script at `scripts/operator-opt-in.ts`:

```bash
# 1. Set environment variables in .env:
OPERATOR_PRIVATE_KEY=0xYourOperatorPrivateKey
SEPOLIA_RPC_URL=https://...

# 2. Run the script:
npx hardhat run scripts/operator-opt-in.ts --network sepolia
```

The script will:
- Check if operator is registered on EigenLayer
- Check operator stake
- Attempt to opt-in to VeyraOracleAVS
- Verify the opt-in was successful

## Verification

After opting in, verify your registration:

### On-Chain Check:
```solidity
// Query if operator is registered
bool isRegistered = AllocationManager.isOperatorRegisteredToAVS(
    operatorAddress,
    avsId
);

// Check operator stake
uint256 stake = DelegationManager.operatorShares(
    operatorAddress,
    veyraOracleAVSAddress
);
```

### Using Our Contract:
```solidity
// Check via VeyraOracleAVS
bool isRegistered = VeyraOracleAVS.isOperatorRegistered(operatorAddress);
uint256 totalWeight = VeyraOracleAVS.getTotalOperatorWeight();
```

### Using Script:
```bash
# Check operator status
npx hardhat run scripts/check-operator-status.ts --network sepolia
```

## How It Works Technically

1. **AVS Registration**: 
   - VeyraOracleAVS is registered on EigenLayer via `AllocationManager.registerAVS()`
   - This returns an `avsId` (bytes32)
   - The AVS ID is stored in `VeyraOracleAVS.avsId`

2. **Operator Opt-In**:
   - Operator calls `AllocationManager.optInToAVS(avsId)`
   - This registers the operator with the AVS
   - Operator's stake becomes available for quorum calculations

3. **Stake Delegation**:
   - Operators (or restakers delegating to them) must have stake
   - Stake is tracked via `DelegationManager.operatorShares(operator, avsAddress)`
   - This stake determines the operator's weight in quorum consensus

4. **Participation**:
   - Once opted-in, operators can submit attestations
   - `VeyraOracleAVS.submitAttestation()` checks:
     - Operator is registered via `AllocationManager.isOperatorRegisteredToAVS()`
     - Operator has stake via `DelegationManager.operatorShares()`

## Important Notes

1. **Stake Requirement**: Operators need stake delegated to participate. Zero stake = cannot submit attestations.

2. **Slashing Risk**: Opting into an AVS subjects your stake to slashing conditions. Understand the risks.

3. **Opt-Out**: Operators can opt-out at any time via `AllocationManager.optOutOfAVS(avsId)`

4. **Multiple AVSs**: Operators can opt-in to multiple AVSs simultaneously.

5. **Delegation**: Restakers can delegate to operators who have opted into VeyraOracleAVS, and their stake will count toward quorum.

## Troubleshooting

### "Operator not registered on EigenLayer"
- Complete Step 1: Register as EigenLayer operator first
- Verify: `DelegationManager.isOperator(operatorAddress)`

### "Operator has no stake"
- Delegate stake to your operator via EigenLayer
- Or have restakers delegate to you
- Verify: `DelegationManager.operatorShares(operator, avsAddress) > 0`

### "AVS not found"
- Ensure VeyraOracleAVS is registered: `VeyraOracleAVS.avsId() != 0x0`
- Run `register-avs-eigenlayer.ts` if not registered

### "Already opted in"
- Check: `AllocationManager.isOperatorRegisteredToAVS(operator, avsId)`
- If true, you're already registered and can proceed

## Next Steps After Opt-In

1. **Run AVS Node Service**:
   ```bash
   cd avs
   npm start
   ```

2. **Monitor Events**: The service will listen for `VerificationRequested` events

3. **Submit Attestations**: When requests arrive, the service will:
   - Fetch data
   - Compute outcome
   - Generate proof
   - Submit attestation

4. **Monitor Quorum**: Track quorum status via `VeyraOracleAVS.getQuorumStatus(requestId)`

## Resources

- EigenLayer Operator Docs: https://docs.eigenlayer.xyz/operators
- EigenLayer CLI: https://github.com/Layr-Labs/eigenlayer-cli
- EigenLayer Dashboard: https://app.eigenlayer.xyz
- VeyraOracleAVS Contract: Check `deployments/sepolia.json` for address



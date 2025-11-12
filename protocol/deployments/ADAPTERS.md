# Phase 3 Adapter Deployments

## Sepolia Testnet

### UMAAdapter
- **Address**: `0x1529a4eA084bf94729C8a403CAb3D136516D705c`
- **VPOAdapter**: `0xF260b47178D5345A06039DaEd8c27cB68a0639d1`
- **UMA Oracle**: `0xA0aE660944944Ee6D4C27B4BBb4a3B64e5D8b0d1` (Mainnet address)
- **Deployed**: 2025-11-12T05:14:11.913Z
- **Etherscan**: https://sepolia.etherscan.io/address/0x1529a4eA084bf94729C8a403CAb3D136516D705c

### GnosisAdapter
- **Address**: `0xd28869739586024B7efB3e6247A35D0729fc6A27`
- **VPOAdapter**: `0xF260b47178D5345A06039DaEd8c27cB68a0639d1`
- **ConditionalTokens**: `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` (Mainnet address)
- **Deployed**: 2025-11-12T05:14:11.913Z
- **Etherscan**: https://sepolia.etherscan.io/address/0xd28869739586024B7efB3e6247A35D0729fc6A27

## Usage

### UMAAdapter
1. Monitor UMA Optimistic Oracle for new assertions
2. Call `handleAssertion(assertionId, claim, data)` to create VPOAdapter request
3. Wait for VPOAdapter fulfillment
4. Call `submitOutcomeToUMA(requestId, claim, liveness, currency, bond, identifier)` to submit outcome

### GnosisAdapter
1. Monitor Gnosis Conditional Tokens for new conditions
2. Call `handleCondition(conditionId, questionId, outcomeSlotCount, data)` to create VPOAdapter request
3. Wait for VPOAdapter fulfillment
4. Call `resolveCondition(requestId, outcomeSlotCount)` to report payouts

## Bridge Service Configuration

Update `bridge/.env` with:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
VPO_ADAPTER_ADDRESS=0xF260b47178D5345A06039DaEd8c27cB68a0639d1
UMA_ADAPTER_ADDRESS=0x1529a4eA084bf94729C8a403CAb3D136516D705c
GNOSIS_ADAPTER_ADDRESS=0xd28869739586024B7efB3e6247A35D0729fc6A27
UMA_ORACLE_ADDRESS=0xA0aE660944944Ee6D4C27B4BBb4a3B64e5D8b0d1
GNOSIS_CONDITIONAL_TOKENS=0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
BRIDGE_PRIVATE_KEY=0x...
```

## Next Steps

1. ✅ Deploy adapters to Sepolia
2. ✅ Configure bridge service with adapter addresses
3. ⏳ Test end-to-end flow with real UMA/Gnosis markets
4. ⏳ Update indexer to track adapter events
5. ⏳ Update frontend to display external markets


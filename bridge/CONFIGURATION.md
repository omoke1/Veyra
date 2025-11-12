# Bridge Service Configuration Summary

## ✅ Configuration Complete

The bridge service has been configured with all deployed adapter addresses.

### Deployed Addresses (Sepolia)

| Component | Address |
|-----------|---------|
| VPOAdapter | `0xF260b47178D5345A06039DaEd8c27cB68a0639d1` |
| UMAAdapter | `0x1529a4eA084bf94729C8a403CAb3D136516D705c` |
| GnosisAdapter | `0xd28869739586024B7efB3e6247A35D0729fc6A27` |
| UMA Oracle | `0xA0aE660944944Ee6D4C27B4BBb4a3B64e5D8b0d1` |
| Gnosis ConditionalTokens | `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` |

### Configuration Files

- ✅ `.env` - Created with all required addresses
- ✅ `setup-env.js` - Helper script to recreate .env
- ✅ `verify-config.js` - Configuration validation script

## ⚠️ Important: Admin Access

The bridge service needs admin access to the adapters to call:
- `UMAAdapter.handleAssertion()` and `submitOutcomeToUMA()`
- `GnosisAdapter.handleCondition()` and `resolveCondition()`

### Current Status

The adapters were deployed with the deployer (`0x29DC76fb853b321b4e4e9e09d89290A7D8E32584`) as admin.

The bridge service uses the wallet from `BRIDGE_PRIVATE_KEY` (`0x29DC76fb853b321b4e4e9e09d89290A7D8E32584` - same as deployer).

**✅ No action needed** - The bridge wallet is already the admin.

### If Using Different Bridge Wallet

If you want to use a different wallet for the bridge service:

1. Update `BRIDGE_PRIVATE_KEY` in `.env`
2. Transfer admin role to the new bridge wallet:
   ```bash
   # On UMAAdapter
   umaAdapter.setAdmin(bridgeWalletAddress)
   
   # On GnosisAdapter  
   gnosisAdapter.setAdmin(bridgeWalletAddress)
   ```

## Verification

Run the verification script to check configuration:

```bash
node verify-config.js
```

Expected output:
```
✅ Configuration is valid! Ready to start bridge service.
```

## Starting the Bridge Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Monitoring

The bridge service will:
- 🔍 Monitor UMA Optimistic Oracle for new assertions
- 🔍 Monitor Gnosis Conditional Tokens for new conditions
- 🔍 Poll Polymarket Subgraph for markets ready for resolution
- 📋 Create VPOAdapter verification requests
- ✅ Submit outcomes back to external platforms

## Next Steps

1. ✅ Configuration complete
2. ⏳ Start bridge service: `npm run dev`
3. ⏳ Monitor logs for activity
4. ⏳ Test with real UMA/Gnosis markets
5. ⏳ Add Polymarket API credentials (optional)


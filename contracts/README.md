# Vyro Prediction Oracle (VPO) — Contracts

Phase 1 (Ethereum Sepolia) contracts implemented with Solidity 0.8.26 using Foundry.

## Architecture (Phase 1)
- interfaces/`IVPOOracle.sol`: Oracle interface (requestResolve, getResult, events).
- oracle/`VPOOracleChainlink.sol`: Stores attested result + metadata; admin-controlled `fulfillResult`.
- market/`MarketFactory.sol`: Deploys `Market` + `Vault`, wires oracle, fees, and emits `MarketDeployed`.
- market/`Market.sol`: Binary market lifecycle with 1:1 shares and flat fee buy/sell.
- market/`Vault.sol`: Escrows ERC20 collateral per user; controlled by its `Market`.
- libs/`PayoutCalculator.sol`: Pure library for binary payout computation.
- security/`Errors.sol`: Central custom errors.
- access/`Roles.sol`: Role identifiers (reserved for future access control).

## Trading Model (Phase 1)
- 1:1 shares: During Trading, 1 collateral unit mints 1 share (long or short).
- Flat fee: Each buy/sell charges a fixed fee in collateral units (e.g., $0.50 in USDC = 500000 if 6 decimals).
- Close & Resolve: After `endTime`, trading closes; oracle resolution finalizes the outcome.
- Redeem: Winning side redeems 1:1; losing side redeems 0.

Notes:
- Price discovery is not implemented (no AMM/CPMM) in Phase 1 by design; this is a simple escrowed binary market for end-to-end integration.

## Fees
- `MarketFactory` holds `feeRecipient` and `flatFee` (in collateral decimals).
- New markets receive these defaults on creation.
- `Market` exposes `updateFlatFee` and `updateFeeRecipient` (factory-only) for reconfiguration.

## Setup
1) Install Foundry:
```
curl -L https://foundry.paradigm.xyz | powershell
foundryup
```
2) Install dependencies (OpenZeppelin):
```
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```
3) Build:
```
forge build
```

## Deployment (example)
- Constructor params (factory): `admin`, `oracle`, `feeRecipient`, `flatFee`.
- For USDC (6 decimals), $0.50 => `flatFee = 500000`.
- Create market via factory:
  - `collateral`: ERC20 address (e.g., USDC on Sepolia)
  - `question`: string
  - `endTime`: unix timestamp
  - `feeBps`: reserved (set 0 for Phase 1)

## Security
- CEI, nonReentrant on state-changing paths, pull-based redemptions.
- Role-gated admin at factory; pausable hooks reserved.
- Oracle result consumed via interface, validated for binary outcomes.

## Next Steps (Phase 2)
- Add relayer-based oracle (`VPOOracleRelayer`) with ECDSA/EIP-712 verification.
- Extend dApp and indexer to show attestation metadata and provider selection.

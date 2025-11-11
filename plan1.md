VPO (Verifiable Prediction Oracle) — MVP Implementation Plan
Reference: [Veyra — Full Documentation](https://docs.google.com/document/d/1-9-Bt4O5jqUq9FjLN9m2sMLma_fSzVCEQlhJN4VP5Ig/edit?tab=t.0)

Scope & Phasing
Phase 1 (Ethereum Sepolia):
Solidity 0.8.26 + Foundry
Oracle via Chainlink Functions (attested result + metadata)
Prediction market contracts, settlement via VPO oracle
Minimal Indexer (read-only) and dApp with Landing + Dashboard
Phase 2 (Base Sepolia):
Replace/augment oracle with custom relayer (attestation + proof verification)
Same market surfaces; reuse dApp with switchable oracle provider
Success Criteria
Public landing page communicates value prop; links to dashboard
Dashboard lists markets and shows positions; trading and redemption flows work
Create, fund, and trade in a market; resolve via VPO oracle; payouts correct
Deterministic settlement against attested data; chain-specific configs
All critical paths covered by tests (unit + invariant + e2e script)
Auditor sign-off (no high/critical)
Architecture Overview
Contracts (OOP-first, SRP, composition over inheritance):
IVPOOracle interface; implementations VPOOracleChainlink, VPOOracleRelayer
MarketFactory creates Market proxies (minimal proxy/clone)
Market holds collateral, resolution params, and settlement logic (CEI)
Vault escrow per market; PayoutCalculator pure lib
Access: Roles (ADMIN, ORACLE_MANAGER, MARKET_MANAGER)
Security: ReentrancyGuard, Pausable, role-gated admin functions
Off-chain (Phase 2):
relayer service: source integration, signing, on-chain submit
Verification scheme: EIP-712 or ECDSA attestation with replay protection
Indexer:
Lightweight listener using ethers.js + SQLite/PG for markets, positions, resolutions
dApp (Next.js/React/TypeScript):
shadcn + Tailwind UI components in components/ui and feature modules (per your structure) [[Frontend follows shadcn structure]]
High-level Task Breakdown
Phase 1 — Ethereum Sepolia + Chainlink Functions
0) Web App (Landing + Dashboard)

Landing page (marketing): hero, problem/solution, how VPO works, CTA to dashboard
Dashboard (UI-first): markets list, market detail, positions, redeem panel, status; start with mocked data, wire to indexer later
1) Contracts

Define IVPOOracle (requestResolve, getResult, events)
Implement VPOOracleChainlink integrating Chainlink Functions
Implement MarketFactory + clone pattern; Market with:
Create markets (question, endTime, resolver, fee)
Buy/Sell shares, fee accrual, close trading at endTime
Resolve: pull result from oracle, finalize, enable redeem
Redeem payouts based on PayoutCalculator
Role management, pausability, reentrancy guards
Events for indexer
2) Tests (Foundry)

Unit: oracles, market math, access controls
Invariant: collateral conservation, no reentrancy payout drains
Fork/Integration: simulate Chainlink Functions fulfillment
3) Tooling

Chain configs (Sepolia RPC, chainlink ids), deploy scripts (Foundry)
Env management; deterministic deployments
4) Indexer (minimal)

Listen to MarketFactory, Market, Oracle events; store to SQLite
Simple REST/Graph for dApp queries
5) dApp (wire-up minimal trading)

Replace dashboard mocks with live indexer data
Trading flows: buy/sell, wallet connect, network switch to Sepolia, oracle provider config
View positions, resolve status, redeem
Phase 2 — Base Sepolia + Custom Relayer
1) Oracle Relayer Path

Define attestation schema (marketId, questionHash, outcome, sourceId, expiresAt, nonce)
Off-chain service fetches source data, signs payload, submits to chain via VPOOracleRelayer
On-chain verification: ECDSA/EIP-712 domain sep, replay protection, expiry
2) Contracts

Implement VPOOracleRelayer with verifier library and admin key rotation
Extend Market to accept either oracle impl via interface
3) Tests

Fuzz: signature malleability, replay, expiry, wrong domain
Economic: delayed resolution, fee distribution
4) dApp updates

Switchable oracle provider (Chainlink vs Relayer) via config
Display attestation metadata/source
5) Indexer updates

Track attestation proofs and signer set changes
File/Directory Structure (concise)
contracts/
interfaces/IVPOOracle.sol
oracle/VPOOracleChainlink.sol
oracle/VPOOracleRelayer.sol
market/MarketFactory.sol
market/Market.sol
market/Vault.sol
libs/PayoutCalculator.sol
access/Roles.sol
security/Errors.sol
script/ (Foundry deploy & config)
test/ (unit, invariant, integration)
relayer/ (Phase 2)
src/ service (TypeScript/Node), attest/, verifier/
indexer/ minimal API (TypeScript/Node with SQLite)
apps/web/ Next.js + shadcn + Tailwind (TypeScript)
app/(marketing)/page.tsx (Landing)
app/dashboard/page.tsx (Dashboard)
components/ui/* (shadcn components)
features/markets/* (slices: list, detail, trade, positions)
Security & Best Practices
Use CEI pattern; nonReentrant modifiers; pull over push payouts
Role-gated admin actions; emergency pause; signer rotation for relayer
Strict input validation; market immutables; time-based checks with grace period
Oracle response validation and bounded gas in callbacks
Extensive tests; static analysis (slither), linters, npm audit for Node services
Checkpoints & Reviews
Checkpoint A: Landing + Dashboard UI ready with mocks
Checkpoint B: Contracts API frozen (interfaces + events)
Checkpoint C: Chainlink oracle happy-path end-to-end on Sepolia wired to dashboard
Checkpoint D: Auditor review before Phase 2
Checkpoint E: Relayer e2e on Base Sepolia + replay/expiry tests passing
Deliverables
Public landing page + dashboard URL
Deployed contracts on Sepolia and Base (addresses + ABIs)
Relayer service (Dockerized) with config
Minimal indexer + REST endpoints
Minimal dApp with core flows
Docs: README, runbooks, env samples


Phase 1: Foundation
Month 1–2
- Write smart contract for VPO Adapter - Deploy initial AVS node on EigenCloud - Integrate with test prediction market
Phase 2: Proof System
Month 3–4
- Add attestation signing and IPFS integration - Create public dashboard to verify results
Phase 3: Integrations
Month 5–6
- Integrate with UMA Optimistic Oracle (Polymarket) - Integrate with Gnosis Conditional Tokens
Phase 4: Incentives & Reputation
Month 7–8
- Add staking + slashing mechanism for AVS nodes - Reward correct outcome reporters
Phase 5: Governance & Expansion
Month 9–12
- Launch DAO for parameter updates - Partner with AI oracles, economic datasets, and data providers
Phase 6: Multi-chain Support
Month 12+
- Deploy adapters on L2s (Arbitrum, Optimism, Base) - Cross-chain proof validation via EigenLayer restaking



 Architectural Structure (Diagram + Explanation)
Here’s a simple architecture flow of how everything connects:

VPO System Architecture
                   ┌──────────────────────────────────┐
                    │       Prediction Market           │
                    │ (e.g. Polymarket, Gnosis)         │
                    └──────────────┬────────────────────┘
                                   │
                                   │ Market points to VPO Adapter
                                   ▼
                      ┌────────────────────────────┐
                      │      VPO Adapter Contract   │
                      │  (Deployed on-chain)        │
                      └──────────────┬──────────────┘
                                     │ Sends task request
                                     ▼
                       ┌────────────────────────────┐
                       │   EigenCloud AVS Cluster   │
                       │ (Verifiable Computation)   │
                       └──────────────┬─────────────┘
                                      │
                                      │ Fetches data, computes outcome
                                      ▼
                     ┌────────────────────────────────┐
                     │   Attestation Generator         │
                     │ (creates proof + signs result)  │
                     └──────────────┬─────────────────┘
                                    │
                                    │ Publishes to IPFS/Chain
                                    ▼
                     ┌────────────────────────────────┐
                     │     IPFS / On-Chain Storage     │
                     │ (contains result + metadata)    │
                     └──────────────┬─────────────────┘
                                    │
                                    ▼
                     ┌────────────────────────────────┐
                     │   Market Oracle Integration     │
                     │ (UMA / Gnosis Conditional Token)│
                     └────────────────────────────────┘

 Architecture Explained
Component
Role
Prediction Market
The external platform (e.g. Polymarket or Gnosis) where users place bets or predictions.
VPO Adapter Contract
A lightweight bridge contract that receives event requests from markets and sends verification tasks to EigenCloud.
EigenCloud AVS
The decentralized compute network that actually performs the data gathering, aggregation, and computation.
Attestation Generator
A component that signs the result (off-chain) and uploads the verifiable proof to IPFS.
IPFS / On-Chain Storage
Stores the result publicly for anyone to verify later.
Market Oracle Integration
Sends the verified result back to the prediction market to close or settle the market.


Technical Flow Example
Here’s what happens technically (but explained simply):
A prediction market calls:

 requestVerification(event_id, data_source, timestamp)


The VPO Adapter logs this request and sends it to EigenCloud AVS.


The EigenCloud AVS does:


Fetches data (e.g., from trusted APIs or decentralized feeds)


Verifies consistency across multiple data sources


Calculates final outcome


Produces a digital attestation


The attestation is uploaded to IPFS:

 ipfs://Qmabc123... -> {
    "event": "BTC > 100K",
    "outcome": true,
    "sources": ["Binance", "Coinbase", "Kraken"],
    "timestamp": 1735689600,
    "proof": "0xabcde..."
}


The VPO Adapter retrieves and validates it, then calls back to the market’s oracle (UMA or Gnosis) to finalize:

 resolveMarket(event_id, true)
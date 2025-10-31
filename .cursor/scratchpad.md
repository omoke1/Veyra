# Veyra (Verifiable Prediction Oracle) — Scratchpad

This file tracks the working spec, plan, and implementation notes for Veyra. Keep under version control for shared context across Planner → Executor → Auditor cycles.

## Background and Motivation
Veyra is a new kind of oracle designed to bring trust and accuracy to prediction markets. Unlike most oracles that depend on centralized data feeds or single data providers, Veyra uses verifiable processes — run on decentralized compute services — to determine event outcomes. Goal: make every prediction market outcome transparent, reproducible, and verifiable.

Can integrate with:
- Polymarket (via UMA Optimistic Oracle)
- Gnosis Prediction Markets (via Conditional Tokens)

## Reference Spec (Renamed to Veyra)

1) Overview
- Veyra introduces a verifiable outcome layer so anyone can confirm how a market’s result was computed, not just the result.

2) The Core Idea
- Today outcomes often depend on one data source or human reporters → bias, failures, delays, no independent confirmation.
- Veyra solves by making outcomes provably computed by decentralized verifiable processes.

3) How It Works (simplified)
- Prediction market creates question (e.g., “Will BTC close above $100K on Dec 31?”)
- Veyra Adapter (on-chain) receives a verification request from the market
- EigenCloud AVS performs data fetching/aggregation/computation
- Result publication: AVS produces a signed attestation + uploads proof to IPFS (or similar)
- On-chain verification: Adapter reads attestation, validates, and sends verified result to the market (UMA/Gnosis)
- Market resolution: market settles payouts

4) Architectural Structure
- Components and Roles:
  - Prediction Market: external venue (Polymarket/Gnosis)
  - Veyra Adapter Contract: on-chain bridge; receives event requests; sends verification tasks to AVS
  - EigenCloud AVS: decentralized compute network for data and computation
  - Attestation Generator: signs the outcome and packages proofs
  - IPFS / On-Chain Storage: stores result + metadata publicly
  - Market Oracle Integration: posts verified result to UMA/Gnosis

5) Technical Flow Example
- External market calls: 
equestVerification(event_id, data_source, timestamp)
- Adapter logs and forwards task to AVS
- AVS fetches data, cross-verifies, computes outcome, produces attestation
- Attestation uploaded to IPFS:
  - ipfs://Qmabc123... → {
    "event": "BTC > 100K",
    "outcome": true,
    "sources": ["Binance", "Coinbase", "Kraken"],
    "timestamp": 1735689600,
    "proof": "0xabcde..."
  }
- Adapter retrieves and validates, then finalizes via market’s oracle API (e.g., UMA or Gnosis): 
resolveMarket(event_id, true)

6) Roadmap (phases)
- Phase 1: Foundation
  - Write smart contract for Veyra Adapter
  - Deploy initial AVS node on EigenCloud
  - Integrate with a test prediction market
- Phase 2: Proof System
  - Add attestation signing and IPFS integration
  - Create public dashboard to verify results
- Phase 3: Integrations
  - Integrate with UMA Optimistic Oracle (Polymarket)
  - Integrate with Gnosis Conditional Tokens
- Phase 4: Incentives & Reputation
  - Add staking + slashing for AVS nodes
  - Reward correct outcome reporters
- Phase 5: Governance & Expansion
  - Launch DAO for parameter updates
  - Partner with AI oracles, economic datasets, data providers
- Phase 6: Multi-chain Support
  - Deploy adapters on L2s (Arbitrum, Optimism, Base)
  - Cross-chain proof validation via EigenLayer restaking

7) Why This Matters
- Most oracles focus on prices; prediction markets need truth of outcomes. Veyra ensures outcomes are provable, unbiased, and transparent.

8) Possible Future Extensions
- AI Prediction Models; Cross-Chain Predictions; Data Reputation Layer; Prediction-as-a-Service API

9) Example Use Cases
- Finance, Sports, Weather/Climate, Politics, AI Competitions

10) Summary
- What: a verifiable prediction oracle for transparent outcomes
- Why: eliminates blind trust in reporters/opaque oracles
- How: EigenCloud computes and verifies off-chain; proofs returned on-chain
- Where: between markets (Polymarket/Gnosis) and compute (EigenCloud)
- Vision: universal truth layer for any prediction

## Key Challenges and Analysis
- Interop: UMA/Gnosis require adapter semantics and callbacks that differ from our internal market flow
- Attestations: format, signer set management, replay/expiry protection
- Storage: IPFS CID handling on-chain (bytes multihash) and provenance
- Security: CEI, reentrancy, access control, bounded gas verification

## High-level Task Breakdown (Current Session Scope)
- Branding: rename references to Veyra in UI/README as we proceed
- Keep IVPOAdapter for future UMA/Gnosis integrations (no immediate impl changes)
- Phase 1: Keep internal IVPOOracle + VPOOracleChainlink for our markets
- Later: Implement Veyra Adapter that accepts external requests and posts to UMA/Gnosis

## Dashboard Plan (Planner)

### Objectives
- Provide a clear, real-time view of Veyra activity: markets, verification jobs, attestations, and on-chain settlements.
- Support two audiences: builders/operators (internal) and market participants (external read-only).
- Be modular, OOP-first, with strict separation of UI (View), UI logic (ViewModel), business logic (Managers), and navigation/state (Coordinator).

### Information Architecture (Next.js app router)
- Route: `app/dashboard/page.tsx` → re-export to `app/dashboard/veyra/page.tsx` (done).
- Sub-routes (planned):
  - `app/dashboard/markets/page.tsx` — list and inspect markets
  - `app/dashboard/jobs/page.tsx` — verification job queue/status
  - `app/dashboard/attestations/page.tsx` — attestation feed and details
  - `app/dashboard/nodes/page.tsx` — AVS nodes status (internal)
  - `app/dashboard/settings/page.tsx` — preferences, endpoints, keys (internal)

### Dashboard Home (Veyra)
- Hero KPIs
  - Active Markets, Pending Verifications, Successful Verifications (24h), Failed Verifications (24h)
  - Settlement Latency (p50/p95), Attestation Throughput (24h)
- Modules/Widgets
  - Recent Markets
    - Columns: Market, Category, Status (Open/Closed/Resolved), Deadline, Oracle Status
    - Actions: View, Inspect verification
  - Verification Jobs
    - Columns: Job ID, Market, Stage (Fetch/Compute/Sign/Publish), Runtime, Status
    - Actions: View logs (internal), Retry (internal, gated)
  - Attestations Feed
    - Columns: CID, Market, Outcome, Timestamp, Signers, On-chain Tx (if posted)
    - Actions: View JSON, Copy CID, Verify Signature
  - Network/Node Health (internal)
    - AVS node heartbeat, queue depth, error rate
  - Quick Actions
    - Create mock market (dev-only), Trigger test verification (dev-only)

### State & Architecture
- View: React components under `components/ui` (shadcn/Tailwind/TypeScript) per project convention.
- ViewModels (UI logic)
  - `DashboardKpiViewModel` — aggregates KPIs; pagination windows; refresh intervals
  - `MarketsListViewModel` — list state, filters, sorting, search
  - `JobsListViewModel` — queue polling, stage/status mapping
  - `AttestationsFeedViewModel` — stream/pagination, signature verify requests
  - All ViewModels expose immutable state snapshots and event methods; no side-effects in render.
- Managers (business logic)
  - `MarketsManager` — reads markets from API/contracts; mapping to UI DTOs
  - `VerificationManager` — job lifecycle, statuses, retries (internal only)
  - `AttestationManager` — fetch by CID, verify signatures, link to IPFS/on-chain
  - `TelemetryManager` — latency, error, throughput metrics
  - Managers are injected into ViewModels (constructor DI) to reduce coupling and allow testing.
- Coordinator (navigation/state flow)
  - `DashboardCoordinator` — handles route transitions between tabs, preserves filters in querystring, orchestrates ViewModels lifecycle.

### Data Contracts (TypeScript types)
- `MarketSummary` — id, title, category, status, deadline, oracleStatus
- `VerificationJob` — id, marketId, stage, startedAt, updatedAt, status, logsUrl?
- `Attestation` — cid, marketId, outcome, timestamp, signers[], signatureValid, txHash?
- `Kpis` — activeMarkets, pendingJobs, success24h, failed24h, p50LatencyMs, p95LatencyMs, attestations24h

### API/Integration Points (Phase 1 mocks → later wired)
- HTTP endpoints (internal API layer or mock service) for markets, jobs, attestations, kpis.
- On-chain (later): read-only RPC for adapter state; Ethers/viem wrappers behind Managers.
- IPFS gateway for attestation JSON fetch; signature verification performed client-side via `AttestationManager`.

### UX Patterns
- Loading: skeletons for tables/cards; optimistic KPI refresh every 10–15s.
- Empty states: helpful copy and quick links (e.g., “create sample market” in dev).
- Errors: toast + inline retry; persistent banner for API outage.
- Accessibility: keyboard navigation for tables, focus rings, aria labels.

### Security & Access Control
- Public read-only by default for markets and attestations.
- Internal operations (retry job, trigger test) gated behind dev flag or auth guard (future).
- Never expose secrets in client; Managers read from env-configured public endpoints only.

### Performance
- Cursor-based pagination for lists; row virtualization for large tables.
- Memoized selectors in ViewModels; request deduping in Managers.
- Split by route/tabs; component-level suspense.

### Telemetry
- Basic event logging for navigation, retries (internal), and verify actions.
- Metrics surfaced in `TelemetryManager` and shown on dashboard.

### Phase Deliverables
- Phase A (MVP)
  - Dashboard Home with KPIs, Recent Markets, Verification Jobs (read-only), Attestations Feed
  - ViewModels + Managers scaffolding and DI
  - Mock data providers wired to Managers
- Phase B
  - Node Health module, quick dev actions, querystring-preserved filters
  - Signature verification for attestations
- Phase C
  - Wire to real APIs/contracts; add pagination/virtualization; authentication for internal ops

### Success Criteria
- Build compiles with no lints; pages load under 2s locally.
- KPI numbers refresh live; lists support paging, sorting, and search.
- Attestation view can open JSON and verify signatures (when provided).
- Architecture passes Auditor review for separation of concerns and testability.

## Project Status Board (Executor)
- Landing + Dashboard: implemented minimal versions
- Contracts: IVPOOracle, VPOOracleChainlink, MarketFactory, Market, Vault, libs, errors present
- Tests: Foundry tests scaffolded; running pending Foundry install
- Deploy scripts: Foundry scripts for Sepolia added
- Adapter Interface: IVPOAdapter.sol present, impl deferred until integrations

## Executor's Feedback or Assistance Requests
- Confirm branding copy for landing/dashboard to “Veyra” across UI
- Confirm when to start UMA/Gnosis adapter implementation

## Security Review & Audit Notes (Auditor)
- To be filled during audit phase before external integrations

## Lessons
- Keep adapter and oracle roles separate to enable both internal markets and external integrations cleanly

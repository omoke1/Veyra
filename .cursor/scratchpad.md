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
- ✅ Landing + Dashboard: MVP complete with all 6 tabs, wallet integration, mobile responsive
- ✅ Contracts: IVPOOracle, VPOOracleChainlink, MarketFactory, Market, Vault, libs, errors present
- ✅ Architecture: ViewModels, Managers, Types all implemented with OOP-first design
- ⚠️ Tests: Foundry tests scaffolded; need execution and verification
- ⚠️ Deploy scripts: Foundry scripts for Sepolia added; need deployment
- ⚠️ Adapter Interface: IVPOAdapter.sol present, impl deferred until integrations
- ⚠️ Indexer: Basic API exists, needs wiring to dashboard

## Task List (Prioritized - Work through sequentially)

### Phase 1: Contract Testing & Deployment (Priority: HIGH)
**Goal:** Ensure smart contracts are production-ready and deployed to testnet

1. **Run Foundry Tests**
   - [ ] Execute all unit tests for Market contract
   - [ ] Execute all unit tests for MarketFactory contract
   - [ ] Execute all unit tests for Vault contract
   - [ ] Execute all unit tests for VPOOracleChainlink contract
   - [ ] Execute all unit tests for PayoutCalculator library
   - [ ] Verify access control tests (Roles.sol)
   - [ ] Check test coverage (aim for >80%)
   - [ ] Fix any failing tests

2. **Invariant & Integration Tests**
   - [ ] Write invariant tests for collateral conservation
   - [ ] Write reentrancy attack tests
   - [ ] Write fork tests for Chainlink Functions integration
   - [ ] Test end-to-end flow: create → trade → resolve → redeem

3. **Security Audit Preparation**
   - [ ] Run Slither static analysis
   - [ ] Review all access control modifiers
   - [ ] Verify CEI pattern compliance
   - [ ] Check for overflow/underflow risks
   - [ ] Review gas optimization opportunities
   - [ ] Document any known limitations

4. **Deployment to Sepolia**
   - [ ] Configure Sepolia RPC and chain configs
   - [ ] Prepare deployment script with all parameters
   - [ ] Deploy ERC20Mock for testing
   - [ ] Deploy VPOOracleChainlink
   - [ ] Deploy MarketFactory
   - [ ] Verify all contracts on Etherscan
   - [ ] Document deployed addresses in `.env.example` or config file
   - [ ] Test contract interactions via hardhat console

5. **Contract Verification**
   - [ ] Verify source code on Etherscan for all contracts
   - [ ] Test oracle resolution flow end-to-end
   - [ ] Verify market creation works
   - [ ] Verify trading (buy/sell) works
   - [ ] Verify redemption works after resolution

---

### Phase 2: Dashboard-to-Indexer Integration (Priority: HIGH)
**Goal:** Replace mock data with real contract data

6. **Create Next.js API Routes**
   - [ ] Create `/api/markets` endpoint (GET - list all markets)
   - [ ] Create `/api/markets/[address]` endpoint (GET - single market)
   - [ ] Create `/api/jobs` endpoint (GET - verification jobs)
   - [ ] Create `/api/attestations` endpoint (GET - attestations feed)
   - [ ] Create `/api/kpis` endpoint (GET - dashboard KPIs)
   - [ ] Create `/api/operators` endpoint (GET - operator registry)
   - [ ] Add error handling and validation to all endpoints
   - [ ] Add request/response type definitions

7. **Wire Managers to API**
   - [ ] Update `MarketsManager` to fetch from `/api/markets`
   - [ ] Update `VerificationManager` to fetch from `/api/jobs`
   - [ ] Update `AttestationManager` to fetch from `/api/attestations`
   - [ ] Update `TelemetryManager` to fetch from `/api/kpis`
   - [ ] Update `OperatorsManager` to fetch from `/api/operators`
   - [ ] Add loading states (return `null` while fetching)
   - [ ] Add error states and retry logic
   - [ ] Remove mock data fallbacks once API is stable

8. **Indexer API Completion**
   - [ ] Verify indexer event listeners are working
   - [ ] Add `/jobs` endpoint to indexer API
   - [ ] Add `/attestations` endpoint to indexer API
   - [ ] Add `/kpis` endpoint to indexer API (aggregate from database)
   - [ ] Add `/operators` endpoint to indexer API
   - [ ] Add database schema migrations if needed
   - [ ] Test data sync from contract events
   - [ ] Add health check endpoint with sync status

9. **Real-time Data Updates**
   - [ ] Add polling mechanism to ViewModels (every 10-15s for KPIs)
   - [ ] Add optimistic updates for user actions
   - [ ] Add WebSocket support (optional, future enhancement)
   - [ ] Add loading skeletons for all tables/cards
   - [ ] Add error banners for API failures

---

### Phase 3: Dashboard Enhancements (Priority: MEDIUM)
**Goal:** Improve UX and add missing features from Phase B

10. **Pagination & Virtualization**
    - [ ] Add pagination to Markets table (client-side first)
    - [ ] Add pagination to Proofs/Attestations table
    - [ ] Add pagination to Operators table
    - [ ] Add cursor-based pagination for large datasets (API-level)
    - [ ] Implement row virtualization for tables with 100+ rows
    - [ ] Add "Load More" or infinite scroll options

11. **Search & Filter Improvements**
    - [ ] Add URL query parameter persistence for filters
    - [ ] Add debounced search input
    - [ ] Add advanced filter panel (date range, status combinations)
    - [ ] Add filter reset button
    - [ ] Save filter preferences in localStorage
    - [ ] Add sorting options (by date, status, etc.)

12. **Signature Verification**
    - [ ] Implement actual ECDSA signature verification in `AttestationManager`
    - [ ] Use ethers.js for signature verification
    - [ ] Verify EIP-712 structured data signatures
    - [ ] Display verification status in UI (verified/invalid/unknown)
    - [ ] Add "Verify Signature" button functionality in proof details
    - [ ] Show signer addresses in attestation details

13. **IPFS Integration**
    - [ ] Add IPFS gateway URL configuration (e.g., `https://ipfs.io/ipfs/`)
    - [ ] Implement IPFS CID fetching in `AttestationManager`
    - [ ] Add "View on IPFS" button that opens IPFS gateway
    - [ ] Display JSON content in proof details dialog
    - [ ] Add error handling for IPFS gateway failures
    - [ ] Add loading state for IPFS fetches

14. **Performance Optimization**
    - [ ] Add React.memo to expensive components
    - [ ] Add useMemo/useCallback where appropriate
    - [ ] Implement code splitting for dashboard routes
    - [ ] Add lazy loading for heavy components
    - [ ] Optimize bundle size (check webpack analyzer)
    - [ ] Add service worker for offline support (optional)

---

### Phase 4: Contract Integration in UI (Priority: HIGH)
**Goal:** Enable actual trading and market interaction from dashboard

15. **Contract Interaction Setup**
    - [ ] Configure ethers.js with Sepolia RPC
    - [ ] Add contract ABIs to `/web/src/lib/contracts/`
    - [ ] Create contract instances using deployed addresses
    - [ ] Add network switching (ensure user is on Sepolia)
    - [ ] Add chain ID validation

16. **Market Creation UI**
    - [ ] Create market creation form component
    - [ ] Add question input, end time picker, fee inputs
    - [ ] Connect form to MarketFactory.createMarket()
    - [ ] Add transaction status (pending, success, error)
    - [ ] Show created market address after deployment
    - [ ] Redirect to market detail page after creation

17. **Trading UI**
    - [ ] Add "Buy Long" / "Buy Short" buttons to market cards
    - [ ] Create trading modal/dialog with amount input
    - [ ] Connect to Market.buy() and Market.sell()
    - [ ] Add transaction approval flow (ERC20 approve)
    - [ ] Show transaction progress and confirmation
    - [ ] Update positions display after trade

18. **Market Resolution UI**
    - [ ] Add "Resolve Market" button (admin/oracle only)
    - [ ] Connect to oracle resolution flow
    - [ ] Show resolution status (pending, resolved)
    - [ ] Display outcome when resolved

19. **Redemption UI**
    - [ ] Add "Redeem" button for resolved markets
    - [ ] Show user's redeemable amount
    - [ ] Connect to Market.redeem()
    - [ ] Show redemption success and update balance

20. **Positions & Portfolio**
    - [ ] Create positions view showing user's market positions
    - [ ] Calculate P&L for each position
    - [ ] Show total portfolio value
    - [ ] Add filter by market status (active, resolved)

---

### Phase 5: Testing & Quality Assurance (Priority: MEDIUM)
**Goal:** Ensure reliability and catch bugs

21. **Frontend Testing**
    - [ ] Add unit tests for ViewModels
    - [ ] Add unit tests for Managers
    - [ ] Add component tests for critical UI flows
    - [ ] Add E2E tests for dashboard navigation
    - [ ] Add E2E tests for wallet connection
    - [ ] Test on multiple browsers (Chrome, Firefox, Safari)
    - [ ] Test mobile responsiveness on real devices

22. **Integration Testing**
    - [ ] Test full flow: create market → trade → resolve → redeem
    - [ ] Test error scenarios (network failures, rejected transactions)
    - [ ] Test edge cases (zero balance, expired markets, etc.)
    - [ ] Load testing for API endpoints

23. **Security Review**
    - [ ] Review frontend for XSS vulnerabilities
    - [ ] Verify no sensitive data in client code
    - [ ] Review contract access controls
    - [ ] External security audit scheduling

---

### Phase 6: Documentation & Polish (Priority: LOW)
**Goal:** Make project maintainable and user-friendly

24. **Documentation**
    - [ ] Update README with setup instructions
    - [ ] Add API documentation
    - [ ] Document contract interfaces and events
    - [ ] Add deployment runbook
    - [ ] Create user guide for dashboard
    - [ ] Add developer guide for extending dashboard

25. **Error Handling & User Feedback**
    - [ ] Add toast notifications for all user actions
    - [ ] Improve error messages (user-friendly)
    - [ ] Add help tooltips to complex features
    - [ ] Add empty states with helpful messages
    - [ ] Add success confirmations

26. **Accessibility**
    - [ ] Add ARIA labels to interactive elements
    - [ ] Test keyboard navigation
    - [ ] Ensure color contrast meets WCAG standards
    - [ ] Add focus indicators
    - [ ] Test with screen readers

---

### Phase 7: Future Enhancements (Priority: LOW - Backlog)
**Goal:** Advanced features for production

27. **Phase 2: Custom Relayer**
    - [ ] Implement VPOOracleRelayer.sol
    - [ ] Build off-chain relayer service
    - [ ] Add attestation signing and verification
    - [ ] Deploy to Base Sepolia
    - [ ] Switch oracle provider in UI

28. **External Integrations**
    - [ ] Implement UMA Optimistic Oracle adapter
    - [ ] Implement Gnosis Conditional Tokens integration
    - [ ] Polymarket adapter
    - [ ] Add adapter selection UI

29. **Advanced Features**
    - [ ] Multi-chain support (Arbitrum, Optimism, Base)
    - [ ] Governance DAO implementation
    - [ ] Staking/slashing mechanisms
    - [ ] Reputation system for operators
    - [ ] Analytics dashboard

---

## Executor's Feedback or Assistance Requests
- ✅ Branding confirmed: "Veyra" used across UI
- ⚠️ UMA/Gnosis adapter implementation: Deferred to Phase 7
- ⚠️ Contract testing: Need to verify Foundry installation
- ⚠️ API integration: Need to connect indexer to dashboard

## Security Review & Audit Notes (Auditor)
- To be filled during audit phase before external integrations
- Priority: Complete Phase 1 tasks before external audit

## Lessons
- Keep adapter and oracle roles separate to enable both internal markets and external integrations cleanly
- Dashboard MVP completed ahead of contract deployment - good for UI/UX validation
- Mock data providers made it easy to build UI without waiting for backend - pattern worked well

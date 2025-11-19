# Quorum Consensus UI Implementation Plan

## The Heart: Quorum Consensus with User-Visible Progress

The core value of Veyra is **distributed operator consensus** - multiple operators must agree before a resolution is finalized. This needs to be **visible and interactive** in the UI.

## UI Components to Build

### 1. QuorumStatus Component (`web/src/components/markets/QuorumStatus.tsx`)

**Visual Design:**
- Progress bar showing quorum progress
- Text: "3/5 operators have attested (60% - Need 66%)"
- Color coding:
  - 🔴 Red: < 50% quorum
  - 🟡 Yellow: 50-66% (approaching)
  - 🟢 Green: ≥ 66% (quorum reached)
- Real-time updates (poll every 5 seconds)

**Props:**
```typescript
interface QuorumStatusProps {
  requestId: string;
  currentWeight: number;
  totalWeight: number;
  quorumThreshold: number; // default 66
  isQuorumReached: boolean;
}
```

### 2. OperatorAttestations Component (`web/src/components/markets/OperatorAttestations.tsx`)

**Visual Design:**
- List of all registered operators
- For each operator:
  - ✅ Checkmark if attested
  - ⏳ Clock icon if pending
  - Operator address (truncated)
  - Weight/stake amount
  - Attestation timestamp (if attested)
  - Outcome they attested (Yes/No)
- Click operator to see full attestation details

**Props:**
```typescript
interface OperatorAttestationsProps {
  requestId: string;
  operators: Array<{
    address: string;
    weight: number;
    hasAttested: boolean;
    outcome?: boolean;
    timestamp?: number;
    signature?: string;
  }>;
}
```

### 3. Market Detail Page Enhancement (`web/src/app/dashboard/markets/[id]/page.tsx`)

**When Market Status = "PendingResolve":**
- Show prominent "Quorum Status" section
- Display QuorumStatus component
- Display OperatorAttestations component
- Show "Finalize Resolution" button (disabled until quorum reached)
- Real-time updates as attestations come in

**When Quorum Reached:**
- "Finalize Resolution" button becomes active
- Shows aggregate signature preview
- User can click to finalize (calls `finalizeResolution()` on contract)

### 4. Operator Registry Enhancement (`web/src/app/dashboard/operators/page.tsx`)

**Add Columns:**
- Attestation Count (how many resolutions they've participated in)
- Participation Rate (% of requests they've attested to)
- Recent Attestations (last 5 with timestamps)
- Status badge (Active/Inactive based on recent activity)

**Interactive Features:**
- Click operator to see detailed attestation history
- Filter by active/inactive
- Sort by participation rate

## Data Flow

1. **Contract Events:**
   - `AttestationSubmitted(requestId, operator, outcome, signature)`
   - `QuorumReached(requestId, outcome, totalWeight)`
   - `ResolutionFinalized(requestId, outcome, aggregateSignature)`

2. **Indexer:**
   - Listen to events
   - Store in database:
     - `attestations` table: requestId, operator, outcome, signature, timestamp
     - `quorum_status` table: requestId, currentWeight, totalWeight, isQuorumReached

3. **API Endpoints:**
   - `GET /api/quorum/:requestId` - Get quorum status
   - `GET /api/attestations/:requestId` - Get all attestations for request
   - `GET /api/operators` - Get operator list with stats

4. **UI Manager:**
   - `QuorumManager.ts` - Fetches quorum data from API
   - Polls for updates when viewing pending resolution

## User Interactions

### Scenario 1: Viewing Pending Resolution
1. User opens market detail page
2. Sees "Quorum Status: 2/5 operators (40%)"
3. Progress bar shows red (below threshold)
4. Operator list shows 2 checkmarks, 3 clock icons
5. "Finalize" button is disabled

### Scenario 2: Quorum Reached
1. User sees progress bar turn green
2. Text updates: "4/5 operators (80% - Quorum Reached!)"
3. "Finalize Resolution" button becomes active
4. User clicks button → Wallet prompt → Transaction sent
5. Resolution finalized → Market status updates to "Resolved"

### Scenario 3: Tracking Operator Participation
1. User goes to Operators page
2. Sees operator "0x1234..." with:
   - 45 attestations
   - 92% participation rate
   - Last active: 2 hours ago
3. Clicks operator → See detailed history

## Implementation Priority

1. **Phase 1: Core Quorum Display**
   - QuorumStatus component
   - Basic OperatorAttestations list
   - Integrate into market detail page

2. **Phase 2: Interactivity**
   - Finalize button with wallet integration
   - Real-time polling
   - Operator detail views

3. **Phase 3: Enhanced Features**
   - Operator registry enhancements
   - Attestation history timeline
   - Analytics and charts

## Files to Create/Modify

**New Files:**
- `web/src/components/markets/QuorumStatus.tsx`
- `web/src/components/markets/OperatorAttestations.tsx`
- `web/src/lib/dashboard/managers/QuorumManager.ts`
- `web/src/lib/dashboard/types.ts` (add quorum types)

**Modify:**
- `web/src/app/dashboard/markets/[id]/page.tsx` - Add quorum section
- `web/src/app/dashboard/operators/page.tsx` - Add participation stats
- `indexer/src/indexer.ts` - Index quorum events
- `indexer/src/server.ts` - Add quorum API endpoints

This makes the quorum consensus mechanism **visible, interactive, and engaging** for users!


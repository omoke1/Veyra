
Veyra: A Verifiable Oracle AVS for Deterministic Market Resolution
Technical Whitepaper v1.0 — November 2025
 Overview
Veyra is a verifiable oracle layer that provides deterministic, cryptographically provable event resolutions for prediction markets and decentralized financial systems.
It operates as an Actively Validated Service (AVS) on EigenLayer, using EigenVerify proofs to verify computational correctness and EigenLayer operators to provide distributed attestation and slashing-backed accountability.
Veyra can serve as a drop-in oracle module for systems such as Polymarket and synthetic asset protocols, replacing subjective token-vote oracles with proof-verified, stake-secured truth.

2. Technical Motivation
Existing oracle systems fall into two broad categories:
Oracle Type
Examples
Limitation
Data Feed Oracles
Chainlink, Pyth
Limited to numeric on-chain data; unsuitable for event-based outcomes.
Optimistic Oracles
UMA, Reality.eth
Require subjective dispute voting; vulnerable to governance capture.

Prediction markets and outcome-based DeFi rely on real-world event resolution, which cannot be deterministically derived from an API or price feed. UMA’s optimistic oracle architecture is flexible, but depends on economic voting, where a small subset of token holders determines truth.
Veyra replaces this model with proof-based validation and restaked accountability, ensuring that every oracle answer is both verifiable and economically secured.

3. System Architecture
Veyra’s architecture consists of three operational layers:
Market Layer (Client Contracts) — Smart contracts requesting verifiable resolutions.


Oracle Layer (Veyra AVS) — Decentralized service that coordinates operator validation and proof verification.


Verification Layer (EigenVerify) — Provides verifiable computation proofs and validation logic.



3.1 Architectural Diagram (Textual Representation)
┌────────────────────────────┐
 │   Prediction Market (e.g., Polymarket)  │
 │  ────────────────────────────            │
 │  Emits requestResolution(marketId)       │
 └────────────────────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │     Veyra Oracle AVS       │
 │  ────────────────────────────
 │  • Assigns jobId to request │
 │  • Broadcasts to operators  │
 │  • Verifies EigenVerify proofs │
 │  • Aggregates signatures     │
 │  • Finalizes resolution      │
 └────────────────────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │  EigenLayer Operators      │
 │  • Run proof verifier      │
 │  • Submit attestations     │
 │  • Subject to slashing     │
 └────────────────────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │  Market Contract Finalized │
 │  • Result posted on-chain  │
 │  • Proof hash stored       │
 │  • Settlement triggered    │
 └────────────────────────────┘

4. Core Components
4.1 Veyra Oracle AVS
A custom Actively Validated Service on EigenLayer that manages:
Job creation and task assignment for each resolution request.


Validation of EigenVerify proofs submitted by operators.


Consensus aggregation (multi-signature or threshold BLS).


Submission of verified results back to client contracts.


Contract Interfaces:
interface IVeyraOracleAVS {
    function requestResolution(bytes32 marketId, bytes calldata dataSpec)
        external
        returns (uint256 jobId);

    function submitAttestation(uint256 jobId, bytes calldata attestation)
        external;

    function finalizeResolution(bytes32 marketId, string calldata result, bytes calldata aggSig)
        external;
}

4.2 Operators
EigenLayer restaked operators that validate computation and co-sign outcomes.
Responsibilities:
Fetch market data defined in dataSpec (e.g., API endpoint, IPFS record, or feed).


Execute deterministic resolution logic locally.


Validate EigenVerify proof (cryptographic verification).


Submit attestation to AVS.


Operator Attestation Format:
{
  "operator": "0xabc123...",
  "marketId": "0x4d5f...",
  "result": "YES",
  "proofHash": "0x8af3...",
  "signature": "BLS_SIG"
}
Operator Node Flow (Simplified Python-like Pseudocode):
def resolve_job(job):
    data = fetch(job.dataSpec.source)
    result = compute_result(data, job.dataSpec.logic)
    proof = EigenVerify.generate_proof(data, result)
    send_to_avs({
        "jobId": job.id,
        "result": result,
        "proof": proof
    })

4.3 EigenVerify Module
EigenVerify is used to produce and validate proofs of correctness for computations used in market resolution.
Each proof includes:


Data source hash


Computation code hash


Output result hash


Signature from the generator


Verification Function:
function verify(bytes calldata proof, bytes calldata dataSpec)
    external
    view
    returns (bool valid, string memory result);
If valid, the operator’s attestation is counted toward quorum consensus.

4.4 Slashing Contract
Tracks operator stake and slashes malicious or incorrect signers.


Receives “invalid proof” reports from the AVS.


contract Slashing {
    mapping(address => uint256) public stake;
    event Slashed(address indexed operator, uint256 amount);

    function slash(address operator, uint256 amount) external {
        require(msg.sender == address(avs), "only AVS");
        stake[operator] -= amount;
        emit Slashed(operator, amount);
    }
}

5. Consensus Model
Veyra uses operator quorum attestation for resolution finality.
A market requests resolution → AVS creates job.


Operators submit proofs + signatures.


AVS aggregates signatures once a ≥⅔ quorum is reached.


Aggregate signature + result are posted on-chain.


If later proven invalid → all signers are slashed.


This provides deterministic resolution without token voting or manual dispute windows.

6. Integration with Polymarket
Veyra is interface-compatible with UMA’s Optimistic Oracle, allowing drop-in use.
Integration Path:
Implement IVeyraOracleAVS as UMA-compatible contract.


Modify Polymarket resolver to call Veyra’s requestResolution().


Market finalization calls finalize(result, aggSig) after quorum proof.


Proof hashes are stored on-chain and linked to Veyra dashboard.


Example:
contract PolymarketAdapter {
    address public veyraOracle;

    function resolve(bytes32 marketId, bytes calldata dataSpec) external {
        IVeyraOracleAVS(veyraOracle).requestResolution(marketId, dataSpec);
    }

    function finalize(bytes32 marketId, string calldata result, bytes calldata aggSig) external {
        require(msg.sender == veyraOracle, "not authorized");
        // finalize market payouts
    }
}

7. Security and Fault Tolerance
Threat
Mitigation
Operator collusion
High slashing threshold via restaked ETH.
Proof forgery
Deterministic cryptographic validation through EigenVerify.
Censorship
Redundant operator set ensures liveness.
Invalid data sources
Market creator specifies canonical sources via dataSpec.
Dispute fallback
Optional escalation to UMA governance or DAO arbitration.


8. Deployment Flow
Deploy Veyra contracts on Base or Arbitrum chain.


Register as an EigenLayer AVS with its own slashing module.


Launch Operator Node client software (Docker image).


Publish integration SDK for prediction markets.


Build dashboard:


Job explorer


Proof verifier


Operator registry


Signature quorum tracker



9. Performance Targets
Metric
Target
Average resolution time
< 5 minutes post-event
Operator quorum
≥ 66% participation
Verification throughput
200+ resolutions/day
Finalization gas cost
< 250k per resolution
Audit coverage
100% smart contract + proof verification logic


10. Developer Tooling
Veyra-SDK (TypeScript):

 Simplified integration for dApp and market creators.


import { VeyraClient } from "@veyra/sdk";
const client = new VeyraClient("https://rpc.base.org");
await client.requestResolution("BTC2025", { source: "coinbase", logic: "price>100000" });



CLI Tools: For operator onboarding and local proof testing.


GraphQL API: To query historical resolutions and proof hashes.



11. Governance Extensions
While Veyra minimizes human governance, edge cases (ambiguous questions, missing data) can escalate to:
UMA Oracle Governance (fallback).


Veyra DAO Arbitration for decentralized appeals.



12. Future Work
Support for multi-chain resolution bridges.


Integration with EigenDA for proof data availability.


Expand operator set to 1000+ nodes.


Introduce ZK-accelerated verification for large data proofs.



13. Conclusion
Veyra redefines oracle resolution through verifiable computation and restaked accountability.
By merging EigenVerify’s deterministic proof system with EigenLayer’s economic security, Veyra achieves a balance of speed, transparency, and decentralization unattainable by traditional oracles.
Its integration with Polymarket and other prediction systems enables cryptographically verified truth — an essential step toward trustless, high-stakes, information markets.

Contact
Project Name: Veyra


Core Modules: EigenVerify, Veyra AVS, Slashing Contracts


License: MIT


Website (Planned): [veyra.xyz]


Docs: /docs (dev-focused API references)

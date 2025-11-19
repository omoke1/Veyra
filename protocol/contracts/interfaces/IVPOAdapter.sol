// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Interface for the VPO Adapter used by external prediction markets to request verifiable outcomes
/// and receive verified results with attestations (e.g., IPFS CIDs) produced by the AVS.
/// Implements quorum consensus requiring ≥⅔ operator agreement before finalization.
interface IVPOAdapter {
    /// @dev Emitted when a verification request is registered.
    event VerificationRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed marketRef, bytes data);

    /// @dev Emitted when a verification is fulfilled with an attestation reference and result.
    event VerificationFulfilled(bytes32 indexed requestId, bytes attestationCid, bool outcome, bytes metadata);

    /// @dev Emitted when an operator submits an attestation.
    event AttestationSubmitted(
        bytes32 indexed requestId,
        address indexed operator,
        bool outcome,
        bytes attestationCid,
        bytes signature
    );

    /// @dev Emitted when quorum is reached for an outcome.
    event QuorumReached(bytes32 indexed requestId, bool outcome, uint256 totalWeight);

    /// @dev Emitted when resolution is finalized after quorum.
    event ResolutionFinalized(
        bytes32 indexed requestId,
        bool outcome,
        bytes aggregateSignature,
        uint256 totalWeight
    );

    /// @notice Create a verification request that AVS should process.
    /// @param marketRef An identifier from the external market (e.g., UMA dispute id or conditional question id).
    /// @param data Encoded parameters describing the query (data sources, timestamps, etc.).
    /// @return requestId Unique identifier for this verification request.
    function requestVerification(bytes32 marketRef, bytes calldata data) external returns (bytes32 requestId);

    /// @notice Submit an attestation for a verification request (quorum-based).
    /// @param requestId The request ID from requestVerification.
    /// @param outcome Resolved boolean outcome (true = YES, false = NO).
    /// @param attestationCid IPFS CID (as bytes) to the public proof payload.
    /// @param signature Operator's signature on the attestation.
    function submitAttestation(
        bytes32 requestId,
        bool outcome,
        bytes calldata attestationCid,
        bytes calldata signature
    ) external;

    /// @notice Fulfill a request with an attestation and outcome (legacy - now checks quorum).
    /// @param requestId The id previously returned by requestVerification.
    /// @param attestationCid IPFS CID (bytes form) to the public proof payload.
    /// @param outcome The resolved boolean outcome (example: true = YES, false = NO).
    /// @param metadata Provider-specific metadata (timestamps, signatures, etc.).
    function fulfillVerification(bytes32 requestId, bytes calldata attestationCid, bool outcome, bytes calldata metadata) external;

    /// @notice Finalize resolution after quorum is reached.
    /// @param requestId The request ID.
    /// @param outcome The outcome that reached quorum.
    /// @param aggregateSignature Aggregated signature from all operators.
    function finalizeResolution(
        bytes32 requestId,
        bool outcome,
        bytes calldata aggregateSignature
    ) external;

    /// @notice Read back fulfillment if present.
    /// @return exists Whether a fulfillment exists.
    /// @return attestationCid The IPFS CID bytes.
    /// @return outcome The resolved boolean.
    /// @return metadata Opaque metadata.
    function getFulfillment(bytes32 requestId) external view returns (bool exists, bytes memory attestationCid, bool outcome, bytes memory metadata);
}


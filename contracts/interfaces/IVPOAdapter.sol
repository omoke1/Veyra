// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Interface for the VPO Adapter used by external prediction markets to request verifiable outcomes
/// and receive verified results with attestations (e.g., IPFS CIDs) produced by the AVS.
interface IVPOAdapter {
    /// @dev Emitted when a verification request is registered.
    event VerificationRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed marketRef, bytes data);

    /// @dev Emitted when a verification is fulfilled with an attestation reference and result.
    event VerificationFulfilled(bytes32 indexed requestId, bytes attestationCid, bool outcome, bytes metadata);

    /// @notice Create a verification request that AVS should process.
    /// @param marketRef An identifier from the external market (e.g., UMA dispute id or conditional question id).
    /// @param data Encoded parameters describing the query (data sources, timestamps, etc.).
    /// @return requestId Unique identifier for this verification request.
    function requestVerification(bytes32 marketRef, bytes calldata data) external returns (bytes32 requestId);

    /// @notice Fulfill a request with an attestation and outcome.
    /// @param requestId The id previously returned by requestVerification.
    /// @param attestationCid IPFS CID (bytes form) to the public proof payload.
    /// @param outcome The resolved boolean outcome (example: true = YES, false = NO).
    /// @param metadata Provider-specific metadata (timestamps, signatures, etc.).
    function fulfillVerification(bytes32 requestId, bytes calldata attestationCid, bool outcome, bytes calldata metadata) external;

    /// @notice Read back fulfillment if present.
    /// @return exists Whether a fulfillment exists.
    /// @return attestationCid The IPFS CID bytes.
    /// @return outcome The resolved boolean.
    /// @return metadata Opaque metadata.
    function getFulfillment(bytes32 requestId) external view returns (bool exists, bytes memory attestationCid, bool outcome, bytes memory metadata);
}



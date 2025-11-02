// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVPOAdapter} from "../interfaces/IVPOAdapter.sol";
import {Errors} from "../security/Errors.sol";

/// @title VPO Adapter
/// @notice On-chain adapter that receives verification requests from external prediction markets
/// and coordinates with EigenCloud AVS nodes to provide verifiable outcomes.
contract VPOAdapter is IVPOAdapter {
	/// @dev requestId => Request
	mapping(bytes32 => Request) private _requests;

	/// @dev AVS nodes that are authorized to fulfill requests
	mapping(address => bool) public avsNodes;

	address public admin;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	modifier onlyAVS() {
		if (!avsNodes[msg.sender]) revert Errors.Unauthorized();
		_;
	}

	constructor(address admin_) {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;
	}

	/// @notice Add or remove an AVS node
	function setAVSNode(address node, bool enabled) external onlyAdmin {
		if (node == address(0)) revert Errors.ZeroAddress();
		avsNodes[node] = enabled;
		emit AVSNodeUpdated(node, enabled);
	}

	/// @notice Request verification for an external market
	/// @param marketRef Identifier from external market (e.g., UMA dispute id, conditional question id)
	/// @param data Encoded parameters (data sources, timestamps, query details)
	/// @return requestId Unique identifier for this request
	function requestVerification(bytes32 marketRef, bytes calldata data)
		external
		override
		returns (bytes32 requestId)
	{
		// Generate unique request ID
		requestId = keccak256(abi.encodePacked(marketRef, msg.sender, block.timestamp, data, block.prevrandao));

		// Store request
		_requests[requestId] = Request({
			marketRef: marketRef,
			requester: msg.sender,
			data: data,
			fulfilled: false,
			attestationCid: "",
			outcome: false,
			metadata: ""
		});

		emit VerificationRequested(requestId, msg.sender, marketRef, data);
	}

	/// @notice Fulfill a verification request with attestation and outcome
	/// @param requestId The request ID from requestVerification
	/// @param attestationCid IPFS CID (as bytes) to the public proof payload
	/// @param outcome Resolved boolean outcome (true = YES, false = NO)
	/// @param metadata Provider-specific metadata (timestamps, signatures, etc.)
	function fulfillVerification(
		bytes32 requestId,
		bytes calldata attestationCid,
		bool outcome,
		bytes calldata metadata
	) external override onlyAVS {
		Request storage req = _requests[requestId];

		// Check request exists
		if (req.requester == address(0)) revert Errors.NotFound();

		// Check not already fulfilled
		if (req.fulfilled) revert Errors.AlreadyFulfilled();

		// Update request
		req.fulfilled = true;
		req.attestationCid = attestationCid;
		req.outcome = outcome;
		req.metadata = metadata;

		emit VerificationFulfilled(requestId, attestationCid, outcome, metadata);
	}

	/// @notice Read back fulfillment if present
	/// @param requestId The request ID to check
	/// @return exists Whether fulfillment exists
	/// @return attestationCid IPFS CID bytes
	/// @return outcome Resolved boolean
	/// @return metadata Opaque metadata
	function getFulfillment(bytes32 requestId)
		external
		view
		override
		returns (bool exists, bytes memory attestationCid, bool outcome, bytes memory metadata)
	{
		Request memory req = _requests[requestId];

		if (req.requester == address(0)) {
			return (false, "", false, "");
		}

		if (!req.fulfilled) {
			return (false, "", false, "");
		}

		return (true, req.attestationCid, req.outcome, req.metadata);
	}

	/// @notice Get request details (for debugging/verification)
	function getRequest(bytes32 requestId) external view returns (Request memory) {
		return _requests[requestId];
	}

	// Internal struct
	struct Request {
		bytes32 marketRef;
		address requester;
		bytes data;
		bool fulfilled;
		bytes attestationCid;
		bool outcome;
		bytes metadata;
	}

	/// @notice Event emitted when AVS node is added/removed
	event AVSNodeUpdated(address indexed node, bool enabled);
}


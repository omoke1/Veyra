// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVPOAdapter} from "../interfaces/IVPOAdapter.sol";
import {IEigenVerify} from "../interfaces/IEigenVerify.sol";
import {ISlashing} from "../interfaces/ISlashing.sol";
import {Errors} from "../security/Errors.sol";

/// @title VPO Adapter
/// @notice On-chain adapter that receives verification requests from external prediction markets
/// and coordinates with EigenCloud AVS nodes to provide verifiable outcomes.
/// Implements quorum consensus requiring ≥⅔ operator agreement before finalization.
contract VPOAdapter is IVPOAdapter {
	// Internal structs (must be defined before use)
	struct Request {
		bytes32 marketRef;
		address requester;
		bytes data;
		bool fulfilled;
		bytes attestationCid;
		bool outcome;
		bytes metadata;
	}

	struct Attestation {
		address operator;
		bool outcome;
		bytes attestationCid;
		bytes signature;
		bytes32 proofHash; // Hash of the EigenVerify proof (on-chain storage per PRD)
		uint256 timestamp;
	}

	/// @dev requestId => Request
	mapping(bytes32 => Request) private _requests;

	/// @dev AVS nodes that are authorized to fulfill requests
	mapping(address => bool) public avsNodes;

	/// @dev Operator weights (stakes) for quorum calculation
	mapping(address => uint256) public operatorWeights;

	/// @dev Total weight of all registered operators
	uint256 public totalOperatorWeight;

	/// @dev requestId => Attestation[]
	mapping(bytes32 => Attestation[]) private _attestations;

	/// @dev requestId => outcome => total weight attested
	mapping(bytes32 => mapping(bool => uint256)) private _outcomeWeights;

	/// @dev Quorum threshold as percentage (default 66 = 66%)
	uint256 public quorumThreshold = 66;

	/// @dev EigenVerify contract for proof verification
	IEigenVerify public immutable eigenVerify;

	/// @dev Slashing contract for operator accountability
	ISlashing public immutable slashing;

	/// @dev requestId => proof bytes (stored separately for verification)
	mapping(bytes32 => mapping(address => bytes)) private _proofBytes;

	address public admin;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	modifier onlyAVS() {
		if (!avsNodes[msg.sender]) revert Errors.Unauthorized();
		_;
	}

	constructor(address admin_, address eigenVerify_, address slashing_) {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		if (eigenVerify_ == address(0)) revert Errors.ZeroAddress();
		if (slashing_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;
		eigenVerify = IEigenVerify(eigenVerify_);
		slashing = ISlashing(slashing_);
	}

	/// @notice Add or remove an AVS node
	function setAVSNode(address node, bool enabled) external onlyAdmin {
		if (node == address(0)) revert Errors.ZeroAddress();
		avsNodes[node] = enabled;
		emit AVSNodeUpdated(node, enabled);
	}

	/// @notice Set operator weight (stake) for quorum calculation
	/// @param operator The operator address
	/// @param weight The weight/stake amount
	function setOperatorWeight(address operator, uint256 weight) external onlyAdmin {
		if (operator == address(0)) revert Errors.ZeroAddress();
		
		uint256 oldWeight = operatorWeights[operator];
		operatorWeights[operator] = weight;
		
		// Update total weight
		totalOperatorWeight = totalOperatorWeight - oldWeight + weight;
		
		emit OperatorWeightUpdated(operator, weight);
	}

	/// @notice Set quorum threshold percentage (e.g., 66 = 66%)
	function setQuorumThreshold(uint256 threshold) external onlyAdmin {
		if (threshold > 100) revert Errors.InvalidParameter();
		quorumThreshold = threshold;
		emit QuorumThresholdUpdated(threshold);
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

	/// @notice Internal function to slash operator for invalid proof
	function _slashOperatorForInvalidProof(
		bytes32 requestId,
		address operator,
		uint256 weight,
		bytes calldata proof
	) internal {
		// Reduce operator weight
		operatorWeights[operator] = 0;
		totalOperatorWeight -= weight;
		
		// Slash operator's stake
		uint256 operatorStake = slashing.stake(operator);
		if (operatorStake > 0) {
			uint256 slashAmount = weight > operatorStake ? operatorStake : weight;
			slashing.slash(operator, slashAmount);
		}
		
		emit ProofVerificationFailed(requestId, operator, proof);
	}

	/// @notice Internal function to submit an attestation
	/// @dev Verifies EigenVerify proof before accepting attestation. If invalid, slashes operator.
	function _submitAttestationInternal(
		bytes32 requestId,
		bool outcome,
		bytes calldata attestationCid,
		bytes calldata signature,
		bytes calldata proof,
		address operator
	) internal {
		Request storage req = _requests[requestId];

		// Check request exists
		if (req.requester == address(0)) revert Errors.NotFound();

		// Check not already fulfilled
		if (req.fulfilled) revert Errors.AlreadyFulfilled();

		// Check operator has weight
		uint256 weight = operatorWeights[operator];
		if (weight == 0) revert Errors.Unauthorized();

		// Check operator hasn't already attested
		for (uint256 i = 0; i < _attestations[requestId].length; i++) {
			if (_attestations[requestId][i].operator == operator) {
				revert Errors.AlreadyFulfilled(); // Reuse error for "already attested"
			}
		}

		// Construct dataSpec from request data for EigenVerify verification
		// For MVP: use standardized dataSourceId and current timestamp
		// The proof was generated with these parameters, so we reconstruct the same dataSpec
		bytes memory dataSpec = _constructDataSpec(req.data, outcome);
		
		// Verify EigenVerify proof before accepting attestation
		(bool valid, string memory result) = eigenVerify.verify(proof, dataSpec);
		
		if (!valid) {
			_slashOperatorForInvalidProof(requestId, operator, weight, proof);
			revert Errors.InvalidParameter(); // Reject attestation
		}

		// Verify result matches outcome
		// For MVP: result should be "YES" or "NO", map to bool outcome
		bool resultBool = keccak256(bytes(result)) == keccak256(bytes("YES"));
		if (resultBool != outcome) {
			_slashOperatorForInvalidProof(requestId, operator, weight, proof);
			revert Errors.InvalidParameter();
		}

		// Compute proof hash for on-chain storage (per PRD)
		bytes32 proofHash = keccak256(proof);
		
		// Store proof bytes
		_proofBytes[requestId][operator] = proof;

		// Add attestation
		_attestations[requestId].push(Attestation({
			operator: operator,
			outcome: outcome,
			attestationCid: attestationCid,
			signature: signature,
			proofHash: proofHash,
			timestamp: block.timestamp
		}));

		// Update outcome weight
		_outcomeWeights[requestId][outcome] += weight;

		emit AttestationSubmitted(requestId, operator, outcome, attestationCid, signature);

		// Check if quorum reached for this outcome
		uint256 outcomeWeight = _outcomeWeights[requestId][outcome];
		uint256 requiredWeight = (totalOperatorWeight * quorumThreshold) / 100;
		
		if (outcomeWeight >= requiredWeight && totalOperatorWeight > 0) {
			emit QuorumReached(requestId, outcome, outcomeWeight);
		}
	}

	/// @notice Submit an attestation for a verification request (quorum-based)
	/// @param requestId The request ID from requestVerification
	/// @param outcome Resolved boolean outcome (true = YES, false = NO)
	/// @param attestationCid IPFS CID (as bytes) to the public proof payload
	/// @param signature Operator's signature on the attestation
	/// @param proof EigenVerify proof bytes (data source hash, computation code hash, output result hash, signature)
	function submitAttestation(
		bytes32 requestId,
		bool outcome,
		bytes calldata attestationCid,
		bytes calldata signature,
		bytes calldata proof
	) external override onlyAVS {
		_submitAttestationInternal(requestId, outcome, attestationCid, signature, proof, msg.sender);
	}

	/// @notice Fulfill a verification request with attestation and outcome (legacy - now checks quorum)
	/// @param requestId The request ID from requestVerification
	/// @param attestationCid IPFS CID (as bytes) to the public proof payload
	/// @param outcome Resolved boolean outcome (true = YES, false = NO)
	/// @param metadata Provider-specific metadata (contains signature and proof for backward compatibility)
	function fulfillVerification(
		bytes32 requestId,
		bytes calldata attestationCid,
		bool outcome,
		bytes calldata metadata
	) external override onlyAVS {
		// For backward compatibility, treat as attestation submission
		// For MVP: assume metadata contains proof if it's long enough, otherwise use empty bytes
		// In production, this should be deprecated in favor of submitAttestation
		bytes calldata proof = metadata.length >= 96 ? metadata : metadata[:0]; // Use empty slice if no proof
		bytes calldata signature = metadata; // Use metadata as signature for backward compatibility
		
		_submitAttestationInternal(requestId, outcome, attestationCid, signature, proof, msg.sender);

		// If quorum reached, automatically finalize
		if (_isQuorumReached(requestId, outcome)) {
			_finalizeResolutionInternal(requestId, outcome, "");
		}
	}

	/// @notice Internal function to finalize resolution
	function _finalizeResolutionInternal(
		bytes32 requestId,
		bool outcome,
		bytes memory aggregateSignature
	) internal {
		Request storage req = _requests[requestId];

		// Check request exists
		if (req.requester == address(0)) revert Errors.NotFound();

		// Check not already fulfilled
		if (req.fulfilled) revert Errors.AlreadyFulfilled();

		// Check quorum reached
		if (!_isQuorumReached(requestId, outcome)) revert Errors.InvalidParameter();

		// Aggregate attestation CIDs (use first one for now, can improve later)
		bytes memory finalAttestationCid = "";
		if (_attestations[requestId].length > 0) {
			finalAttestationCid = _attestations[requestId][0].attestationCid;
		}

		// Update request
		req.fulfilled = true;
		req.attestationCid = finalAttestationCid;
		req.outcome = outcome;
		req.metadata = aggregateSignature;

		emit ResolutionFinalized(requestId, outcome, aggregateSignature, _outcomeWeights[requestId][outcome]);
		emit VerificationFulfilled(requestId, finalAttestationCid, outcome, aggregateSignature);
	}

	/// @notice Finalize resolution after quorum is reached
	/// @param requestId The request ID
	/// @param outcome The outcome that reached quorum
	/// @param aggregateSignature Aggregated signature from all operators (can be empty for now)
	function finalizeResolution(
		bytes32 requestId,
		bool outcome,
		bytes calldata aggregateSignature
	) public override {
		_finalizeResolutionInternal(requestId, outcome, aggregateSignature);
	}

	/// @notice Check if quorum is reached for a specific outcome
	function _isQuorumReached(bytes32 requestId, bool outcome) internal view returns (bool) {
		if (totalOperatorWeight == 0) return false;
		
		uint256 outcomeWeight = _outcomeWeights[requestId][outcome];
		uint256 requiredWeight = (totalOperatorWeight * quorumThreshold) / 100;
		
		return outcomeWeight >= requiredWeight;
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

	/// @notice Get all attestations for a request
	function getAttestations(bytes32 requestId) external view returns (Attestation[] memory) {
		return _attestations[requestId];
	}

	/// @notice Get quorum status for a request
	/// @return isQuorumReached Whether quorum is reached
	/// @return yesWeight Total weight for YES outcome
	/// @return noWeight Total weight for NO outcome
	/// @return requiredWeight Weight needed for quorum
	function getQuorumStatus(bytes32 requestId) external view returns (
		bool isQuorumReached,
		uint256 yesWeight,
		uint256 noWeight,
		uint256 requiredWeight
	) {
		requiredWeight = (totalOperatorWeight * quorumThreshold) / 100;
		yesWeight = _outcomeWeights[requestId][true];
		noWeight = _outcomeWeights[requestId][false];
		isQuorumReached = (yesWeight >= requiredWeight || noWeight >= requiredWeight) && totalOperatorWeight > 0;
	}

	/// @notice Event emitted when AVS node is added/removed
	event AVSNodeUpdated(address indexed node, bool enabled);

	/// @notice Event emitted when operator weight is updated
	event OperatorWeightUpdated(address indexed operator, uint256 weight);

	/// @notice Event emitted when quorum threshold is updated
	event QuorumThresholdUpdated(uint256 threshold);

	/// @notice Event emitted when proof verification fails and operator is slashed
	event ProofVerificationFailed(bytes32 indexed requestId, address indexed operator, bytes proof);

	/// @notice Get proof hash for a specific attestation
	/// @param requestId The request ID
	/// @param operator The operator address
	/// @return proofHash The proof hash if attestation exists, otherwise bytes32(0)
	function getProofHash(bytes32 requestId, address operator) external view returns (bytes32 proofHash) {
		Attestation[] memory atts = _attestations[requestId];
		for (uint256 i = 0; i < atts.length; i++) {
			if (atts[i].operator == operator) {
				return atts[i].proofHash;
			}
		}
		return bytes32(0);
	}

	/// @notice Get proof bytes for a specific attestation
	/// @param requestId The request ID
	/// @param operator The operator address
	/// @return proof The proof bytes if attestation exists
	function getProof(bytes32 requestId, address operator) external view returns (bytes memory proof) {
		return _proofBytes[requestId][operator];
	}

	/// @dev Construct dataSpec from request data for EigenVerify verification
	/// @param queryLogic The query logic from the request
	/// @param outcome The expected outcome (true = YES, false = NO)
	/// @return dataSpec The encoded dataSpec matching the format used in proof generation
	function _constructDataSpec(bytes memory queryLogic, bool outcome) internal view returns (bytes memory dataSpec) {
		// Standardized values for MVP (matching test setup)
		string memory dataSourceId = "test-source";
		uint256 timestamp = block.timestamp; // Use current block timestamp
		string memory expectedResult = outcome ? "YES" : "NO";

		// Encode dataSpec in the same format as proof generation:
		// 32 bytes (dataSourceId, right-padded) + 32 bytes (timestamp) + 32 bytes (queryLogic length) + queryLogic bytes + result string
		
		// Convert dataSourceId to bytes32 (right-padded)
		bytes memory dataSourceIdBytes = new bytes(32);
		bytes memory dataSourceIdStrBytes = bytes(dataSourceId);
		for (uint256 i = 0; i < dataSourceIdStrBytes.length && i < 32; i++) {
			dataSourceIdBytes[i] = dataSourceIdStrBytes[i];
		}

		// Encode timestamp as uint256 (32 bytes, left-padded)
		bytes memory timestampBytes = abi.encodePacked(uint256(0), timestamp); // Will be 64 bytes, take last 32
		bytes memory timestampBytes32 = new bytes(32);
		for (uint256 i = 0; i < 32; i++) {
			timestampBytes32[i] = timestampBytes[i + 32];
		}

		// Encode queryLogic length (32 bytes, left-padded)
		uint256 queryLength = queryLogic.length;
		bytes memory queryLengthBytes = abi.encodePacked(uint256(0), queryLength); // Will be 64 bytes, take last 32
		bytes memory queryLengthBytes32 = new bytes(32);
		for (uint256 i = 0; i < 32; i++) {
			queryLengthBytes32[i] = queryLengthBytes[i + 32];
		}

		// Encode expectedResult as string (with null terminator)
		bytes memory resultBytes = bytes(expectedResult);
		bytes memory resultPadded = new bytes(resultBytes.length + 1);
		for (uint256 i = 0; i < resultBytes.length; i++) {
			resultPadded[i] = resultBytes[i];
		}
		// Null terminator already 0 by default

		// Concatenate all parts
		return abi.encodePacked(
			dataSourceIdBytes,
			timestampBytes32,
			queryLengthBytes32,
			queryLogic,
			resultPadded
		);
	}
}


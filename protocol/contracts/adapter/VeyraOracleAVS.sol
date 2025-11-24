// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVeyraOracleAVS} from "../interfaces/IVeyraOracleAVS.sol";
import {IEigenVerify} from "../interfaces/IEigenVerify.sol";
import {ISlashing} from "../interfaces/ISlashing.sol";
import {Errors} from "../security/Errors.sol";
import "hardhat/console.sol";

/// @title Veyra Oracle AVS
/// @notice On-chain AVS that receives resolution requests from external prediction markets
/// and coordinates with EigenLayer operators to provide verifiable outcomes.
/// Implements quorum consensus requiring ≥⅔ operator agreement before finalization.
contract VeyraOracleAVS is IVeyraOracleAVS {
	// Internal structs
	struct Request {
		bytes32 marketRef;
		address requester;
		bytes data; // abi.encode(string source, string logic)
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
		bytes32 proofHash; // Hash of the EigenVerify proof
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

	/// @notice Request resolution for an external market
	/// @param marketRef Identifier from external market
	/// @param data Encoded parameters (abi.encode(string source, string logic))
	/// @return requestId Unique identifier for this request
	function requestResolution(bytes32 marketRef, bytes calldata data)
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
	function _submitAttestationInternal(
		bytes32 requestId,
		bool outcome,
		bytes calldata attestationCid,
		bytes calldata signature,
		bytes calldata proof,
		uint256 timestamp,
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
				revert Errors.AlreadyFulfilled();
			}
		}

		// Construct dataSpec from request data        // Reconstruct DataSpec
        bytes memory dataSpec = _constructDataSpec(req.data, outcome, timestamp);
		
		// Verify EigenVerify proof before accepting attestation
		(bool valid, string memory result) = eigenVerify.verify(proof, dataSpec);
		
		if (!valid) {
			_slashOperatorForInvalidProof(requestId, operator, weight, proof);
			revert Errors.InvalidParameter(); // Reject attestation
		}

		// Verify result matches outcome
		bool resultBool = keccak256(bytes(result)) == keccak256(bytes("YES"));
		if (resultBool != outcome) {
			_slashOperatorForInvalidProof(requestId, operator, weight, proof);
			revert Errors.InvalidParameter();
		}

		// Compute proof hash for on-chain storage
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
			timestamp: timestamp
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
	function submitAttestation(
		bytes32 requestId,
		bool outcome,
		bytes calldata attestationCid,
		bytes calldata signature,
		bytes calldata proof,
		uint256 timestamp
	) external override onlyAVS {
		_submitAttestationInternal(requestId, outcome, attestationCid, signature, proof, timestamp, msg.sender);
	}

	/// @notice Fulfill a verification request (legacy support)
	function fulfillVerification(
		bytes32 requestId,
		bytes calldata attestationCid,
		bool outcome,
		bytes calldata metadata,
		uint256 timestamp
	) external override onlyAVS {
		// Legacy support: extract proof from metadata if possible
		bytes calldata proof = metadata.length >= 96 ? metadata : metadata[:0];
		bytes calldata signature = metadata;
		
		_submitAttestationInternal(requestId, outcome, attestationCid, signature, proof, timestamp, msg.sender);

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

		if (req.requester == address(0)) revert Errors.NotFound();
		if (req.fulfilled) revert Errors.AlreadyFulfilled();
		if (!_isQuorumReached(requestId, outcome)) revert Errors.InvalidParameter();

		// Aggregate attestation CIDs (use first one for now)
		bytes memory finalAttestationCid = "";
		if (_attestations[requestId].length > 0) {
			finalAttestationCid = _attestations[requestId][0].attestationCid;
		}

		req.fulfilled = true;
		req.attestationCid = finalAttestationCid;
		req.outcome = outcome;
		req.metadata = aggregateSignature;

		emit ResolutionFinalized(requestId, outcome, aggregateSignature, _outcomeWeights[requestId][outcome]);
		emit VerificationFulfilled(requestId, finalAttestationCid, outcome, aggregateSignature);
	}

	/// @notice Finalize resolution after quorum is reached
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
	function getFulfillment(bytes32 requestId)
		external
		view
		override
		returns (bool exists, bytes memory attestationCid, bool outcome, bytes memory metadata)
	{
		Request memory req = _requests[requestId];

		if (req.requester == address(0) || !req.fulfilled) {
			return (false, "", false, "");
		}

		return (true, req.attestationCid, req.outcome, req.metadata);
	}

	/// @notice Get request details
	function getRequest(bytes32 requestId) external view returns (Request memory) {
		return _requests[requestId];
	}

	/// @notice Get all attestations for a request
	function getAttestations(bytes32 requestId) external view returns (Attestation[] memory) {
		return _attestations[requestId];
	}

	/// @notice Get quorum status for a request
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

	/// @notice Get proof hash for a specific attestation
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
	function getProof(bytes32 requestId, address operator) external view returns (bytes memory proof) {
		return _proofBytes[requestId][operator];
	}

	/// @dev Construct dataSpec from request data for EigenVerify verification
    function _constructDataSpec(
        bytes memory requestData,
        bool outcome,
        uint256 timestamp
    ) internal view returns (bytes memory dataSpec) {
		// Try to decode requestData as (string source, string logic)
		// If decoding fails or data is empty, fall back to defaults
		string memory dataSourceId = "default-source";
		string memory queryLogic = "default-logic";

        if (requestData.length > 0) {
            try this.decodeRequestData(requestData) returns (string memory s, string memory l) {
                dataSourceId = s;
                queryLogic = l;
                // console.log("Decoded: %s, %s", s, l);
            } catch {
                // console.log("Decoding failed");
            }
        } else {
             // console.log("Empty request data");
        }
        
        // console.log("Using: %s, %s, %s", dataSourceId, queryLogic, outcome ? "YES" : "NO");

		string memory expectedResult = outcome ? "YES" : "NO";

		// Construct DataSpec matching EigenVerify expectation
		// abi.encode(string dataSourceId, string queryLogic, uint256 timestamp, string expectedResult)
		dataSpec = abi.encode(dataSourceId, queryLogic, timestamp, expectedResult);
	}

	/// @notice Helper to decode request data (external to allow try/catch in view/pure context via this)
	function decodeRequestData(bytes memory data) external pure returns (string memory source, string memory logic) {
		return abi.decode(data, (string, string));
	}
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVeyraOracleAVS} from "../interfaces/IVeyraOracleAVS.sol";
import {IEigenVerify} from "../interfaces/IEigenVerify.sol";
import {IDelegationManager} from "../interfaces/IDelegationManager.sol";
import {IAllocationManager} from "../interfaces/IAllocationManager.sol";
import {ISlashingCoordinator} from "../interfaces/ISlashingCoordinator.sol";
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

	/// @dev requestId => Attestation[]
	mapping(bytes32 => Attestation[]) private _attestations;

	/// @dev requestId => outcome => total weight attested
	mapping(bytes32 => mapping(bool => uint256)) private _outcomeWeights;

	/// @dev Quorum threshold as percentage (default 66 = 66%)
	uint256 public quorumThreshold = 66;

	/// @dev EigenLayer DelegationManager for operator stake queries
	IDelegationManager public immutable delegationManager;

	/// @dev EigenLayer AllocationManager for AVS and operator registration
	IAllocationManager public immutable allocationManager;

	/// @dev EigenLayer SlashingCoordinator for slashing operations
	ISlashingCoordinator public immutable slashingCoordinator;

	/// @dev EigenVerify contract for proof verification (optional - may be address(0) if not available)
	IEigenVerify public immutable eigenVerify;

	/// @dev AVS ID from EigenLayer AllocationManager
	bytes32 public avsId;

	/// @dev requestId => proof bytes (stored separately for verification)
	mapping(bytes32 => mapping(address => bytes)) private _proofBytes;

	address public admin;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	modifier onlyAVS() {
		// Check if operator is registered to this AVS via EigenLayer
		if (avsId == bytes32(0)) revert Errors.InvalidParameter(); // AVS not registered yet
		if (!allocationManager.isOperatorRegisteredToAVS(msg.sender, avsId)) {
			revert Errors.Unauthorized();
		}
		_;
	}

	constructor(
		address admin_,
		address delegationManager_,
		address allocationManager_,
		address slashingCoordinator_,
		address eigenVerify_ // Optional - can be address(0) if not available
	) {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		if (delegationManager_ == address(0)) revert Errors.ZeroAddress();
		if (allocationManager_ == address(0)) revert Errors.ZeroAddress();
		if (slashingCoordinator_ == address(0)) revert Errors.ZeroAddress();
		
		admin = admin_;
		delegationManager = IDelegationManager(delegationManager_);
		allocationManager = IAllocationManager(allocationManager_);
		slashingCoordinator = ISlashingCoordinator(slashingCoordinator_);
		
		// EigenVerify is optional - only set if provided
		if (eigenVerify_ != address(0)) {
			eigenVerify = IEigenVerify(eigenVerify_);
		}
	}

	/// @notice Set the AVS ID after registration with EigenLayer AllocationManager
	/// @param avsId_ The AVS ID returned from AllocationManager.registerAVS()
	function setAVSId(bytes32 avsId_) external onlyAdmin {
		if (avsId_ == bytes32(0)) revert Errors.InvalidParameter();
		avsId = avsId_;
		emit AVSNodeUpdated(address(0), true); // Emit event for compatibility
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
		bytes calldata proof
	) internal {
		// Slash operator via EigenLayer SlashingCoordinator
		if (avsId != bytes32(0)) {
			// Encode slashing parameters (can be customized based on AVS requirements)
			bytes memory slashingParams = abi.encode(requestId, proof);
			slashingCoordinator.slashOperator(operator, avsId, slashingParams);
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

		// Check operator is registered to this AVS via EigenLayer
		if (avsId == bytes32(0)) revert Errors.InvalidParameter(); // AVS not registered
		if (!allocationManager.isOperatorRegisteredToAVS(operator, avsId)) {
			revert Errors.Unauthorized();
		}

		// Get operator's stake from EigenLayer DelegationManager
		uint256 weight = delegationManager.operatorShares(operator, address(this));
		if (weight == 0) revert Errors.Unauthorized();

		// Check operator hasn't already attested
		for (uint256 i = 0; i < _attestations[requestId].length; i++) {
			if (_attestations[requestId][i].operator == operator) {
				revert Errors.AlreadyFulfilled();
			}
		}

		// Verify EigenVerify proof if EigenVerify is configured
		if (address(eigenVerify) != address(0)) {
			// Construct dataSpec from request data
			bytes memory dataSpec = _constructDataSpec(req.data, outcome, timestamp);
			
			// Verify EigenVerify proof before accepting attestation
			(bool valid, string memory result) = eigenVerify.verify(proof, dataSpec);
			
			if (!valid) {
				_slashOperatorForInvalidProof(requestId, operator, proof);
				revert Errors.InvalidParameter(); // Reject attestation
			}

			// Verify result matches outcome
			bool resultBool = keccak256(bytes(result)) == keccak256(bytes("YES"));
			if (resultBool != outcome) {
				_slashOperatorForInvalidProof(requestId, operator, proof);
				revert Errors.InvalidParameter();
			}
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
		uint256 totalWeight = _getTotalOperatorWeight();
		uint256 requiredWeight = (totalWeight * quorumThreshold) / 100;
		
		if (outcomeWeight >= requiredWeight && totalWeight > 0) {
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

	/// @notice Get total operator weight from EigenLayer
	/// @dev Sums up all operator shares for this AVS
	function _getTotalOperatorWeight() internal view returns (uint256) {
		if (avsId == bytes32(0)) return 0;
		
		address[] memory operators = allocationManager.getAVSOperators(avsId);
		uint256 total = 0;
		
		for (uint256 i = 0; i < operators.length; i++) {
			total += delegationManager.operatorShares(operators[i], address(this));
		}
		
		return total;
	}

	/// @notice Check if quorum is reached for a specific outcome
	function _isQuorumReached(bytes32 requestId, bool outcome) internal view returns (bool) {
		uint256 totalWeight = _getTotalOperatorWeight();
		if (totalWeight == 0) return false;
		
		uint256 outcomeWeight = _outcomeWeights[requestId][outcome];
		uint256 requiredWeight = (totalWeight * quorumThreshold) / 100;
		
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
		uint256 totalWeight = _getTotalOperatorWeight();
		requiredWeight = (totalWeight * quorumThreshold) / 100;
		yesWeight = _outcomeWeights[requestId][true];
		noWeight = _outcomeWeights[requestId][false];
		isQuorumReached = (yesWeight >= requiredWeight || noWeight >= requiredWeight) && totalWeight > 0;
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

	/// @notice Get the total operator weight for this AVS
	/// @return totalWeight Sum of all operator shares for this AVS
	function getTotalOperatorWeight() external view returns (uint256 totalWeight) {
		return _getTotalOperatorWeight();
	}

	/// @notice Check if an operator is registered to this AVS
	/// @param operator The operator address
	/// @return isRegistered True if the operator is registered
	function isOperatorRegistered(address operator) external view returns (bool isRegistered) {
		if (avsId == bytes32(0)) return false;
		return allocationManager.isOperatorRegisteredToAVS(operator, avsId);
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

	// ==========================================
	// IVPOOracle Implementation
	// ==========================================

	/// @dev Mapping from marketId to the latest requestId
	mapping(bytes32 => bytes32) public marketToRequestId;

	/// @notice Request resolution (IVPOOracle adapter)
	function requestResolve(bytes32 marketId, bytes calldata extraData) external {
		// Call internal logic or public function
		// We use extraData as the 'data' (source, logic)
		bytes32 requestId = this.requestResolution(marketId, extraData);
		marketToRequestId[marketId] = requestId;
		
		// IVPOOracle expects ResolveRequested event from the Oracle
		// But Market.sol doesn't strictly require it, it just calls requestResolve.
		// However, for indexers, we might want to emit it.
		// IVPOOracle defines: event ResolveRequested(bytes32 indexed marketId, address indexed requester, bytes extraData);
		// But we can't emit events defined in interface unless we redefine them or inherit.
		// We inherit IVeyraOracleAVS which inherits IVPOOracle? No, IVeyraOracleAVS might not.
		// Let's check inheritance. If not, we can't emit IVPOOracle events easily without redefining.
		// But VeyraOracleAVS emits VerificationRequested, which is what our AVS node listens to.
		// So we are good.
	}

	/// @notice Get result (IVPOOracle adapter)
	function getResult(bytes32 marketId)
		external
		view
		returns (bool resolved, bytes memory resultData, bytes memory metadata)
	{
		bytes32 requestId = marketToRequestId[marketId];
		if (requestId == bytes32(0)) {
			return (false, "", "");
		}

		Request memory req = _requests[requestId];
		if (!req.fulfilled) {
			return (false, "", "");
		}

		// Market expects resultData to be abi.encode(uint8 outcome)
		// Our outcome is bool. 0 = NO (Short), 1 = YES (Long)
		uint8 outcomeInt = req.outcome ? 1 : 0;
		resultData = abi.encode(outcomeInt);
		metadata = req.metadata;
		resolved = true;
	}
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVeyraOracleAVS} from "../interfaces/IVeyraOracleAVS.sol";
import {IUMAOptimisticOracle} from "../interfaces/IUMAOptimisticOracle.sol";
import {Errors} from "../security/Errors.sol";

/// @title UMA Adapter
/// @notice Bridges UMA Optimistic Oracle assertions with VeyraOracleAVS for verifiable outcomes
/// @dev Listens to UMA assertions, requests verification from VeyraOracleAVS, and submits outcomes back to UMA
contract UMAAdapter {
	/// @notice The VeyraOracleAVS contract
	IVeyraOracleAVS public immutable veyraOracleAVS;

	/// @notice The UMA Optimistic Oracle contract
	IUMAOptimisticOracle public immutable umaOracle;

	/// @notice Admin address
	address public admin;

	/// @notice Mapping from UMA assertion ID to VeyraOracleAVS request ID
	mapping(bytes32 => bytes32) public assertionToRequest;

	/// @notice Mapping from VeyraOracleAVS request ID to UMA assertion ID
	mapping(bytes32 => bytes32) public requestToAssertion;

	/// @notice Mapping to track if an assertion has been submitted to UMA
	mapping(bytes32 => bool) public assertionSubmitted;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	constructor(address veyraOracleAVS_, address umaOracle_, address admin_) {
		if (veyraOracleAVS_ == address(0)) revert Errors.ZeroAddress();
		if (umaOracle_ == address(0)) revert Errors.ZeroAddress();
		if (admin_ == address(0)) revert Errors.ZeroAddress();

		veyraOracleAVS = IVeyraOracleAVS(veyraOracleAVS_);
		umaOracle = IUMAOptimisticOracle(umaOracle_);
		admin = admin_;
	}

	/// @notice Handle a new UMA assertion by requesting resolution from VeyraOracleAVS
	/// @param assertionId The UMA assertion ID
	/// @param claim The claim being asserted (encoded question/data)
	/// @param data Additional data for VeyraOracleAVS (data sources, timestamps, etc.)
	/// @return requestId The VeyraOracleAVS request ID
	function handleAssertion(
		bytes32 assertionId,
		bytes calldata claim,
		bytes calldata data
	) external returns (bytes32 requestId) {
		// Check assertion exists and is not already handled
		(, , , , , , , , bool settled, ) = umaOracle.getAssertion(assertionId);
		if (settled) revert Errors.AlreadyFulfilled();

		if (assertionToRequest[assertionId] != bytes32(0)) {
			revert Errors.AlreadyFulfilled(); // Already handled
		}

		// Request resolution from VeyraOracleAVS
		// Use assertionId as marketRef
		requestId = veyraOracleAVS.requestResolution(assertionId, data);

		// Store mapping
		assertionToRequest[assertionId] = requestId;
		requestToAssertion[requestId] = assertionId;

		emit AssertionHandled(assertionId, requestId, claim);
	}

	/// @notice Submit verified outcome to UMA after VeyraOracleAVS fulfillment
	/// @param requestId The VeyraOracleAVS request ID
	/// @param claim The claim to assert (should match original UMA assertion claim)
	/// @param liveness The liveness period for disputes (in seconds)
	/// @param currency The currency for bonds (address(0) for native)
	/// @param bond The bond amount (can be 0)
	/// @param identifier The identifier for the assertion
	/// @return assertionId The UMA assertion ID (may be new or existing)
	function submitOutcomeToUMA(
		bytes32 requestId,
		bytes calldata claim,
		uint64 liveness,
		address currency,
		uint256 bond,
		bytes32 identifier
	) external onlyAdmin returns (bytes32 assertionId) {
		// Get the original assertion ID
		assertionId = requestToAssertion[requestId];
		if (assertionId == bytes32(0)) revert Errors.NotFound();

		// Check VeyraOracleAVS fulfillment
		(bool exists, , bool outcome, ) = veyraOracleAVS.getFulfillment(requestId);
		if (!exists) revert Errors.NotFound();

		// Check if already submitted
		if (assertionSubmitted[assertionId]) revert Errors.AlreadyFulfilled();

		// Check if original assertion is already settled
		bool settled = _isAssertionSettled(assertionId);
		if (settled) {
			bool settlementResolution = _getSettlementResolution(assertionId);
			assertionSubmitted[assertionId] = true;
			emit OutcomeSubmitted(assertionId, requestId, settlementResolution);
			return assertionId;
		}

		// Create new assertion with verified outcome
		bytes memory outcomeClaim = abi.encode(claim, outcome);
		bytes32 newAssertionId = _createUMAAssertion(
			outcomeClaim,
			liveness,
			currency,
			bond,
			identifier
		);

		// Mark as submitted
		assertionSubmitted[assertionId] = true;

		emit OutcomeSubmitted(assertionId, requestId, outcome);
		emit UMAAssertionCreated(newAssertionId, assertionId, outcome);
	}

	/// @dev Check if an assertion is settled
	function _isAssertionSettled(bytes32 assertionId) internal view returns (bool) {
		(, , , , , , , , bool settled, ) = umaOracle.getAssertion(assertionId);
		return settled;
	}

	/// @dev Get settlement resolution
	function _getSettlementResolution(bytes32 assertionId) internal view returns (bool) {
		(, , , , , , , , , bool settlementResolution) = umaOracle.getAssertion(assertionId);
		return settlementResolution;
	}

	/// @dev Create UMA assertion
	function _createUMAAssertion(
		bytes memory outcomeClaim,
		uint64 liveness,
		address currency,
		uint256 bond,
		bytes32 identifier
	) internal returns (bytes32) {
		return umaOracle.assertTruth(
			outcomeClaim,
			address(this), // asserter
			address(0), // callbackRecipient
			address(0), // escalationManager
			liveness,
			currency,
			bond,
			identifier
		);
	}

	/// @notice Get the VeyraOracleAVS request ID for a UMA assertion
	/// @param assertionId The UMA assertion ID
	/// @return requestId The VeyraOracleAVS request ID (bytes32(0) if not found)
	function getRequestId(bytes32 assertionId) external view returns (bytes32 requestId) {
		return assertionToRequest[assertionId];
	}

	/// @notice Get the UMA assertion ID for a VeyraOracleAVS request
	/// @param requestId The VeyraOracleAVS request ID
	/// @return assertionId The UMA assertion ID (bytes32(0) if not found)
	function getAssertionId(bytes32 requestId) external view returns (bytes32 assertionId) {
		return requestToAssertion[requestId];
	}

	/// @notice Event emitted when a UMA assertion is handled
	event AssertionHandled(
		bytes32 indexed assertionId,
		bytes32 indexed requestId,
		bytes claim
	);

	/// @notice Event emitted when an outcome is submitted to UMA
	event OutcomeSubmitted(
		bytes32 indexed assertionId,
		bytes32 indexed requestId,
		bool outcome
	);

	/// @notice Event emitted when a new UMA assertion is created
	event UMAAssertionCreated(
		bytes32 indexed newAssertionId,
		bytes32 indexed originalAssertionId,
		bool outcome
	);
}


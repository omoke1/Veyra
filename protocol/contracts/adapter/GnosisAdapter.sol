// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVPOAdapter} from "../interfaces/IVPOAdapter.sol";
import {IGnosisConditionalTokens} from "../interfaces/IGnosisConditionalTokens.sol";
import {Errors} from "../security/Errors.sol";

/// @title Gnosis Adapter
/// @notice Bridges Gnosis Conditional Tokens with VPOAdapter for verifiable outcomes
/// @dev Listens to Gnosis condition events, requests verification from VPOAdapter, and sets outcomes
contract GnosisAdapter {
	/// @notice The VPOAdapter contract
	IVPOAdapter public immutable vpoAdapter;

	/// @notice The Gnosis ConditionalTokens contract
	IGnosisConditionalTokens public immutable conditionalTokens;

	/// @notice Admin address
	address public admin;

	/// @notice Mapping from condition ID to VPOAdapter request ID
	mapping(bytes32 => bytes32) public conditionToRequest;

	/// @notice Mapping from VPOAdapter request ID to condition ID
	mapping(bytes32 => bytes32) public requestToCondition;

	/// @notice Mapping to track if a condition has been resolved
	mapping(bytes32 => bool) public conditionResolved;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	constructor(
		address vpoAdapter_,
		address conditionalTokens_,
		address admin_
	) {
		if (vpoAdapter_ == address(0)) revert Errors.ZeroAddress();
		if (conditionalTokens_ == address(0)) revert Errors.ZeroAddress();
		if (admin_ == address(0)) revert Errors.ZeroAddress();

		vpoAdapter = IVPOAdapter(vpoAdapter_);
		conditionalTokens = IGnosisConditionalTokens(conditionalTokens_);
		admin = admin_;
	}

	/// @notice Handle a new Gnosis condition by requesting verification from VPOAdapter
	/// @param conditionId The Gnosis condition ID
	/// @param questionId The question ID (bytes32 identifier)
	/// @param outcomeSlotCount The number of outcome slots
	/// @param data Additional data for VPOAdapter (data sources, timestamps, etc.)
	/// @return requestId The VPOAdapter request ID
	function handleCondition(
		bytes32 conditionId,
		bytes32 questionId,
		uint256 outcomeSlotCount,
		bytes calldata data
	) external returns (bytes32 requestId) {
		// Check condition is not already resolved
		(bool resolved, ) = conditionalTokens.getConditionPayouts(conditionId);
		if (resolved) revert Errors.AlreadyFulfilled();

		if (conditionToRequest[conditionId] != bytes32(0)) {
			revert Errors.AlreadyFulfilled(); // Already handled
		}

		// Request verification from VPOAdapter
		// Use conditionId as marketRef
		requestId = vpoAdapter.requestVerification(conditionId, data);

		// Store mapping
		conditionToRequest[conditionId] = requestId;
		requestToCondition[requestId] = conditionId;

		emit ConditionHandled(conditionId, requestId, questionId, outcomeSlotCount);
	}

	/// @notice Resolve a condition after VPOAdapter fulfillment
	/// @param requestId The VPOAdapter request ID
	/// @param outcomeSlotCount The number of outcome slots (must match condition)
	/// @return conditionId The Gnosis condition ID
	function resolveCondition(
		bytes32 requestId,
		uint256 outcomeSlotCount
	) external onlyAdmin returns (bytes32 conditionId) {
		// Get the condition ID
		conditionId = requestToCondition[requestId];
		if (conditionId == bytes32(0)) revert Errors.NotFound();

		// Check VPOAdapter fulfillment
		(bool exists, , bool outcome, ) = vpoAdapter.getFulfillment(requestId);
		if (!exists) revert Errors.NotFound();

		// Check if already resolved
		if (conditionResolved[conditionId]) revert Errors.AlreadyFulfilled();

		// Verify condition is not already resolved on Gnosis side
		(bool resolved, ) = conditionalTokens.getConditionPayouts(conditionId);
		if (resolved) {
			conditionResolved[conditionId] = true;
			emit ConditionResolved(conditionId, requestId, outcome);
			return conditionId;
		}

		// Create payouts array
		// For binary markets: outcomeSlotCount should be 2
		// outcome = true means slot 0 wins (YES), outcome = false means slot 1 wins (NO)
		uint256[] memory payouts = new uint256[](outcomeSlotCount);
		
		if (outcome) {
			// YES wins: slot 0 gets full payout
			payouts[0] = 1;
			for (uint256 i = 1; i < outcomeSlotCount; i++) {
				payouts[i] = 0;
			}
		} else {
			// NO wins: slot 1 gets full payout (or last slot if more than 2)
			payouts[0] = 0;
			if (outcomeSlotCount > 1) {
				payouts[outcomeSlotCount - 1] = 1;
				for (uint256 i = 1; i < outcomeSlotCount - 1; i++) {
					payouts[i] = 0;
				}
			}
		}

		// Report payouts to Gnosis
		conditionalTokens.reportPayouts(conditionId, payouts);

		// Mark as resolved
		conditionResolved[conditionId] = true;

		emit ConditionResolved(conditionId, requestId, outcome);
	}

	/// @notice Get the VPOAdapter request ID for a Gnosis condition
	/// @param conditionId The Gnosis condition ID
	/// @return requestId The VPOAdapter request ID (bytes32(0) if not found)
	function getRequestId(bytes32 conditionId) external view returns (bytes32 requestId) {
		return conditionToRequest[conditionId];
	}

	/// @notice Get the Gnosis condition ID for a VPOAdapter request
	/// @param requestId The VPOAdapter request ID
	/// @return conditionId The Gnosis condition ID (bytes32(0) if not found)
	function getConditionId(bytes32 requestId) external view returns (bytes32 conditionId) {
		return requestToCondition[requestId];
	}

	/// @notice Event emitted when a Gnosis condition is handled
	event ConditionHandled(
		bytes32 indexed conditionId,
		bytes32 indexed requestId,
		bytes32 questionId,
		uint256 outcomeSlotCount
	);

	/// @notice Event emitted when a condition is resolved
	event ConditionResolved(
		bytes32 indexed conditionId,
		bytes32 indexed requestId,
		bool outcome
	);
}


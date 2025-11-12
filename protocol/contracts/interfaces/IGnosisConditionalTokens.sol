// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Simplified interface for Gnosis Conditional Tokens
/// @dev Based on Gnosis ConditionalTokens contract
interface IGnosisConditionalTokens {
	/// @notice Prepare a condition for a market
	/// @param oracle The oracle address that will resolve the condition
	/// @param questionId The question ID (bytes32 identifier)
	/// @param outcomeSlotCount The number of outcome slots
	/// @return conditionId The unique condition ID
	function prepareCondition(
		address oracle,
		bytes32 questionId,
		uint256 outcomeSlotCount
	) external returns (bytes32 conditionId);

	/// @notice Report payouts for a condition (resolve it)
	/// @param conditionId The condition ID
	/// @param payouts Array of payout amounts for each outcome slot
	function reportPayouts(bytes32 conditionId, uint256[] calldata payouts) external;

	/// @notice Get payout for a specific position
	/// @param conditionId The condition ID
	/// @param outcomeSlot The outcome slot index
	/// @return payout The payout amount for this outcome
	function getPayout(bytes32 conditionId, uint256 outcomeSlot) external view returns (uint256);

	/// @notice Check if a condition is resolved
	/// @param conditionId The condition ID
	/// @return resolved Whether the condition is resolved
	/// @return payouts Array of payout amounts (if resolved)
	function getConditionPayouts(bytes32 conditionId)
		external
		view
		returns (bool resolved, uint256[] memory payouts);

	/// @notice Event emitted when a condition is prepared
	event ConditionPreparation(
		bytes32 indexed conditionId,
		address indexed oracle,
		bytes32 indexed questionId,
		uint256 outcomeSlotCount
	);

	/// @notice Event emitted when payouts are reported
	event PayoutReported(
		bytes32 indexed conditionId,
		uint256[] payouts
	);
}


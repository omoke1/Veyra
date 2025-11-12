// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IGnosisConditionalTokens} from "../interfaces/IGnosisConditionalTokens.sol";

/// @title Mock Gnosis Conditional Tokens
/// @notice Mock implementation for testing GnosisAdapter
contract MockGnosisConditionalTokens is IGnosisConditionalTokens {
	struct ConditionData {
		address oracle;
		bytes32 questionId;
		uint256 outcomeSlotCount;
		bool resolved;
		uint256[] payouts;
	}

	mapping(bytes32 => ConditionData) public conditions;

	/// @notice Prepare a condition for a market
	function prepareCondition(
		address oracle,
		bytes32 questionId,
		uint256 outcomeSlotCount
	) external override returns (bytes32 conditionId) {
		conditionId = keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount, block.timestamp));

		conditions[conditionId] = ConditionData({
			oracle: oracle,
			questionId: questionId,
			outcomeSlotCount: outcomeSlotCount,
			resolved: false,
			payouts: new uint256[](0)
		});

		emit ConditionPreparation(conditionId, oracle, questionId, outcomeSlotCount);
	}

	/// @notice Report payouts for a condition (resolve it)
	function reportPayouts(bytes32 conditionId, uint256[] calldata payouts) external override {
		ConditionData storage c = conditions[conditionId];
		require(c.oracle != address(0), "Condition not found");
		require(!c.resolved, "Already resolved");
		require(payouts.length == c.outcomeSlotCount, "Invalid payout length");

		c.resolved = true;
		c.payouts = payouts;

		emit PayoutReported(conditionId, payouts);
	}

	/// @notice Get payout for a specific position
	function getPayout(bytes32 conditionId, uint256 outcomeSlot) external view override returns (uint256) {
		ConditionData memory c = conditions[conditionId];
		if (!c.resolved || outcomeSlot >= c.payouts.length) {
			return 0;
		}
		return c.payouts[outcomeSlot];
	}

	/// @notice Check if a condition is resolved
	function getConditionPayouts(bytes32 conditionId)
		external
		view
		override
		returns (bool resolved, uint256[] memory payouts)
	{
		ConditionData memory c = conditions[conditionId];
		return (c.resolved, c.payouts);
	}
}


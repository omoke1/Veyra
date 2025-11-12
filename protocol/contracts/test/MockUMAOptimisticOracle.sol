// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IUMAOptimisticOracle} from "../interfaces/IUMAOptimisticOracle.sol";

/// @title Mock UMA Optimistic Oracle
/// @notice Mock implementation for testing UMAAdapter
contract MockUMAOptimisticOracle is IUMAOptimisticOracle {
	struct AssertionData {
		address asserter;
		bytes claim;
		address callbackRecipient;
		address escalationManager;
		uint64 liveness;
		address currency;
		uint256 bond;
		bytes32 identifier;
		bool settled;
		bool settlementResolution;
	}

	mapping(bytes32 => AssertionData) public assertions;

	/// @notice Assert truth about a claim
	function assertTruth(
		bytes memory claim,
		address asserter,
		address callbackRecipient,
		address escalationManager,
		uint64 liveness,
		address currency,
		uint256 bond,
		bytes32 identifier
	) external override returns (bytes32 assertionId) {
		assertionId = keccak256(abi.encodePacked(claim, asserter, block.timestamp, block.prevrandao));

		assertions[assertionId] = AssertionData({
			asserter: asserter,
			claim: claim,
			callbackRecipient: callbackRecipient,
			escalationManager: escalationManager,
			liveness: liveness,
			currency: currency,
			bond: bond,
			identifier: identifier,
			settled: false,
			settlementResolution: false
		});

		emit AssertionMade(
			assertionId,
			claim,
			asserter,
			callbackRecipient,
			escalationManager,
			liveness,
			currency,
			bond,
			identifier
		);
	}

	/// @notice Get assertion data
	function getAssertion(bytes32 assertionId)
		external
		view
		override
		returns (
			address asserter,
			bytes memory claim,
			address callbackRecipient,
			address escalationManager,
			uint64 liveness,
			address currency,
			uint256 bond,
			bytes32 identifier,
			bool settled,
			bool settlementResolution
		)
	{
		AssertionData memory a = assertions[assertionId];
		return (
			a.asserter,
			a.claim,
			a.callbackRecipient,
			a.escalationManager,
			a.liveness,
			a.currency,
			a.bond,
			a.identifier,
			a.settled,
			a.settlementResolution
		);
	}

	/// @notice Settle an assertion (for testing)
	function settleAssertion(bytes32 assertionId, bool resolution) external {
		AssertionData storage a = assertions[assertionId];
		require(a.asserter != address(0), "Assertion not found");
		require(!a.settled, "Already settled");

		a.settled = true;
		a.settlementResolution = resolution;

		emit AssertionSettled(assertionId, resolution);
	}
}


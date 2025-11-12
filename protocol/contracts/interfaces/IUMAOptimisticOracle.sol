// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Simplified interface for UMA Optimistic Oracle V3
/// @dev Based on UMA's OptimisticOracleV3 contract
interface IUMAOptimisticOracle {
	/// @notice Assert truth about a claim
	/// @param claim The claim being asserted
	/// @param asserter The address making the assertion
	/// @param callbackRecipient The recipient of the callback (if any)
	/// @param escalationManager The escalation manager (if any)
	/// @param liveness The liveness period for disputes
	/// @param currency The currency for bonds
	/// @param bond The bond amount
	/// @param identifier The identifier for the assertion
	/// @return assertionId The unique identifier for this assertion
	function assertTruth(
		bytes memory claim,
		address asserter,
		address callbackRecipient,
		address escalationManager,
		uint64 liveness,
		address currency,
		uint256 bond,
		bytes32 identifier
	) external returns (bytes32 assertionId);

	/// @notice Get assertion data
	/// @param assertionId The assertion ID
	/// @return asserter The address that made the assertion
	/// @return claim The claim being asserted
	/// @return callbackRecipient The callback recipient
	/// @return escalationManager The escalation manager
	/// @return liveness The liveness period
	/// @return currency The currency
	/// @return bond The bond amount
	/// @return identifier The identifier
	/// @return settled Whether the assertion is settled
	/// @return settlementResolution The resolution (if settled)
	function getAssertion(bytes32 assertionId)
		external
		view
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
		);

	/// @notice Event emitted when an assertion is made
	event AssertionMade(
		bytes32 indexed assertionId,
		bytes claim,
		address indexed asserter,
		address callbackRecipient,
		address escalationManager,
		uint64 liveness,
		address currency,
		uint256 bond,
		bytes32 identifier
	);

	/// @notice Event emitted when an assertion is settled
	event AssertionSettled(
		bytes32 indexed assertionId,
		bool resolution
	);
}


// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IVPOOracle {
	/// @notice Emitted when a resolve request is submitted for a market.
	event ResolveRequested(bytes32 indexed marketId, address indexed requester, bytes extraData);

	/// @notice Emitted when an oracle publishes a result for a market.
	event ResolveFulfilled(bytes32 indexed marketId, bytes resultData, bytes metadata);

	/// @notice Request the oracle to resolve a market. Off-chain infra should process this request.
	/// @param marketId Unique identifier of the market (factory-defined).
	/// @param extraData Optional data for the oracle provider (hints, jobId, etc.).
	function requestResolve(bytes32 marketId, bytes calldata extraData) external;

	/// @notice Get the latest result for a market if available.
	/// @dev result encoding is provider-specific; Market must understand and validate.
	/// @return resolved Whether the oracle has a finalized result.
	/// @return resultData ABI-encoded result payload.
	/// @return metadata ABI-encoded provider metadata (e.g., requestId, timestamps).
	function getResult(bytes32 marketId)
		external
		view
		returns (bool resolved, bytes memory resultData, bytes memory metadata);
}

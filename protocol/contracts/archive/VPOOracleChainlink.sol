// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVPOOracle} from "../interfaces/IVPOOracle.sol";
import {Errors} from "../security/Errors.sol";

/// @title VPO Oracle (Chainlink Functions)
/// @notice Phase 1 oracle that stores attested result + metadata.
contract VPOOracleChainlink is IVPOOracle {
	struct Result {
		bool resolved;
		bytes data; // provider-specific encoding
		bytes metadata; // requestId, timestamps, etc.
	}

	/// @dev marketId => result
	mapping(bytes32 => Result) private _results;

	address public admin;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	constructor(address admin_) {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;
	}

	function requestResolve(bytes32 marketId, bytes calldata extraData) external override {
		emit ResolveRequested(marketId, msg.sender, extraData);
	}

	/// @notice Called by off-chain Functions fulfillment or relayer to store the result.
	function fulfillResult(bytes32 marketId, bytes calldata resultData, bytes calldata metadata)
		external
		onlyAdmin
	{
		_results[marketId] = Result({resolved: true, data: resultData, metadata: metadata});
		emit ResolveFulfilled(marketId, resultData, metadata);
	}

	function getResult(bytes32 marketId)
		external
		view
		override
		returns (bool resolved, bytes memory resultData, bytes memory metadata)
	{
		Result memory r = _results[marketId];
		return (r.resolved, r.data, r.metadata);
	}
}

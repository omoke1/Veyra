// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ISlashingCoordinator} from "../interfaces/ISlashingCoordinator.sol";

/**
 * @title MockSlashingCoordinator
 * @notice Mock implementation of ISlashingCoordinator for testing
 */
contract MockSlashingCoordinator is ISlashingCoordinator {
	mapping(address => mapping(bytes32 => bool)) private _canSlash;
	mapping(address => mapping(bytes32 => uint256)) private _slashedAmounts;

	// Note: OperatorSlashed event is inherited from ISlashingCoordinator interface

	function slashOperator(address operator, bytes32 avsId, bytes calldata slashingParams) external override {
		require(_canSlashOperator(operator, avsId), "Cannot slash operator");
		
		// Extract slash amount from params if provided, otherwise use default
		uint256 slashAmount = 100 ether;
		if (slashingParams.length >= 32) {
			(, slashAmount) = abi.decode(slashingParams, (address, uint256));
		}
		
		_slashedAmounts[operator][avsId] += slashAmount;
		emit OperatorSlashed(operator, avsId, slashAmount);
	}

	function canSlashOperator(address operator, bytes32 avsId) external view override returns (bool canSlash) {
		return _canSlashOperator(operator, avsId);
	}

	function _canSlashOperator(address operator, bytes32 avsId) internal view returns (bool) {
		return _canSlash[operator][avsId] || true; // Default to true for testing
	}

	// Test helpers
	function setCanSlash(address operator, bytes32 avsId, bool canSlash) external {
		_canSlash[operator][avsId] = canSlash;
	}

	function getSlashedAmount(address operator, bytes32 avsId) external view returns (uint256) {
		return _slashedAmounts[operator][avsId];
	}
}



// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IDelegationManager} from "../interfaces/IDelegationManager.sol";

/**
 * @title MockDelegationManager
 * @notice Mock implementation of IDelegationManager for testing
 */
contract MockDelegationManager is IDelegationManager {
	mapping(address => mapping(address => uint256)) private _operatorShares;
	mapping(address => bool) private _operators;

	function operatorShares(address operator, address avs) external view override returns (uint256 shares) {
		return _operatorShares[operator][avs];
	}

	function isOperator(address operator) external view override returns (bool isRegistered) {
		return _operators[operator];
	}

	function getOperatorShares(address operator) external view override returns (uint256 totalShares) {
		// For testing, return a fixed amount
		return _operators[operator] ? 1000 ether : 0;
	}

	// Test helpers
	function setOperatorShares(address operator, address avs, uint256 shares) external {
		_operatorShares[operator][avs] = shares;
		_operators[operator] = true;
	}

	function setOperator(address operator, bool isRegistered) external {
		_operators[operator] = isRegistered;
	}
}



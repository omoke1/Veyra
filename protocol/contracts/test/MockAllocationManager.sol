// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IAllocationManager} from "../interfaces/IAllocationManager.sol";

/**
 * @title MockAllocationManager
 * @notice Mock implementation of IAllocationManager for testing
 */
contract MockAllocationManager is IAllocationManager {
	mapping(bytes32 => address[]) private _avsOperators;
	mapping(address => bytes32) private _avsIds;
	mapping(bytes32 => mapping(address => bool)) private _operatorRegistered;

	bytes32 private _nextAvsId = keccak256("test-avs-1");

	function registerAVS(string calldata /* metadataURI */, bytes calldata slashingParams)
		external
		override
		returns (bytes32 avsId)
	{
		avsId = _nextAvsId;
		
		// Extract AVS address from slashing params (first encoded parameter)
		// Expected format: abi.encode(address avsAddress, uint256 quorumThreshold, ...)
		address avsAddress = msg.sender; // Default to msg.sender
		if (slashingParams.length >= 32) {
			// Try to decode the first parameter as an address
			(avsAddress) = abi.decode(slashingParams, (address));
		}
		
		_avsIds[avsAddress] = avsId;
		_nextAvsId = keccak256(abi.encodePacked(_nextAvsId, block.timestamp));
		return avsId;
	}

	function isOperatorRegisteredToAVS(address operator, bytes32 avsId)
		external
		view
		override
		returns (bool isRegistered)
	{
		return _operatorRegistered[avsId][operator];
	}

	function getAVSId(address avsAddress) external view override returns (bytes32 avsId) {
		return _avsIds[avsAddress];
	}

	function getAVSOperators(bytes32 avsId) external view override returns (address[] memory operators) {
		return _avsOperators[avsId];
	}

	// Test helpers
	function registerOperatorToAVS(address operator, bytes32 avsId) external {
		if (!_operatorRegistered[avsId][operator]) {
			_avsOperators[avsId].push(operator);
			_operatorRegistered[avsId][operator] = true;
		}
	}

	function setAVSId(address avsAddress, bytes32 avsId) external {
		_avsIds[avsAddress] = avsId;
	}

	// IAllocationManager interface implementations
	function optInToAVS(bytes32 avsId) external override {
		// Mock implementation - register caller as operator
		if (!_operatorRegistered[avsId][msg.sender]) {
			_avsOperators[avsId].push(msg.sender);
			_operatorRegistered[avsId][msg.sender] = true;
		}
	}

	function optOutOfAVS(bytes32 avsId) external override {
		// Mock implementation - unregister caller as operator
		_operatorRegistered[avsId][msg.sender] = false;
		// Note: Not removing from array for simplicity in tests
	}
}



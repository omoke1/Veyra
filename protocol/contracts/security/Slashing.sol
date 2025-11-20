// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ISlashing} from "../interfaces/ISlashing.sol";
import {Errors} from "./Errors.sol";

/// @title Slashing
/// @notice Tracks operator stake and slashes malicious or incorrect signers
/// @dev Receives "invalid proof" reports from the AVS (VPOAdapter)
contract Slashing is ISlashing {
	/// @dev Mapping of operator address to their stake amount
	mapping(address => uint256) public override stake;

	/// @dev The VPOAdapter contract that can call slash
	address public avs;

	/// @dev Total slashed amount across all operators
	uint256 public totalSlashed;

	modifier onlyAVS() {
		if (msg.sender != avs) revert Errors.Unauthorized();
		_;
	}

	constructor(address avs_) {
		// Allow zero address in constructor for deployment flexibility
		// AVS address can be set later via setAVS if needed
		avs = avs_;
	}

	/// @notice Set the AVS address (can only be called once if zero, or by admin to update)
	/// @param avs_ The VPOAdapter contract address
	function setAVS(address avs_) external {
		if (avs_ == address(0)) revert Errors.ZeroAddress();
		if (avs != address(0)) revert Errors.InvalidParameter(); // Can only set once
		avs = avs_;
		emit AVSUpdated(avs_);
	}

	/// @notice Slash an operator's stake
	/// @param operator The operator to slash
	/// @param amount The amount to slash
	/// @dev Only callable by the VPOAdapter
	function slash(address operator, uint256 amount) external override onlyAVS {
		if (operator == address(0)) revert Errors.ZeroAddress();
		if (amount == 0) revert Errors.InvalidParameter();

		uint256 currentStake = stake[operator];
		if (currentStake == 0) revert Errors.InvalidParameter();

		// Slash amount cannot exceed current stake
		uint256 slashAmount = amount > currentStake ? currentStake : amount;

		// Decrease operator's stake
		stake[operator] = currentStake - slashAmount;

		// Update total slashed
		totalSlashed += slashAmount;

		emit Slashed(operator, slashAmount);
	}

	/// @notice Add stake for an operator (called by admin or external staking contract)
	/// @param operator The operator address
	/// @param amount The amount to add
	/// @dev For MVP, this can be called by admin. In production, this would be handled by EigenLayer
	function addStake(address operator, uint256 amount) external {
		// For MVP: allow admin or a designated staking contract to add stake
		// In production, this would integrate with EigenLayer's staking mechanism
		if (operator == address(0)) revert Errors.ZeroAddress();
		if (amount == 0) revert Errors.InvalidParameter();

		stake[operator] += amount;
		emit StakeAdded(operator, amount);
	}

	/// @notice Remove stake for an operator (called by admin or external staking contract)
	/// @param operator The operator address
	/// @param amount The amount to remove
	/// @dev For MVP, this can be called by admin. In production, this would be handled by EigenLayer
	function removeStake(address operator, uint256 amount) external {
		if (operator == address(0)) revert Errors.ZeroAddress();
		if (amount == 0) revert Errors.InvalidParameter();

		uint256 currentStake = stake[operator];
		if (amount > currentStake) revert Errors.InsufficientBalance();

		stake[operator] = currentStake - amount;
		emit StakeRemoved(operator, amount);
	}

	/// @notice Event emitted when stake is added
	event StakeAdded(address indexed operator, uint256 amount);

	/// @notice Event emitted when stake is removed
	event StakeRemoved(address indexed operator, uint256 amount);

	/// @notice Event emitted when AVS address is updated
	event AVSUpdated(address indexed avs);
}


// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Interface for Slashing contract
/// @dev Tracks operator stake and slashes malicious or incorrect signers
interface ISlashing {
	/// @notice Get the current stake for an operator
	/// @param operator The operator address
	/// @return stake The current stake amount
	function stake(address operator) external view returns (uint256 stake);

	/// @notice Slash an operator's stake
	/// @param operator The operator to slash
	/// @param amount The amount to slash
	function slash(address operator, uint256 amount) external;

	/// @notice Emitted when an operator is slashed
	event Slashed(address indexed operator, uint256 amount);
}


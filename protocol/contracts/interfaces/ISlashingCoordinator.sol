// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title ISlashingCoordinator
 * @notice Interface for EigenLayer's SlashingCoordinator contract
 * @dev Handles slashing operations for misbehaving operators
 * Source: https://github.com/Layr-Labs/eigenlayer-contracts
 */
interface ISlashingCoordinator {
	/**
	 * @notice Slash an operator for misbehavior
	 * @param operator The operator to slash
	 * @param avsId The AVS ID where the misbehavior occurred
	 * @param slashingParams Parameters for the slashing operation
	 */
	function slashOperator(
		address operator,
		bytes32 avsId,
		bytes calldata slashingParams
	) external;

	/**
	 * @notice Check if an operator can be slashed
	 * @param operator The operator address
	 * @param avsId The AVS ID
	 * @return canSlash True if the operator can be slashed
	 */
	function canSlashOperator(address operator, bytes32 avsId) external view returns (bool canSlash);

	/**
	 * @notice Emitted when an operator is slashed
	 */
	event OperatorSlashed(address indexed operator, bytes32 indexed avsId, uint256 slashedAmount);
}



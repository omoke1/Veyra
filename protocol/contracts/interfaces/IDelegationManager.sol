// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title IDelegationManager
 * @notice Interface for EigenLayer's DelegationManager contract
 * @dev This interface should be updated to match the official EigenLayer contracts
 * Source: https://github.com/Layr-Labs/eigenlayer-contracts
 */
interface IDelegationManager {
	/**
	 * @notice Get the total shares delegated to an operator for a specific AVS
	 * @param operator The operator address
	 * @param avs The AVS contract address
	 * @return shares The total shares delegated to the operator for this AVS
	 */
	function operatorShares(address operator, address avs) external view returns (uint256 shares);

	/**
	 * @notice Check if an operator is registered
	 * @param operator The operator address
	 * @return isRegistered True if the operator is registered
	 */
	function isOperator(address operator) external view returns (bool isRegistered);

	/**
	 * @notice Get the total shares delegated to an operator across all strategies
	 * @param operator The operator address
	 * @return totalShares The total shares delegated
	 */
	function getOperatorShares(address operator) external view returns (uint256 totalShares);
}



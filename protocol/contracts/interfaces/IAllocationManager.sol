// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title IAllocationManager
 * @notice Interface for EigenLayer's AllocationManager contract
 * @dev Replaces AVSDirectory - manages operator sets and AVS registrations
 * Source: https://github.com/Layr-Labs/eigenlayer-contracts
 */
interface IAllocationManager {
	/**
	 * @notice Register an AVS (Actively Validated Service)
	 * @param metadataURI URI containing AVS metadata
	 * @param slashingParams Parameters for slashing configuration
	 * @return avsId The registered AVS ID
	 */
	function registerAVS(string calldata metadataURI, bytes calldata slashingParams) external returns (bytes32 avsId);

	/**
	 * @notice Check if an operator is registered to an AVS
	 * @param operator The operator address
	 * @param avsId The AVS ID
	 * @return isRegistered True if the operator is registered to the AVS
	 */
	function isOperatorRegisteredToAVS(address operator, bytes32 avsId) external view returns (bool isRegistered);

	/**
	 * @notice Get the AVS ID for a given AVS contract address
	 * @param avsAddress The AVS contract address
	 * @return avsId The AVS ID
	 */
	function getAVSId(address avsAddress) external view returns (bytes32 avsId);

	/**
	 * @notice Get all operators registered to an AVS
	 * @param avsId The AVS ID
	 * @return operators Array of operator addresses
	 */
	function getAVSOperators(bytes32 avsId) external view returns (address[] memory operators);

	/**
	 * @notice Operator opts into an AVS
	 * @param avsId The AVS ID to opt into
	 * @dev Operators call this to register themselves with an AVS
	 * Note: Actual function name may vary - check EigenLayer documentation
	 */
	function optInToAVS(bytes32 avsId) external;

	/**
	 * @notice Operator opts out of an AVS
	 * @param avsId The AVS ID to opt out of
	 * @dev Operators call this to unregister from an AVS
	 * Note: Actual function name may vary - check EigenLayer documentation
	 */
	function optOutOfAVS(bytes32 avsId) external;
}


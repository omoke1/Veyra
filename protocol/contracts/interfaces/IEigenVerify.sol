// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Interface for EigenVerify proof verification
/// @dev This interface should be updated to match the official EigenLayer EigenVerify service
/// Source: https://github.com/Layr-Labs/eigenlayer-contracts or EigenCloud documentation
/// Note: Official EigenVerify may not be available on Sepolia - verify availability before use
interface IEigenVerify {
	/// @notice Verify a proof of correctness for a computation
	/// @param proof Encoded proof containing data source hash, computation code hash, output result hash, and signature
	/// @param dataSpec Encoded data specification containing data sources, query details, timestamps
	/// @return valid Whether the proof is valid
	/// @return result The resolved result as a string (e.g., "YES", "NO", or the actual outcome)
	function verify(bytes calldata proof, bytes calldata dataSpec)
		external
		view
		returns (bool valid, string memory result);
}


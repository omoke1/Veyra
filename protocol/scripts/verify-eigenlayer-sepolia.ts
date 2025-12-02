import { ethers } from "hardhat";

/**
 * Verify EigenLayer Contract Availability on Sepolia
 * 
 * This script attempts to verify which EigenLayer contracts are actually
 * deployed and working on Sepolia testnet.
 * 
 * Usage:
 *   npx hardhat run scripts/verify-eigenlayer-sepolia.ts --network sepolia
 */

async function main() {
	console.log("\n🔍 Verifying EigenLayer Contracts on Sepolia...\n");

	const contracts = {
		DelegationManager: "0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A",
		StrategyManager: "0x858646372CC42E1A627fcE94aa7A7033e7CF075A",
		AllocationManager: "0x948a420b8CC1d6BFd0B6087C2E7c344a2CD0bc39", // Mainnet address - likely not on Sepolia
		SlashingCoordinator: "0x0000000000000000000000000000000000000000", // Unknown
		EigenPodManager: "0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338",
		RewardsCoordinator: "0x7750d328b314EfFa365A0402CcfD489B80B0adda",
	};

	const IDelegationManager = [
		"function operatorShares(address operator, address strategy) external view returns (uint256)",
		"function isOperator(address operator) external view returns (bool)",
	];

	const IAllocationManager = [
		"function isOperatorRegisteredToAVS(address operator, bytes32 avsId) external view returns (bool)",
		"function getAVSId(address avsAddress) external view returns (bytes32)",
	];

	for (const [name, address] of Object.entries(contracts)) {
		console.log(`\n📋 ${name}: ${address}`);
		
		try {
			// Check if contract exists (has code)
			const code = await ethers.provider.getCode(address);
			
			if (code === "0x") {
				console.log("   ❌ No contract code at this address");
				continue;
			}

			console.log("   ✅ Contract code found");

			// Try to interact with it based on known interface
			if (name === "DelegationManager") {
				const contract = new ethers.Contract(address, IDelegationManager, ethers.provider);
				try {
					// Try a simple view call
					const isOp = await contract.isOperator(ethers.ZeroAddress);
					console.log("   ✅ DelegationManager interface working - isOperator() callable");
				} catch (e: any) {
					console.log("   ⚠️  Contract exists but interface may be different:", e.message);
				}
			}

			if (name === "AllocationManager") {
				const contract = new ethers.Contract(address, IAllocationManager, ethers.provider);
				try {
					// Try to call a method
					const avsId = await contract.getAVSId(ethers.ZeroAddress);
					console.log("   ✅ AllocationManager interface working - getAVSId() callable");
				} catch (e: any) {
					console.log("   ⚠️  Contract exists but interface may be different:", e.message);
				}
			}

		} catch (error: any) {
			console.log("   ❌ Error checking contract:", error.message);
		}
	}

	console.log("\n" + "=".repeat(80));
	console.log("📊 Summary & Recommendations");
	console.log("=".repeat(80));
	console.log("\nBased on the verification above:");
	console.log("\n✅ USE REAL if contract code found and interface works");
	console.log("❌ USE MOCK if no contract code or interface incompatible");
	console.log("\n💡 Alternative Approaches:");
	console.log("\n1. Use Holesky Testnet Instead:");
	console.log("   - Holesky may have newer EigenLayer deployments");
	console.log("   - Check: https://github.com/Layr-Labs/eigenlayer-contracts");
	console.log("\n2. Modify VeyraOracleAVS to Make Dependencies Optional:");
	console.log("   - Allow zero addresses for AllocationManager/SlashingCoordinator");
	console.log("   - Add fallback logic when these aren't available");
	console.log("\n3. Deploy Mocks (Current Approach):");
	console.log("   - Full control over testing");
	console.log("   - No waiting for official deployments");
	console.log("   - Easy migration path when real contracts available");
	console.log("\n4. Contact EigenLayer Team:");
	console.log("   - Ask about Sepolia deployment timeline");
	console.log("   - Request early access to testnet contracts");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

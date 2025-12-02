import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Register an operator to VeyraOracleAVS on Sepolia
 * 
 * This script:
 * 1. Registers operator with MockAllocationManager
 * 2. Authorizes operator in EigenVerify
 * 3. (Optional) Sets operator shares in DelegationManager mock
 * 
 * Usage:
 *   OPERATOR_ADDRESS=0x... npx hardhat run scripts/register-operator-sepolia.ts --network sepolia
 */

async function main() {
	const [admin] = await ethers.getSigners();
	console.log("\n🔧 Registering operator...");
	console.log("Admin address:", admin.address);

	// Get operator address from environment variable
	const operatorAddress = process.env.OPERATOR_ADDRESS;
	if (!operatorAddress || !ethers.isAddress(operatorAddress)) {
		console.error("❌ Error: Invalid or missing OPERATOR_ADDRESS environment variable");
		console.error("   Usage: OPERATOR_ADDRESS=0x... npx hardhat run scripts/register-operator-sepolia.ts --network sepolia");
		process.exit(1);
	}

	console.log("Operator address:", operatorAddress);

	// Load deployment config
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	if (!fs.existsSync(configPath)) {
		console.error("❌ Deployment config not found:", configPath);
		console.error("   Please run deploy-sepolia-with-mocks.ts first");
		process.exit(1);
	}

	const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
	const { adapter, avsId, eigenlayer } = config;

	if (!adapter || !avsId || !eigenlayer) {
		console.error("❌ Invalid deployment config - missing required fields");
		process.exit(1);
	}

	console.log("\n📋 Loaded deployment config:");
	console.log("   VeyraOracleAVS:", adapter);
	console.log("   AVS ID:", avsId);
	console.log("   AllocationManager:", eigenlayer.allocationManager);
	console.log("   EigenVerify:", eigenlayer.eigenVerify);

	// Connect to contracts
	const allocationManager = await ethers.getContractAt("MockAllocationManager", eigenlayer.allocationManager);
	const eigenVerify = await ethers.getContractAt("EigenVerify", eigenlayer.eigenVerify);

	// Register operator to AVS
	console.log("\n1️⃣ Registering operator to AVS...");
	const registerTx = await allocationManager.registerOperatorToAVS(operatorAddress, avsId);
	await registerTx.wait();
	console.log("   ✅ Operator registered to AVS");

	// Verify registration
	const isRegistered = await allocationManager.isOperatorRegisteredToAVS(operatorAddress, avsId);
	console.log("   Verification:", isRegistered ? "✅ Registered" : "❌ Not registered");

	// Authorize operator in EigenVerify
	console.log("\n2️⃣ Authorizing operator in EigenVerify...");
	const authTx = await eigenVerify.setAuthorizedVerifier(operatorAddress, true);
	await authTx.wait();
	console.log("   ✅ Operator authorized");

	// Verify authorization
	const isAuthorized = await eigenVerify.authorizedVerifiers(operatorAddress);
	console.log("   Verification:", isAuthorized ? "✅ Authorized" : "❌ Not authorized");

	// Optional: Set operator shares (for testing weight-based quorum)
	// Note: This would require MockDelegationManager implementation
	// For now, VeyraOracleAVS uses AllocationManager for registration checks

	console.log("\n" + "=".repeat(80));
	console.log("🎉 Operator Registration Complete!");
	console.log("=".repeat(80));
	console.log("\n📋 Summary:");
	console.log("   Operator:", operatorAddress);
	console.log("   AVS ID:", avsId);
	console.log("   Registered:", isRegistered ? "✅ Yes" : "❌ No");
	console.log("   Authorized:", isAuthorized ? "✅ Yes" : "❌ No");

	console.log("\n📝 Next Steps:");
	console.log(`1. Update operator's .env file with:`);
	console.log(`   AVS_PRIVATE_KEY=<operator private key>`);
	console.log(`   ADAPTER_ADDRESS=${adapter}`);
	console.log(`   EIGENLAYER_DELEGATION_MANAGER=${eigenlayer.delegationManager}`);
	console.log(`\n2. Start the AVS node for this operator:`);
	console.log(`   cd ../avs && npm start`);
	console.log(`\n3. Create a test market to trigger verification requests:`);
	console.log(`   npx hardhat run scripts/createMarket.ts --network sepolia`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

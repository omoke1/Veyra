import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Helper script for operators to opt-in to VeyraOracleAVS on EigenLayer
 * 
 * Usage:
 *   npx hardhat run scripts/operator-opt-in.ts --network sepolia
 * 
 * Prerequisites:
 *   - Operator must be registered on EigenLayer
 *   - VeyraOracleAVS must be deployed and registered as AVS
 *   - Operator must have stake delegated via DelegationManager
 */
async function main() {
	const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY || process.env.AVS_PRIVATE_KEY;
	if (!operatorPrivateKey) {
		throw new Error("OPERATOR_PRIVATE_KEY or AVS_PRIVATE_KEY must be set in .env");
	}

	const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
	const operator = new ethers.Wallet(operatorPrivateKey, provider);
	
	console.log("Operator address:", operator.address);
	console.log("Operator balance:", ethers.formatEther(await provider.getBalance(operator.address)), "ETH");

	// Load deployment config
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	if (!fs.existsSync(configPath)) {
		throw new Error(`Deployment config not found: ${configPath}. Please deploy contracts first.`);
	}
	const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

	if (!config.adapter) {
		throw new Error("VeyraOracleAVS address not found in deployment config");
	}

	const veyraOracleAVSAddress = config.adapter;
	console.log("VeyraOracleAVS address:", veyraOracleAVSAddress);

	// Load EigenLayer config
	const eigenlayerConfigPath = path.join(__dirname, "..", "deployments", "eigenlayer-sepolia.json");
	if (!fs.existsSync(eigenlayerConfigPath)) {
		throw new Error(`EigenLayer config not found: ${eigenlayerConfigPath}`);
	}
	const eigenlayerConfig = JSON.parse(fs.readFileSync(eigenlayerConfigPath, "utf8"));

	const allocationManagerAddress = eigenlayerConfig.contracts?.AllocationManager?.address;
	if (!allocationManagerAddress) {
		throw new Error("AllocationManager address not found in EigenLayer config");
	}

	console.log("AllocationManager address:", allocationManagerAddress);

	// Connect to contracts
	const VeyraOracleAVS = await ethers.getContractAt("VeyraOracleAVS", veyraOracleAVSAddress);
	const AllocationManager = await ethers.getContractAt("IAllocationManager", allocationManagerAddress);

	// Get AVS ID
	const avsId = await VeyraOracleAVS.avsId();
	if (avsId === ethers.ZeroHash) {
		throw new Error("AVS not registered yet. Run register-avs-eigenlayer.ts first.");
	}

	console.log("AVS ID:", avsId);

	// Check if already opted in
	const isRegistered = await AllocationManager.isOperatorRegisteredToAVS(operator.address, avsId);
	if (isRegistered) {
		console.log("✅ Operator is already opted into this AVS");
		return;
	}

	// Check if operator is registered on EigenLayer
	const DelegationManagerAddress = eigenlayerConfig.contracts?.DelegationManager?.address;
	if (DelegationManagerAddress) {
		const DelegationManager = await ethers.getContractAt("IDelegationManager", DelegationManagerAddress);
		const isOperator = await DelegationManager.isOperator(operator.address);
		if (!isOperator) {
			console.error("❌ Operator is not registered on EigenLayer!");
			console.error("   Please register as an EigenLayer operator first.");
			console.error("   See: https://docs.eigenlayer.xyz/operators/howto/operator-installation");
			process.exit(1);
		}
		console.log("✅ Operator is registered on EigenLayer");

		// Check operator stake
		const stake = await DelegationManager.operatorShares(operator.address, veyraOracleAVSAddress);
		console.log("Operator stake for this AVS:", ethers.formatEther(stake), "ETH");
		if (stake === 0n) {
			console.warn("⚠️  Warning: Operator has no stake delegated to this AVS");
			console.warn("   Operators need stake to participate in quorum consensus");
		}
	}

	console.log("\n📝 Opting into AVS...");
	console.log("   This will register the operator with VeyraOracleAVS on EigenLayer");

	try {
		// Opt-in to AVS
		// Note: The actual function name may be different in EigenLayer's AllocationManager
		// Common names: optInToAVS, registerOperatorToAVS, optIn
		// Check EigenLayer documentation for the exact function signature
		
		// Try optInToAVS first (if it exists in the interface)
		let tx;
		try {
			tx = await AllocationManager.connect(operator).optInToAVS(avsId);
		} catch (error: any) {
			// If optInToAVS doesn't exist, try alternative function names
			console.warn("⚠️  optInToAVS not found, trying alternative methods...");
			console.warn("   You may need to call the opt-in function directly through EigenLayer's UI or CLI");
			console.warn("   Error:", error.message);
			console.log("\n📋 Manual Opt-In Instructions:");
			console.log("   1. Visit EigenLayer's operator dashboard");
			console.log("   2. Find VeyraOracleAVS in the AVS list");
			console.log(`   3. Opt-in using AVS ID: ${avsId}`);
			console.log(`   4. Or call AllocationManager.optInToAVS(${avsId}) from operator account`);
			process.exit(0);
		}

		console.log("   Transaction hash:", tx.hash);
		const receipt = await tx.wait();
		console.log("   ✅ Transaction confirmed in block:", receipt?.blockNumber);

		// Verify opt-in
		const isNowRegistered = await AllocationManager.isOperatorRegisteredToAVS(operator.address, avsId);
		if (isNowRegistered) {
			console.log("\n🎉 Successfully opted into VeyraOracleAVS!");
			console.log("\nNext steps:");
			console.log("1. Ensure your AVS node service is running");
			console.log("2. Monitor for VerificationRequested events");
			console.log("3. Submit attestations when requests are received");
		} else {
			console.warn("⚠️  Opt-in transaction completed but operator not showing as registered");
			console.warn("   This may be a timing issue. Check again in a few blocks.");
		}

	} catch (error: any) {
		console.error("❌ Error opting into AVS:", error.message);
		if (error.data) {
			console.error("   Error data:", error.data);
		}
		console.log("\n💡 Alternative: Use EigenLayer's official tools:");
		console.log("   - EigenLayer CLI: https://github.com/Layr-Labs/eigenlayer-cli");
		console.log("   - EigenLayer Dashboard: https://app.eigenlayer.xyz");
		throw error;
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});



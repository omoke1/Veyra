import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env from contracts folder
dotenv.config({ path: path.join(__dirname, "../contracts/.env") });

/**
 * Register an AVS node in the VPOAdapter contract
 * 
 * Usage:
 * 1. Set AVS_NODE_ADDRESS in .env
 * 2. Run: pnpm run register-avs-node
 * 
 * Or pass address as argument:
 * pnpm ts-node scripts/register-avs-node.ts 0xYourAVSNodeAddress
 */

const VPO_ADAPTER_ABI = [
	"function setAVSNode(address node, bool enabled) external",
	"function avsNodes(address) external view returns (bool)",
	"event AVSNodeUpdated(address indexed node, bool enabled)",
];

async function main() {
	console.log("\n🔐 Registering AVS Node...\n");
	
	// Get AVS node address from argument or env
	const avsNodeAddress = process.argv[2] || process.env.AVS_NODE_ADDRESS;
	
	if (!avsNodeAddress) {
		console.error("❌ AVS node address not provided!");
		console.error("\nUsage:");
		console.error("  1. Set AVS_NODE_ADDRESS in protocol/contracts/.env");
		console.error("  2. Run: pnpm run register-avs-node");
		console.error("\nOr pass as argument:");
		console.error("  pnpm ts-node scripts/register-avs-node.ts 0xYourAVSNodeAddress");
		process.exit(1);
	}
	
	// Validate address
	if (!ethers.isAddress(avsNodeAddress)) {
		console.error(`❌ Invalid address: ${avsNodeAddress}`);
		process.exit(1);
	}
	
	// Get deployment config
	const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
	if (!fs.existsSync(deploymentPath)) {
		console.error("❌ Deployment file not found. Deploy contracts first!");
		process.exit(1);
	}
	
	const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
	const adapterAddress = deployment.adapter;
	
	if (!adapterAddress) {
		console.error("❌ Adapter address not found in deployment file!");
		process.exit(1);
	}
	
	// Check environment variables
	const rpcUrl = process.env.SEPOLIA_RPC_URL;
	const privateKey = process.env.PRIVATE_KEY;
	
	if (!rpcUrl || !privateKey) {
		console.error("❌ SEPOLIA_RPC_URL or PRIVATE_KEY not found in .env");
		process.exit(1);
	}
	
	// Setup provider and wallet
	const provider = new ethers.JsonRpcProvider(rpcUrl);
	const wallet = new ethers.Wallet(privateKey, provider);
	const adapter = new ethers.Contract(adapterAddress, VPO_ADAPTER_ABI, wallet);
	
	console.log("Deployer address:", wallet.address);
	console.log("Adapter address:", adapterAddress);
	console.log("AVS node address:", avsNodeAddress);
	
	// Check if already registered
	const isRegistered = await adapter.avsNodes(avsNodeAddress);
	if (isRegistered) {
		console.log("\n✅ AVS node is already registered!");
		process.exit(0);
	}
	
	// Check if deployer is admin (we'll verify this works)
	console.log("\n📝 Registering AVS node...");
	
	try {
		const tx = await adapter.setAVSNode(avsNodeAddress, true);
		console.log("Transaction hash:", tx.hash);
		console.log("⏳ Waiting for confirmation...");
		
		const receipt = await tx.wait();
		console.log("✅ AVS node registered successfully!");
		console.log("   Block:", receipt?.blockNumber);
		console.log("   Transaction:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
		
		// Verify registration
		const verified = await adapter.avsNodes(avsNodeAddress);
		if (verified) {
			console.log("\n✅ Verification: AVS node is now registered!");
		} else {
			console.log("\n⚠️  Warning: Verification check failed");
		}
		
	} catch (error: any) {
		if (error.message.includes("OnlyAdmin")) {
			console.error("\n❌ Error: Only admin can register AVS nodes!");
			console.error(`   Current deployer: ${wallet.address}`);
			console.error(`   Expected admin: Check the adapter admin address`);
		} else {
			console.error("\n❌ Error registering AVS node:", error.message);
		}
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});





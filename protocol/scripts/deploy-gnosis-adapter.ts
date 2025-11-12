/**
 * Deploy GnosisAdapter to Sepolia or Base Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-gnosis-adapter.ts --network sepolia
 *   npx hardhat run scripts/deploy-gnosis-adapter.ts --network baseSepolia
 * 
 * Prerequisites:
 *   - VPOAdapter must be deployed
 *   - Gnosis ConditionalTokens address must be known
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
	const signers = await ethers.getSigners();
	if (signers.length === 0) {
		console.error("Available env vars:", {
			hasRpcUrl: !!process.env.SEPOLIA_RPC_URL,
			hasPrivateKey: !!process.env.PRIVATE_KEY,
			privateKeyLength: process.env.PRIVATE_KEY?.length || 0,
		});
		throw new Error("No signers available. Check PRIVATE_KEY in .env file");
	}
	const deployer = signers[0];
	console.log("Deploying with account:", deployer.address);

	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Account balance:", ethers.formatEther(balance));

	// Get network info
	const network = await ethers.provider.getNetwork();
	const networkName = network.chainId === 11155111n ? "sepolia" : 
	                   network.chainId === 84532n ? "baseSepolia" : 
	                   "unknown";

	// Load existing deployments to get VPOAdapter address
	const deploymentsDir = path.join(__dirname, "..", "deployments");
	const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
	
	let vpoAdapterAddress = "";
	let conditionalTokensAddress = "";

	if (fs.existsSync(deploymentFile)) {
		const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
		vpoAdapterAddress = deployment.adapter || "";
	}

	// Gnosis Conditional Tokens addresses (real addresses)
	// Mainnet: 0x4D97DCd97eC945f40CF65F87097ACe5EA0476045
	// Sepolia: Check Gnosis docs or use mainnet for testing
	const conditionalTokensAddressRaw = process.env.GNOSIS_CONDITIONAL_TOKENS_ADDRESS || "0x4D97DCd97eC945f40CF65F87097ACe5EA0476045";
	
	if (!conditionalTokensAddressRaw || conditionalTokensAddressRaw === "") {
		console.error("ERROR: GNOSIS_CONDITIONAL_TOKENS_ADDRESS environment variable not set");
		console.error("Please set GNOSIS_CONDITIONAL_TOKENS_ADDRESS to the Gnosis ConditionalTokens address");
		console.error("Mainnet address: 0x4D97DCd97eC945f40CF65F87097ACe5EA0476045");
		process.exit(1);
	}
	
	// Properly checksum the address (convert to lowercase first if needed)
	try {
		conditionalTokensAddress = ethers.getAddress(conditionalTokensAddressRaw.toLowerCase());
	} catch (error) {
		// If checksum fails, try the raw address
		conditionalTokensAddress = conditionalTokensAddressRaw;
	}

	if (!vpoAdapterAddress) {
		console.error("ERROR: VPOAdapter not found in deployments");
		console.error("Please deploy VPOAdapter first");
		process.exit(1);
	}

	console.log("\n📄 Deploying GnosisAdapter...");
	console.log("  VPOAdapter:", vpoAdapterAddress);
	console.log("  ConditionalTokens:", conditionalTokensAddress);

	const GnosisAdapter = await ethers.getContractFactory("GnosisAdapter");
	const adapter = await GnosisAdapter.deploy(
		vpoAdapterAddress,
		conditionalTokensAddress,
		deployer.address // admin
	);
	await adapter.waitForDeployment();

	const adapterAddress = await adapter.getAddress();
	console.log("✅ GnosisAdapter deployed at:", adapterAddress);

	// Save deployment info
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}

	const configPath = path.join(deploymentsDir, `${networkName}-gnosis-adapter.json`);
	const config = {
		network: networkName,
		chainId: network.chainId.toString(),
		deployedAt: new Date().toISOString(),
		gnosisAdapter: adapterAddress,
		vpoAdapter: vpoAdapterAddress,
		conditionalTokens: conditionalTokensAddress,
		deployer: deployer.address,
	};

	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	console.log("\n📝 Deployment info saved to:", configPath);

	console.log("\n🎉 Deployment complete!");
	console.log("\nNext steps:");
	console.log("1. Verify the adapter can handle Gnosis conditions");
	console.log("2. Set up off-chain service to monitor Gnosis events");
	console.log("3. Test end-to-end flow: Gnosis condition → VPOAdapter → outcome resolution");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


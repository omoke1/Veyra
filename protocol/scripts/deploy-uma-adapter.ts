/**
 * Deploy UMAAdapter to Sepolia or Base Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-uma-adapter.ts --network sepolia
 *   npx hardhat run scripts/deploy-uma-adapter.ts --network baseSepolia
 * 
 * Prerequisites:
 *   - VPOAdapter must be deployed
 *   - UMA Optimistic Oracle address must be known
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
	let umaOracleAddress = "";

	if (fs.existsSync(deploymentFile)) {
		const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
		vpoAdapterAddress = deployment.adapter || "";
	}

	// UMA Optimistic Oracle addresses (real addresses)
	// Mainnet: 0xA0Ae660944944eE6d4c27B4bbb4A3B64e5D8b0d1
	// Polygon (Polymarket): Uses same mainnet address
	// Sepolia: Check UMA docs or use mainnet for testing
	const umaOracleAddressRaw = process.env.UMA_ORACLE_ADDRESS || "0xA0Ae660944944eE6d4c27B4bbb4A3B64e5D8b0d1";
	
	if (!umaOracleAddressRaw || umaOracleAddressRaw === "") {
		console.error("ERROR: UMA_ORACLE_ADDRESS environment variable not set");
		console.error("Please set UMA_ORACLE_ADDRESS to the UMA Optimistic Oracle address");
		console.error("Mainnet address: 0xA0Ae660944944eE6d4c27B4bbb4A3B64e5D8b0d1");
		process.exit(1);
	}
	
	// Properly checksum the address (convert to lowercase first if needed)
	try {
		umaOracleAddress = ethers.getAddress(umaOracleAddressRaw.toLowerCase());
	} catch (error) {
		// If checksum fails, try the raw address
		umaOracleAddress = umaOracleAddressRaw;
	}

	if (!vpoAdapterAddress) {
		console.error("ERROR: VPOAdapter not found in deployments");
		console.error("Please deploy VPOAdapter first");
		process.exit(1);
	}

	console.log("\n📄 Deploying UMAAdapter...");
	console.log("  VPOAdapter:", vpoAdapterAddress);
	console.log("  UMA Oracle:", umaOracleAddress);

	const UMAAdapter = await ethers.getContractFactory("UMAAdapter");
	const adapter = await UMAAdapter.deploy(
		vpoAdapterAddress,
		umaOracleAddress,
		deployer.address // admin
	);
	await adapter.waitForDeployment();

	const adapterAddress = await adapter.getAddress();
	console.log("✅ UMAAdapter deployed at:", adapterAddress);

	// Save deployment info
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}

	const configPath = path.join(deploymentsDir, `${networkName}-uma-adapter.json`);
	const config = {
		network: networkName,
		chainId: network.chainId.toString(),
		deployedAt: new Date().toISOString(),
		umaAdapter: adapterAddress,
		vpoAdapter: vpoAdapterAddress,
		umaOracle: umaOracleAddress,
		deployer: deployer.address,
	};

	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	console.log("\n📝 Deployment info saved to:", configPath);

	console.log("\n🎉 Deployment complete!");
	console.log("\nNext steps:");
	console.log("1. Verify the adapter can handle UMA assertions");
	console.log("2. Set up off-chain service to monitor UMA events");
	console.log("3. Test end-to-end flow: UMA assertion → VPOAdapter → outcome submission");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


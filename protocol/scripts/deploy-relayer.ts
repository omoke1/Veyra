/**
 * Deploy VPOOracleRelayer to Sepolia or Base Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-relayer.ts --network sepolia
 *   npx hardhat run scripts/deploy-relayer.ts --network baseSepolia
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deploying with account:", deployer.address);

	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Account balance:", ethers.formatEther(balance));

	// Deploy VPOOracleRelayer
	console.log("\n📄 Deploying VPOOracleRelayer...");
	const Relayer = await ethers.getContractFactory("VPOOracleRelayer");
	const relayer = await Relayer.deploy(deployer.address);
	await relayer.waitForDeployment();

	const relayerAddress = await relayer.getAddress();
	console.log("✅ VPOOracleRelayer deployed at:", relayerAddress);

	// Get network info
	const network = await ethers.provider.getNetwork();
	const networkName = network.chainId === 11155111n ? "sepolia" : 
	                   network.chainId === 84532n ? "baseSepolia" : 
	                   "unknown";

	// Save deployment info
	const deploymentsDir = path.join(__dirname, "..", "deployments");
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}

	const configPath = path.join(deploymentsDir, `${networkName}-relayer.json`);
	const config = {
		network: networkName,
		chainId: network.chainId.toString(),
		deployedAt: new Date().toISOString(),
		relayer: relayerAddress,
		deployer: deployer.address,
		domainSeparator: await relayer.DOMAIN_SEPARATOR(),
	};

	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	console.log("\n📝 Deployment info saved to:", configPath);

	console.log("\n🎉 Deployment complete!");
	console.log("\nNext steps:");
	console.log("1. Authorize relayer signers:");
	console.log(`   relayer.setSigner(signerAddress, true)`);
	console.log("2. Update relayer/.env with:");
	console.log(`   RELAYER_CONTRACT=${relayerAddress}`);
	console.log(`   CHAIN_ID=${network.chainId}`);
	console.log("\n3. Start relayer service:");
	console.log("   cd relayer && npm run dev");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


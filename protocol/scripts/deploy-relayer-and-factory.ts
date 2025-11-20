/**
 * Deploy VPOOracleRelayer and updated MarketFactory to Sepolia and Base Sepolia
 * 
 * Usage:
 *   pnpm hardhat run scripts/deploy-relayer-and-factory.ts --network sepolia
 *   pnpm hardhat run scripts/deploy-relayer-and-factory.ts --network baseSepolia
 * 
 * Prerequisites:
 *   - Set SEPOLIA_RPC_URL or BASE_SEPOLIA_RPC_URL in .env
 *   - Set PRIVATE_KEY in .env
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentConfig {
	network: string;
	chainId: string;
	deployedAt: string;
	oracleChainlink?: string;
	oracleRelayer: string;
	factory: string;
	deployer: string;
	flatFee: string;
}

async function main() {
	const [deployer] = await ethers.getSigners();
	const network = await ethers.provider.getNetwork();
	
	// Determine network name
	const networkName = network.chainId === 11155111n ? "sepolia" : 
	                   network.chainId === 84532n ? "baseSepolia" : 
	                   "unknown";
	
	console.log("\n🚀 Starting deployment to", networkName.toUpperCase());
	console.log("Deployer address:", deployer.address);
	console.log("Chain ID:", network.chainId.toString());
	
	// Check deployer balance
	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
	
	if (balance < ethers.parseEther("0.001")) {
		console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
	}

	// Load existing deployment config if it exists
	const deploymentsDir = path.join(__dirname, "..", "deployments");
	const configPath = path.join(deploymentsDir, `${networkName}.json`);
	let existingConfig: Partial<DeploymentConfig> = {};
	
	if (fs.existsSync(configPath)) {
		existingConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
		console.log("\n📋 Found existing deployment config");
	}

	// Deploy VPOOracleRelayer
	console.log("\n📦 Deploying VPOOracleRelayer...");
	const Relayer = await ethers.getContractFactory("VPOOracleRelayer");
	const relayer = await Relayer.deploy(deployer.address);
	await relayer.waitForDeployment();
	const relayerAddress = await relayer.getAddress();
	console.log("✅ VPOOracleRelayer deployed at:", relayerAddress);

	// Get domain separator for relayer
	const domainSeparator = await relayer.DOMAIN_SEPARATOR();
	console.log("   Domain Separator:", domainSeparator);

	// Deploy VPOOracleChainlink (if not already deployed)
	let chainlinkAddress = existingConfig.oracleChainlink;
	if (!chainlinkAddress) {
		console.log("\n📦 Deploying VPOOracleChainlink...");
		const OracleChainlink = await ethers.getContractFactory("VPOOracleChainlink");
		const oracleChainlink = await OracleChainlink.deploy(deployer.address);
		await oracleChainlink.waitForDeployment();
		chainlinkAddress = await oracleChainlink.getAddress();
		console.log("✅ VPOOracleChainlink deployed at:", chainlinkAddress);
	} else {
		console.log("\n📦 Using existing VPOOracleChainlink at:", chainlinkAddress);
	}

	// Deploy updated MarketFactory
	const flatFee = 500000n; // $0.50 for 6-decimal collateral
	const feeRecipient = deployer.address;

	console.log("\n📦 Deploying updated MarketFactory (with createMarketWithOracle)...");
	const Factory = await ethers.getContractFactory("MarketFactory");
	// Deploy with Chainlink as default oracle (can be changed via setOracle or use createMarketWithOracle)
	const factory = await Factory.deploy(deployer.address, chainlinkAddress, feeRecipient, flatFee);
	await factory.waitForDeployment();
	const factoryAddress = await factory.getAddress();
	console.log("✅ MarketFactory deployed at:", factoryAddress);
	console.log("   Default Oracle:", chainlinkAddress);
	console.log("   Flat Fee:", flatFee.toString());
	console.log("   Fee Recipient:", feeRecipient);

	// Save deployment info
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}

	const config: DeploymentConfig = {
		network: networkName,
		chainId: network.chainId.toString(),
		deployedAt: new Date().toISOString(),
		oracleChainlink: chainlinkAddress,
		oracleRelayer: relayerAddress,
		factory: factoryAddress,
		deployer: deployer.address,
		flatFee: flatFee.toString(),
	};

	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	console.log("\n📝 Deployment info saved to:", configPath);

	// Also save relayer-specific config
	const relayerConfigPath = path.join(deploymentsDir, `${networkName}-relayer.json`);
	const relayerConfig = {
		network: networkName,
		chainId: network.chainId.toString(),
		deployedAt: new Date().toISOString(),
		relayer: relayerAddress,
		deployer: deployer.address,
		domainSeparator: domainSeparator,
	};
	fs.writeFileSync(relayerConfigPath, JSON.stringify(relayerConfig, null, 2));
	console.log("📝 Relayer config saved to:", relayerConfigPath);

	console.log("\n🎉 Deployment complete!");
	console.log("\n📋 Deployment Summary:");
	console.log("   VPOOracleRelayer:", relayerAddress);
	console.log("   VPOOracleChainlink:", chainlinkAddress);
	console.log("   MarketFactory:", factoryAddress);
	
	if (networkName === "sepolia") {
		console.log("\n🔍 Verify contracts on Etherscan:");
		console.log(`   - Relayer: https://sepolia.etherscan.io/address/${relayerAddress}`);
		console.log(`   - Chainlink Oracle: https://sepolia.etherscan.io/address/${chainlinkAddress}`);
		console.log(`   - Factory: https://sepolia.etherscan.io/address/${factoryAddress}`);
	} else if (networkName === "baseSepolia") {
		console.log("\n🔍 Verify contracts on Basescan:");
		console.log(`   - Relayer: https://sepolia.basescan.org/address/${relayerAddress}`);
		console.log(`   - Chainlink Oracle: https://sepolia.basescan.org/address/${chainlinkAddress}`);
		console.log(`   - Factory: https://sepolia.basescan.org/address/${factoryAddress}`);
	}

	console.log("\n📝 Next Steps:");
	console.log("1. Authorize relayer signers:");
	console.log(`   relayer.setSigner(signerAddress, true)`);
	console.log("\n2. Update relayer/.env with:");
	console.log(`   RPC_URL=<${networkName.toUpperCase()}_RPC_URL>`);
	console.log(`   RELAYER_CONTRACT=${relayerAddress}`);
	console.log(`   CHAIN_ID=${network.chainId}`);
	console.log("\n3. Create markets with different oracles:");
	console.log(`   factory.createMarket(...) // Uses Chainlink (default)`);
	console.log(`   factory.createMarketWithOracle(..., ${relayerAddress}) // Uses Relayer`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});







/**
 * Deploy all contracts to Base Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-base-sepolia.ts --network baseSepolia
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentConfig {
	network: string;
	chainId: string;
	deployedAt: string;
	oracleChainlink: string;
	oracleRelayer: string;
	factory: string;
	adapter: string;
	deployer: string;
	flatFee: string;
}

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("\n🚀 Starting Base Sepolia deployment...");
	console.log("Deployer address:", deployer.address);
	
	// Check deployer balance
	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
	
	if (balance < ethers.parseEther("0.001")) {
		console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
	}

	const network = await ethers.provider.getNetwork();
	console.log("Network:", network.name, "Chain ID:", network.chainId);

	// Deploy VPOOracleChainlink
	console.log("\n📦 Deploying VPOOracleChainlink...");
	const OracleChainlink = await ethers.getContractFactory("VPOOracleChainlink");
	const oracleChainlink = await OracleChainlink.deploy(deployer.address);
	await oracleChainlink.waitForDeployment();
	const oracleChainlinkAddress = await oracleChainlink.getAddress();
	console.log("✅ VPOOracleChainlink deployed at:", oracleChainlinkAddress);

	// Deploy VPOOracleRelayer
	console.log("\n📦 Deploying VPOOracleRelayer...");
	const OracleRelayer = await ethers.getContractFactory("VPOOracleRelayer");
	const oracleRelayer = await OracleRelayer.deploy(deployer.address);
	await oracleRelayer.waitForDeployment();
	const oracleRelayerAddress = await oracleRelayer.getAddress();
	console.log("✅ VPOOracleRelayer deployed at:", oracleRelayerAddress);

	const flatFee = 500000n; // $0.50 for 6-decimal collateral
	const feeRecipient = deployer.address;

	// Deploy MarketFactory (defaults to Chainlink oracle)
	console.log("\n📦 Deploying MarketFactory...");
	const Factory = await ethers.getContractFactory("MarketFactory");
	const factory = await Factory.deploy(deployer.address, oracleChainlinkAddress, feeRecipient, flatFee);
	await factory.waitForDeployment();
	const factoryAddress = await factory.getAddress();
	console.log("✅ MarketFactory deployed at:", factoryAddress);

	// Deploy VPOAdapter
	console.log("\n📦 Deploying VPOAdapter...");
	const Adapter = await ethers.getContractFactory("VPOAdapter");
	const adapter = await Adapter.deploy(deployer.address);
	await adapter.waitForDeployment();
	const adapterAddress = await adapter.getAddress();
	console.log("✅ VPOAdapter deployed at:", adapterAddress);

	// Save deployment info
	const config: DeploymentConfig = {
		network: "baseSepolia",
		chainId: network.chainId.toString(),
		deployedAt: new Date().toISOString(),
		oracleChainlink: oracleChainlinkAddress,
		oracleRelayer: oracleRelayerAddress,
		factory: factoryAddress,
		adapter: adapterAddress,
		deployer: deployer.address,
		flatFee: flatFee.toString(),
	};

	const configPath = path.join(__dirname, "..", "deployments", "base-sepolia.json");
	const deploymentsDir = path.dirname(configPath);
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

	console.log("\n📝 Deployment info saved to:", configPath);
	console.log("\n🎉 Deployment complete!");
	console.log("\nNext steps:");
	console.log("1. Verify contracts on Basescan:");
	console.log(`   - Chainlink Oracle: https://sepolia.basescan.org/address/${oracleChainlinkAddress}`);
	console.log(`   - Relayer Oracle: https://sepolia.basescan.org/address/${oracleRelayerAddress}`);
	console.log(`   - Factory: https://sepolia.basescan.org/address/${factoryAddress}`);
	console.log(`   - Adapter: https://sepolia.basescan.org/address/${adapterAddress}`);
	console.log("\n2. Authorize relayer signers:");
	console.log(`   relayer.setSigner(signerAddress, true)`);
	console.log("\n3. Update relayer/.env with:");
	console.log(`   RPC_URL=<BASE_SEPOLIA_RPC_URL>`);
	console.log(`   RELAYER_CONTRACT=${oracleRelayerAddress}`);
	console.log(`   CHAIN_ID=${network.chainId}`);
	console.log("\n4. Create markets with different oracles:");
	console.log(`   factory.createMarket(...) // Uses Chainlink (default)`);
	console.log(`   factory.createMarketWithOracle(..., ${oracleRelayerAddress}) // Uses Relayer`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


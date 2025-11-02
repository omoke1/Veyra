import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentConfig {
	network: string;
	deployedAt: string;
	oracle: string;
	factory: string;
	adapter?: string;
	deployer: string;
	flatFee: string;
}

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("\n🚀 Starting deployment...");
	console.log("Deployer address:", deployer.address);
	
	// Check deployer balance
	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
	
	if (balance < ethers.parseEther("0.01")) {
		console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
	}

	console.log("\n📦 Deploying VPOOracleChainlink...");
	const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
	const oracle = await Oracle.deploy(deployer.address);
	await oracle.waitForDeployment();
	const oracleAddress = await oracle.getAddress();
	console.log("✅ VPOOracleChainlink deployed at:", oracleAddress);

	const flatFee = 500000n; // $0.50 for 6-decimal collateral
	const feeRecipient = deployer.address;

	console.log("\n📦 Deploying MarketFactory...");
	const Factory = await ethers.getContractFactory("MarketFactory");
	const factory = await Factory.deploy(deployer.address, oracleAddress, feeRecipient, flatFee);
	await factory.waitForDeployment();
	const factoryAddress = await factory.getAddress();
	console.log("✅ MarketFactory deployed at:", factoryAddress);

	console.log("\n📦 Deploying VPOAdapter...");
	const Adapter = await ethers.getContractFactory("VPOAdapter");
	const adapter = await Adapter.deploy(deployer.address);
	await adapter.waitForDeployment();
	const adapterAddress = await adapter.getAddress();
	console.log("✅ VPOAdapter deployed at:", adapterAddress);

	// Save deployment info
	const config: DeploymentConfig = {
		network: "sepolia",
		deployedAt: new Date().toISOString(),
		oracle: oracleAddress,
		factory: factoryAddress,
		adapter: adapterAddress,
		deployer: deployer.address,
		flatFee: flatFee.toString(),
	};

	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	const deploymentsDir = path.dirname(configPath);
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

	console.log("\n📝 Deployment info saved to:", configPath);
	console.log("\n🎉 Deployment complete!");
	console.log("\nNext steps:");
	console.log("1. Verify contracts on Etherscan:");
	console.log(`   - Oracle: https://sepolia.etherscan.io/address/${oracleAddress}`);
	console.log(`   - Factory: https://sepolia.etherscan.io/address/${factoryAddress}`);
	console.log(`   - Adapter: https://sepolia.etherscan.io/address/${adapterAddress}`);
	console.log("\n2. Register AVS nodes:");
	console.log(`   adapter.setAVSNode(avsNodeAddress, true)`);
	console.log("\n3. Create a test market:");
	console.log("   npx hardhat run scripts/createMarket.ts --network sepolia");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

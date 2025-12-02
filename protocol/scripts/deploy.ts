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
	eigenlayer?: {
		delegationManager: string;
		allocationManager: string;
		slashingCoordinator: string;
		eigenVerify?: string;
	};
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

	// Load EigenLayer contract addresses
	console.log("\n📋 Loading EigenLayer contract addresses...");
	const eigenlayerConfigPath = path.join(__dirname, "..", "deployments", "eigenlayer-sepolia.json");
	let eigenlayerConfig: any = {};
	
	if (fs.existsSync(eigenlayerConfigPath)) {
		eigenlayerConfig = JSON.parse(fs.readFileSync(eigenlayerConfigPath, "utf8"));
		console.log("✅ Loaded EigenLayer config from:", eigenlayerConfigPath);
	} else {
		console.warn("⚠️  EigenLayer config not found. Please create deployments/eigenlayer-sepolia.json");
		console.warn("   See EIGENLAYER_SETUP.md for instructions");
		process.exit(1);
	}

	const delegationManagerAddress = eigenlayerConfig.contracts?.DelegationManager?.address;
	const allocationManagerAddress = eigenlayerConfig.contracts?.AllocationManager?.address;
	const slashingCoordinatorAddress = eigenlayerConfig.contracts?.SlashingCoordinator?.address;
	const eigenVerifyAddress = eigenlayerConfig.contracts?.EigenVerify?.address || ethers.ZeroAddress;

	if (!delegationManagerAddress || !allocationManagerAddress || !slashingCoordinatorAddress) {
		console.error("❌ Missing required EigenLayer contract addresses in config");
		console.error("   Required: DelegationManager, AllocationManager, SlashingCoordinator");
		process.exit(1);
	}

	console.log("   DelegationManager:", delegationManagerAddress);
	console.log("   AllocationManager:", allocationManagerAddress);
	console.log("   SlashingCoordinator:", slashingCoordinatorAddress);
	if (eigenVerifyAddress !== ethers.ZeroAddress) {
		console.log("   EigenVerify:", eigenVerifyAddress);
	} else {
		console.log("   EigenVerify: Not configured (optional)");
	}

	console.log("\n📦 Deploying VeyraOracleAVS...");
	const VeyraOracleAVS = await ethers.getContractFactory("VeyraOracleAVS");
	const veyraOracleAVS = await VeyraOracleAVS.deploy(
		deployer.address,
		delegationManagerAddress,
		allocationManagerAddress,
		slashingCoordinatorAddress,
		eigenVerifyAddress // Optional - can be address(0)
	);
	await veyraOracleAVS.waitForDeployment();
	const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();
	console.log("✅ VeyraOracleAVS deployed at:", veyraOracleAVSAddress);

	// Save deployment info
	const config: DeploymentConfig = {
		network: "sepolia",
		deployedAt: new Date().toISOString(),
		oracle: oracleAddress,
		factory: factoryAddress,
		adapter: veyraOracleAVSAddress,
		deployer: deployer.address,
		flatFee: flatFee.toString(),
		eigenlayer: {
			delegationManager: delegationManagerAddress,
			allocationManager: allocationManagerAddress,
			slashingCoordinator: slashingCoordinatorAddress,
			eigenVerify: eigenVerifyAddress !== ethers.ZeroAddress ? eigenVerifyAddress : undefined,
		},
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
	console.log(`   - VeyraOracleAVS: https://sepolia.etherscan.io/address/${veyraOracleAVSAddress}`);
	console.log("\n2. Register AVS on EigenLayer:");
	console.log("   npx hardhat run scripts/register-avs-eigenlayer.ts --network sepolia");
	console.log("\n3. Set AVS ID in VeyraOracleAVS:");
	console.log(`   veyraOracleAVS.setAVSId(avsId)`);
	console.log("\n4. Operators must register themselves on EigenLayer to participate");
	console.log("\n5. Create a test market:");
	console.log("   npx hardhat run scripts/createMarket.ts --network sepolia");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

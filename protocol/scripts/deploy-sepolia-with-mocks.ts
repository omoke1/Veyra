import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy to Sepolia with Mock EigenLayer Contracts
 * 
 * This script deploys:
 * 1. EigenVerify (your implementation)
 * 2. MockAllocationManager (since not on Sepolia)
 * 3. MockSlashingCoordinator (since not on Sepolia)
 * 4. VeyraOracleAVS (with all dependencies)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-sepolia-with-mocks.ts --network sepolia
 */

interface DeploymentConfig {
	network: string;
	deployedAt: string;
	oracle: string;
	factory: string;
	adapter: string;
	deployer: string;
	flatFee: string;
	eigenlayer: {
		delegationManager: string;
		allocationManager: string;
		slashingCoordinator: string;
		eigenVerify: string;
		mockDeployments: {
			allocationManager: boolean;
			slashingCoordinator: boolean;
			eigenVerify: boolean;
		};
	};
	avsId?: string;
}

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("\n🚀 Starting Sepolia deployment with mock EigenLayer contracts...");
	console.log("Deployer address:", deployer.address);
	
	// Check deployer balance
	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
	
	if (balance < ethers.parseEther("0.05")) {
		console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
		console.warn("   Recommended: At least 0.05 ETH for deploying all contracts");
	}

	// Use official DelegationManager from Sepolia
	const DELEGATION_MANAGER_SEPOLIA = "0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A";
	console.log("\n✅ Using official DelegationManager:", DELEGATION_MANAGER_SEPOLIA);

	// Deploy EigenVerify
	console.log("\n📦 Deploying EigenVerify...");
	const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
	const eigenVerify = await EigenVerifyFactory.deploy(deployer.address);
	await eigenVerify.waitForDeployment();
	const eigenVerifyAddress = await eigenVerify.getAddress();
	console.log("✅ EigenVerify deployed at:", eigenVerifyAddress);

	// Deploy MockAllocationManager
	console.log("\n📦 Deploying MockAllocationManager...");
	console.log("   (Official AllocationManager not yet on Sepolia)");
	const MockAllocationManagerFactory = await ethers.getContractFactory("MockAllocationManager");
	const mockAllocationManager = await MockAllocationManagerFactory.deploy();
	await mockAllocationManager.waitForDeployment();
	const allocationManagerAddress = await mockAllocationManager.getAddress();
	console.log("✅ MockAllocationManager deployed at:", allocationManagerAddress);

	// Deploy MockSlashingCoordinator
	console.log("\n📦 Deploying MockSlashingCoordinator...");
	console.log("   (Official SlashingCoordinator not yet on Sepolia)");
	const MockSlashingCoordinatorFactory = await ethers.getContractFactory("MockSlashingCoordinator");
	const mockSlashingCoordinator = await MockSlashingCoordinatorFactory.deploy();
	await mockSlashingCoordinator.waitForDeployment();
	const slashingCoordinatorAddress = await mockSlashingCoordinator.getAddress();
	console.log("✅ MockSlashingCoordinator deployed at:", slashingCoordinatorAddress);

	// Deploy VPOOracleChainlink
	console.log("\n📦 Deploying VPOOracleChainlink...");
	const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
	const oracle = await Oracle.deploy(deployer.address);
	await oracle.waitForDeployment();
	const oracleAddress = await oracle.getAddress();
	console.log("✅ VPOOracleChainlink deployed at:", oracleAddress);

	// Deploy MarketFactory
	const flatFee = 500000n; // $0.50 for 6-decimal collateral
	const feeRecipient = deployer.address;

	console.log("\n📦 Deploying MarketFactory...");
	const Factory = await ethers.getContractFactory("MarketFactory");
	const factory = await Factory.deploy(deployer.address, oracleAddress, feeRecipient, flatFee);
	await factory.waitForDeployment();
	const factoryAddress = await factory.getAddress();
	console.log("✅ MarketFactory deployed at:", factoryAddress);

	// Deploy VeyraOracleAVS
	console.log("\n📦 Deploying VeyraOracleAVS...");
	console.log("   Configuration:");
	console.log("   - DelegationManager:", DELEGATION_MANAGER_SEPOLIA, "(official)");
	console.log("   - AllocationManager:", allocationManagerAddress, "(mock)");
	console.log("   - SlashingCoordinator:", slashingCoordinatorAddress, "(mock)");
	console.log("   - EigenVerify:", eigenVerifyAddress, "(your impl)");

	const VeyraOracleAVS = await ethers.getContractFactory("VeyraOracleAVS");
	const veyraOracleAVS = await VeyraOracleAVS.deploy(
		deployer.address,
		DELEGATION_MANAGER_SEPOLIA,
		allocationManagerAddress,
		slashingCoordinatorAddress,
		eigenVerifyAddress
	);
	await veyraOracleAVS.waitForDeployment();
	const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();
	console.log("✅ VeyraOracleAVS deployed at:", veyraOracleAVSAddress);

	// Register AVS with MockAllocationManager and get AVS ID
	console.log("\n🔧 Registering AVS with MockAllocationManager...");
	const metadataURI = "https://ipfs.io/ipfs/QmVeyraOracleAVSMetadata"; // TODO: Upload real metadata to IPFS
	const slashingParams = ethers.AbiCoder.defaultAbiCoder().encode(
		["address", "uint256"],
		[veyraOracleAVSAddress, 66] // AVS address and quorum threshold
	);
	const registerTx = await mockAllocationManager.registerAVS(metadataURI, slashingParams);
	await registerTx.wait();
	const avsId = await mockAllocationManager.getAVSId(veyraOracleAVSAddress);
	console.log("✅ AVS registered with ID:", avsId);

	// Set AVS ID in VeyraOracleAVS
	console.log("\n🔧 Setting AVS ID in VeyraOracleAVS...");
	const setAvsIdTx = await veyraOracleAVS.setAVSId(avsId);
	await setAvsIdTx.wait();
	console.log("✅ AVS ID set in VeyraOracleAVS");

	// Authorize deployer as verifier in EigenVerify (for testing)
	console.log("\n🔧 Authorizing deployer as verifier in EigenVerify...");
	const authTx = await eigenVerify.setAuthorizedVerifier(deployer.address, true);
	await authTx.wait();
	console.log("✅ Deployer authorized as verifier");

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
			delegationManager: DELEGATION_MANAGER_SEPOLIA,
			allocationManager: allocationManagerAddress,
			slashingCoordinator: slashingCoordinatorAddress,
			eigenVerify: eigenVerifyAddress,
			mockDeployments: {
				allocationManager: true,
				slashingCoordinator: true,
				eigenVerify: false, // Using your implementation, not official
			},
		},
		avsId: avsId,
	};

	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	const deploymentsDir = path.dirname(configPath);
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

	console.log("\n📝 Deployment info saved to:", configPath);
	
	// Summary
	console.log("\n" + "=".repeat(80));
	console.log("🎉 Deployment Complete!");
	console.log("=".repeat(80));
	console.log("\n📋 Deployed Contracts:");
	console.log("   VPOOracleChainlink:      ", oracleAddress);
	console.log("   MarketFactory:           ", factoryAddress);
	console.log("   VeyraOracleAVS:          ", veyraOracleAVSAddress);
	console.log("   EigenVerify:             ", eigenVerifyAddress);
	console.log("   MockAllocationManager:   ", allocationManagerAddress, "(mock)");
	console.log("   MockSlashingCoordinator: ", slashingCoordinatorAddress, "(mock)");
	console.log("   DelegationManager:       ", DELEGATION_MANAGER_SEPOLIA, "(official)");
	console.log("\n🆔 AVS ID:", avsId);

	console.log("\n🔗 Verify on Etherscan:");
	console.log(`   VeyraOracleAVS:          https://sepolia.etherscan.io/address/${veyraOracleAVSAddress}`);
	console.log(`   EigenVerify:             https://sepolia.etherscan.io/address/${eigenVerifyAddress}`);
	console.log(`   MockAllocationManager:   https://sepolia.etherscan.io/address/${allocationManagerAddress}`);
	console.log(`   MockSlashingCoordinator: https://sepolia.etherscan.io/address/${slashingCoordinatorAddress}`);

	console.log("\n📝 Next Steps:");
	console.log("1. Update AVS node .env file with:");
	console.log(`   ADAPTER_ADDRESS=${veyraOracleAVSAddress}`);
	console.log(`   EIGENLAYER_DELEGATION_MANAGER=${DELEGATION_MANAGER_SEPOLIA}`);
	console.log("\n2. Register operators:");
	console.log("   - Call mockAllocationManager.registerOperatorToAVS(operatorAddress, avsId)");
	console.log("   - Authorize operators in EigenVerify:");
	console.log(`     eigenVerify.setAuthorizedVerifier(operatorAddress, true)`);
	console.log("\n3. Start AVS node:");
	console.log("   cd ../avs && npm start");
	console.log("\n4. Create a test market:");
	console.log("   npx hardhat run scripts/createMarket.ts --network sepolia");

	console.log("\n⚠️  Important Notes:");
	console.log("   - AllocationManager and SlashingCoordinator are MOCKS for testing");
	console.log("   - When official contracts are deployed to Sepolia, redeploy VeyraOracleAVS");
	console.log("   - EigenVerify is your implementation - operators must use compatible proof format");
	console.log("   - DelegationManager is the official EigenLayer contract on Sepolia");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

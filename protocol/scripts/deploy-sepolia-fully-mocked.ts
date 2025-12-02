import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load AVS env to get operator key
dotenv.config({ path: path.join(__dirname, "../../avs/.env") });

/**
 * Deploy to Sepolia with FULLY Mocked EigenLayer Contracts
 * 
 * This script deploys:
 * 1. EigenVerify
 * 2. MockAllocationManager
 * 3. MockSlashingCoordinator
 * 4. MockDelegationManager (NEW)
 * 5. VeyraOracleAVS (using all mocks)
 * 
 * It also sets up the operator stake in the MockDelegationManager.
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
			delegationManager: boolean;
			allocationManager: boolean;
			slashingCoordinator: boolean;
			eigenVerify: boolean;
		};
	};
	avsId?: string;
}

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("\n🚀 Starting Sepolia deployment with FULLY mocked EigenLayer contracts...");
	console.log("Deployer address:", deployer.address);
	
	// Get Operator Address
	const operatorKey = process.env.AVS_PRIVATE_KEY;
	if (!operatorKey) throw new Error("AVS_PRIVATE_KEY not found in avs/.env");
	const operatorWallet = new ethers.Wallet(operatorKey);
	const operatorAddress = operatorWallet.address;
	console.log("Operator address:", operatorAddress);

	// Deploy EigenVerify
	console.log("\n📦 Deploying EigenVerify...");
	const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
	const eigenVerify = await EigenVerifyFactory.deploy(deployer.address);
	await eigenVerify.waitForDeployment();
	const eigenVerifyAddress = await eigenVerify.getAddress();
	console.log("✅ EigenVerify deployed at:", eigenVerifyAddress);

	// Deploy MockAllocationManager
	console.log("\n📦 Deploying MockAllocationManager...");
	const MockAllocationManagerFactory = await ethers.getContractFactory("MockAllocationManager");
	const mockAllocationManager = await MockAllocationManagerFactory.deploy();
	await mockAllocationManager.waitForDeployment();
	const allocationManagerAddress = await mockAllocationManager.getAddress();
	console.log("✅ MockAllocationManager deployed at:", allocationManagerAddress);

	// Deploy MockSlashingCoordinator
	console.log("\n📦 Deploying MockSlashingCoordinator...");
	const MockSlashingCoordinatorFactory = await ethers.getContractFactory("MockSlashingCoordinator");
	const mockSlashingCoordinator = await MockSlashingCoordinatorFactory.deploy();
	await mockSlashingCoordinator.waitForDeployment();
	const slashingCoordinatorAddress = await mockSlashingCoordinator.getAddress();
	console.log("✅ MockSlashingCoordinator deployed at:", slashingCoordinatorAddress);

	// Deploy MockDelegationManager
	console.log("\n📦 Deploying MockDelegationManager...");
	const MockDelegationManagerFactory = await ethers.getContractFactory("MockDelegationManager");
	const mockDelegationManager = await MockDelegationManagerFactory.deploy();
	await mockDelegationManager.waitForDeployment();
	const delegationManagerAddress = await mockDelegationManager.getAddress();
	console.log("✅ MockDelegationManager deployed at:", delegationManagerAddress);

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
	console.log("   - DelegationManager:", delegationManagerAddress, "(mock)");
	console.log("   - AllocationManager:", allocationManagerAddress, "(mock)");
	console.log("   - SlashingCoordinator:", slashingCoordinatorAddress, "(mock)");
	console.log("   - EigenVerify:", eigenVerifyAddress, "(your impl)");

	const VeyraOracleAVS = await ethers.getContractFactory("VeyraOracleAVS");
	const veyraOracleAVS = await VeyraOracleAVS.deploy(
		deployer.address,
		delegationManagerAddress,
		allocationManagerAddress,
		slashingCoordinatorAddress,
		eigenVerifyAddress
	);
	await veyraOracleAVS.waitForDeployment();
	const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();
	console.log("✅ VeyraOracleAVS deployed at:", veyraOracleAVSAddress);

	// Register AVS with MockAllocationManager and get AVS ID
	console.log("\n🔧 Registering AVS with MockAllocationManager...");
	const metadataURI = "https://ipfs.io/ipfs/QmVeyraOracleAVSMetadata";
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

	// Register Operator with MockAllocationManager
	console.log("\n🔧 Registering Operator with MockAllocationManager...");
	const registerOpTx = await mockAllocationManager.registerOperatorToAVS(operatorAddress, avsId);
	await registerOpTx.wait();
	console.log("✅ Operator registered to AVS");

	// Set Operator Stake in MockDelegationManager
	console.log("\n🔧 Setting Operator Stake in MockDelegationManager...");
	const stakeAmount = ethers.parseEther("1000");
	const setStakeTx = await mockDelegationManager.setOperatorShares(operatorAddress, veyraOracleAVSAddress, stakeAmount);
	await setStakeTx.wait();
	console.log("✅ Operator stake set to 1000 ETH");

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
			delegationManager: delegationManagerAddress,
			allocationManager: allocationManagerAddress,
			slashingCoordinator: slashingCoordinatorAddress,
			eigenVerify: eigenVerifyAddress,
			mockDeployments: {
				delegationManager: true,
				allocationManager: true,
				slashingCoordinator: true,
				eigenVerify: false,
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
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

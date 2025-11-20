/**
 * Deploy Veyra Core Contracts
 * 
 * Deploys EigenVerify, Slashing, and VPOAdapter contracts with proper initialization.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-veyra-core.ts --network sepolia
 * 
 * Environment Variables:
 *   - PRIVATE_KEY: Deployer private key
 *   - SEPOLIA_RPC_URL: Sepolia RPC endpoint
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface Deployment {
	network: string;
	deployedAt: string;
	eigenVerify: string;
	slashing: string;
	vpoAdapter: string;
	admin: string;
	deployer: string;
}

async function main() {
	const [deployer] = await ethers.getSigners();
	const network = await ethers.provider.getNetwork();
	
	console.log("\n🚀 Deploying Veyra Core Contracts...");
	console.log("Network:", network.name, `(${network.chainId})`);
	console.log("Deployer:", deployer.address);
	
	// Check deployer balance
	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
	
	if (balance < ethers.parseEther("0.01")) {
		console.warn("⚠️  Low balance! Deployment may fail.");
	}

	// Admin address (can be different from deployer)
	const admin = process.env.ADMIN_ADDRESS || deployer.address;
	console.log("Admin address:", admin);

	// Step 1: Deploy EigenVerify
	console.log("\n1️⃣ Deploying EigenVerify...");
	const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
	const eigenVerify = await EigenVerifyFactory.connect(deployer).deploy(admin);
	await eigenVerify.waitForDeployment();
	const eigenVerifyAddress = await eigenVerify.getAddress();
	console.log("✅ EigenVerify deployed at:", eigenVerifyAddress);

	// Step 2: Deploy Slashing (with zero address initially)
	console.log("\n2️⃣ Deploying Slashing...");
	const SlashingFactory = await ethers.getContractFactory("Slashing");
	const slashing = await SlashingFactory.connect(deployer).deploy(ethers.ZeroAddress);
	await slashing.waitForDeployment();
	const slashingAddress = await slashing.getAddress();
	console.log("✅ Slashing deployed at:", slashingAddress);

	// Step 3: Deploy VPOAdapter
	console.log("\n3️⃣ Deploying VPOAdapter...");
	const VPOAdapterFactory = await ethers.getContractFactory("VPOAdapter");
	const vpoAdapter = await VPOAdapterFactory.connect(deployer).deploy(
		admin,
		eigenVerifyAddress,
		slashingAddress
	);
	await vpoAdapter.waitForDeployment();
	const vpoAdapterAddress = await vpoAdapter.getAddress();
	console.log("✅ VPOAdapter deployed at:", vpoAdapterAddress);

	// Step 4: Update Slashing to use VPOAdapter address
	console.log("\n4️⃣ Updating Slashing to use VPOAdapter address...");
	const updateTx = await slashing.connect(deployer).setAVS(vpoAdapterAddress);
	await updateTx.wait();
	console.log("✅ Slashing updated with VPOAdapter address");

	// Step 5: Verify configuration
	console.log("\n5️⃣ Verifying configuration...");
	const slashingAVS = await slashing.avs();
	console.log("   Slashing.avs:", slashingAVS);
	console.log("   Match:", slashingAVS === vpoAdapterAddress ? "✅" : "❌");

	// Save deployment info
	const deployment: Deployment = {
		network: network.name,
		deployedAt: new Date().toISOString(),
		eigenVerify: eigenVerifyAddress,
		slashing: slashingAddress,
		vpoAdapter: vpoAdapterAddress,
		admin: admin,
		deployer: deployer.address,
	};

	const deploymentsDir = path.join(__dirname, "../deployments");
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}

	const deploymentFile = path.join(deploymentsDir, `${network.name}-veyra-core.json`);
	fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

	console.log("\n📝 Deployment info saved to:", deploymentFile);
	console.log("\n✅ Deployment complete!");
	console.log("\n📋 Contract Addresses:");
	console.log("   EigenVerify:", eigenVerifyAddress);
	console.log("   Slashing:", slashingAddress);
	console.log("   VPOAdapter:", vpoAdapterAddress);
	console.log("\n🔗 Next steps:");
	console.log("   1. Verify contracts on Etherscan:");
	console.log(`      npx hardhat verify --network ${network.name} ${eigenVerifyAddress} ${admin}`);
	console.log(`      npx hardhat verify --network ${network.name} ${slashingAddress} ${ethers.ZeroAddress}`);
	console.log(`      npx hardhat verify --network ${network.name} ${vpoAdapterAddress} ${admin} ${eigenVerifyAddress} ${slashingAddress}`);
	console.log("   2. Set authorized verifiers in EigenVerify:");
	console.log(`      eigenVerify.setAuthorizedVerifier(operatorAddress, true)`);
	console.log("   3. Register AVS nodes in VPOAdapter:");
	console.log(`      vpoAdapter.setAVSNode(avsNodeAddress, true)`);
	console.log("   4. Set operator weights in VPOAdapter:");
	console.log(`      vpoAdapter.setOperatorWeight(operatorAddress, weight)`);
	console.log("   5. Add stake for operators in Slashing:");
	console.log(`      slashing.addStake(operatorAddress, amount)`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("\n❌ Deployment failed:");
		console.error(error);
		process.exit(1);
	});


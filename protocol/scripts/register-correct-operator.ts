import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deployer:", deployer.address);

	// Load deployment config
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	if (!fs.existsSync(configPath)) {
		throw new Error("Deployment config not found");
	}
	const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
	
	const allocationManagerAddress = config.eigenlayer.allocationManager;
	const delegationManagerAddress = config.eigenlayer.delegationManager;
	const veyraOracleAVSAddress = config.adapter;
	const avsId = config.avsId;

	console.log("AllocationManager:", allocationManagerAddress);
	console.log("DelegationManager:", delegationManagerAddress);
	console.log("AVS ID:", avsId);

	// Get Operator Wallet
	const operatorKey = process.env.AVS_PRIVATE_KEY;
	if (!operatorKey) throw new Error("AVS_PRIVATE_KEY not found");
	const operatorWallet = new ethers.Wallet(operatorKey, ethers.provider);
	console.log("Operator Address:", operatorWallet.address);

	// Connect to contracts
	const mockAllocationManager = await ethers.getContractAt("MockAllocationManager", allocationManagerAddress, deployer);
	const mockDelegationManager = await ethers.getContractAt("MockDelegationManager", delegationManagerAddress, deployer);
	const eigenVerify = await ethers.getContractAt("EigenVerify", config.eigenlayer.eigenVerify, deployer);

	// Register Operator
	console.log("Registering operator...");
	const tx1 = await mockAllocationManager.registerOperatorToAVS(operatorWallet.address, avsId);
	await tx1.wait();
	console.log("✅ Operator registered");

	// Set Stake
	console.log("Setting stake...");
	const stakeAmount = ethers.parseEther("1000");
	const tx2 = await mockDelegationManager.setOperatorShares(operatorWallet.address, veyraOracleAVSAddress, stakeAmount);
	await tx2.wait();
	console.log("✅ Stake set to 1000 ETH");

	// Authorize in EigenVerify
	console.log("Authorizing in EigenVerify...");
	const tx3 = await eigenVerify.setAuthorizedVerifier(operatorWallet.address, true);
	await tx3.wait();
	console.log("✅ Operator authorized in EigenVerify");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

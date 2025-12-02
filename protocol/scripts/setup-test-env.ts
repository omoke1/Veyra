import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Using account:", deployer.address);

	// Load deployment info
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	if (!fs.existsSync(configPath)) {
		throw new Error("Deployment config not found. Run deploy.ts first.");
	}
	const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
	
	const veyraOracleAVSAddress = config.adapter;
	const factoryAddress = config.factory;

	console.log("VeyraOracleAVS:", veyraOracleAVSAddress);
	console.log("MarketFactory:", factoryAddress);

	// 1. Register AVS Node
	console.log("\n1. Registering AVS Node...");
	const VeyraOracleAVS = await ethers.getContractFactory("VeyraOracleAVS");
	const veyraOracleAVS = VeyraOracleAVS.attach(veyraOracleAVSAddress).connect(deployer);

	// Get AVS operator address from env or use a derived one
	// In this setup, we'll assume the deployer is also the AVS operator for simplicity, 
	// OR we use the AVS_PRIVATE_KEY from env if available.
	// But here we are running as 'deployer' (from hardhat config).
	// The 'deployer' is the admin of VeyraOracleAVS.
	
	// Let's register the deployer itself as an operator for testing purposes, 
	// AND the address corresponding to AVS_PRIVATE_KEY if possible.
	
	const avsPrivateKey = process.env.AVS_PRIVATE_KEY;
	let avsOperatorAddress = deployer.address;
	
	if (avsPrivateKey) {
		const avsWallet = new ethers.Wallet(avsPrivateKey, ethers.provider);
		avsOperatorAddress = avsWallet.address;
		console.log("Found AVS_PRIVATE_KEY. Operator address:", avsOperatorAddress);
	}

	// Note: Operators must register themselves on EigenLayer
	console.log(`\n⚠️  Operator Registration Note:`);
	console.log(`   Operators must register themselves on EigenLayer before participating.`);
	console.log(`   The operator address is: ${avsOperatorAddress}`);
	console.log(`   Steps:`);
	console.log(`   1. Register as EigenLayer operator (see EigenLayer docs)`);
	console.log(`   2. Opt-in to VeyraOracleAVS AVS via AllocationManager`);
	console.log(`   3. Ensure operator has stake delegated via DelegationManager`);
	console.log(`\n   To check if operator is registered:`);
	console.log(`   veyraOracleAVS.isOperatorRegistered("${avsOperatorAddress}")`);
	
	// Check if operator is already registered
	try {
		const isRegistered = await veyraOracleAVS.isOperatorRegistered(avsOperatorAddress);
		if (isRegistered) {
			console.log(`\n✅ Operator ${avsOperatorAddress} is already registered to this AVS`);
		} else {
			console.log(`\n⚠️  Operator ${avsOperatorAddress} is NOT registered to this AVS yet`);
		}
	} catch (error: any) {
		console.warn(`   Could not check operator registration: ${error.message}`);
	}

	// 2. Create Test Market
	console.log("\n2. Creating Test Market...");
	const MarketFactory = await ethers.getContractFactory("MarketFactory");
	const factory = MarketFactory.attach(factoryAddress).connect(deployer);

	// We need a collateral token. Let's deploy a mock one if we don't have one.
	// Or use a dummy address if we just want to test creation (but `safeTransferFrom` might fail later).
	// Use existing Mock ERC20
	const mockTokenAddress = "0x0884073655783d98024389b4289698fa6fd86BAe";
	console.log("Using existing Mock ERC20 at:", mockTokenAddress);

	const question = "Will this test market resolve correctly?";
	const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
	const feeBps = 0;

	console.log("Creating market...");
	try {
		const tx3 = await factory.createMarket(mockTokenAddress, question, endTime, feeBps);
		const rcpt = await tx3.wait();
		
		// Find MarketDeployed event
		const marketEvt = rcpt?.logs
			.map((l: any) => {
				try {
					return factory.interface.parseLog({ topics: l.topics, data: l.data });
				} catch (_) {
					return null;
				}
			})
			.find((e: any) => e && e.name === "MarketDeployed");

		if (marketEvt) {
			const { market, vault, marketId } = marketEvt.args;
			console.log("✅ Market created!");
			console.log("   Address:", market);
			console.log("   Vault:", vault);
			console.log("   ID:", marketId);
		} else {
			console.warn("⚠️ MarketDeployed event not found.");
		}
	} catch (error: any) {
		console.error("Error creating market:", error.message);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

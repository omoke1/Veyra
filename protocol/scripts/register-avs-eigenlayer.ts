import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Register VeyraOracleAVS as an official AVS on EigenLayer
 * 
 * Usage:
 *   npx hardhat run scripts/register-avs-eigenlayer.ts --network sepolia
 * 
 * Prerequisites:
 *   - VeyraOracleAVS must be deployed
 *   - EigenLayer contract addresses must be configured in deployments/eigenlayer-sepolia.json
 *   - Deployer must have permissions to register AVS
 */
async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deployer address:", deployer.address);

	// Load deployment config
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	if (!fs.existsSync(configPath)) {
		throw new Error(`Deployment config not found: ${configPath}. Please deploy contracts first.`);
	}
	const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

	if (!config.adapter) {
		throw new Error("VeyraOracleAVS address not found in deployment config");
	}

	const veyraOracleAVSAddress = config.adapter;
	console.log("VeyraOracleAVS address:", veyraOracleAVSAddress);

	// Load EigenLayer config
	const eigenlayerConfigPath = path.join(__dirname, "..", "deployments", "eigenlayer-sepolia.json");
	if (!fs.existsSync(eigenlayerConfigPath)) {
		throw new Error(`EigenLayer config not found: ${eigenlayerConfigPath}`);
	}
	const eigenlayerConfig = JSON.parse(fs.readFileSync(eigenlayerConfigPath, "utf8"));

	const allocationManagerAddress = eigenlayerConfig.contracts?.AllocationManager?.address;
	if (!allocationManagerAddress) {
		throw new Error("AllocationManager address not found in EigenLayer config");
	}

	console.log("AllocationManager address:", allocationManagerAddress);

	// Connect to contracts
	const AllocationManager = await ethers.getContractAt("IAllocationManager", allocationManagerAddress);
	const VeyraOracleAVS = await ethers.getContractAt("VeyraOracleAVS", veyraOracleAVSAddress);

	// Check if already registered
	const currentAvsId = await VeyraOracleAVS.avsId();
	if (currentAvsId !== ethers.ZeroHash) {
		console.log("✅ AVS already registered with ID:", currentAvsId);
		return;
	}

	// Prepare AVS metadata
	// In production, this should be a proper IPFS URI with AVS metadata
	const metadataURI = "https://ipfs.io/ipfs/QmYourMetadataHash"; // TODO: Replace with actual metadata URI
	const slashingParams = ethers.AbiCoder.defaultAbiCoder().encode(
		["address", "uint256"],
		[veyraOracleAVSAddress, 66] // AVS address and quorum threshold
	);

	console.log("\n📝 Registering AVS on EigenLayer...");
	console.log("   Metadata URI:", metadataURI);
	console.log("   Slashing Params:", slashingParams);

	try {
		// Register AVS
		const tx = await AllocationManager.registerAVS(metadataURI, slashingParams);
		console.log("   Transaction hash:", tx.hash);
		
		const receipt = await tx.wait();
		console.log("   ✅ Transaction confirmed in block:", receipt?.blockNumber);

		// Extract AVS ID from events (adjust event name based on actual contract)
		// Note: You may need to adjust this based on the actual event structure
		let avsId: string | null = null;
		if (receipt?.logs) {
			for (const log of receipt.logs) {
				try {
					const parsed = AllocationManager.interface.parseLog({
						topics: log.topics as string[],
						data: log.data,
					});
					if (parsed && parsed.name === "AVSRegistered") {
						avsId = parsed.args[0]; // Adjust index based on actual event
						break;
					}
				} catch (e) {
					// Not the event we're looking for
				}
			}
		}

		if (!avsId) {
			console.warn("⚠️  Could not extract AVS ID from events. You may need to query it manually.");
			console.log("   Try: allocationManager.getAVSId(veyraOracleAVSAddress)");
		} else {
			console.log("   ✅ AVS ID:", avsId);

			// Set AVS ID in VeyraOracleAVS
			console.log("\n🔧 Setting AVS ID in VeyraOracleAVS...");
			const setAvsIdTx = await VeyraOracleAVS.setAVSId(avsId);
			await setAvsIdTx.wait();
			console.log("   ✅ AVS ID set in VeyraOracleAVS");

			// Update config
			config.avsId = avsId;
			fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
			console.log("   ✅ Updated deployment config");
		}

		console.log("\n🎉 AVS registration complete!");
		console.log("\nNext steps:");
		console.log("1. Operators must register themselves on EigenLayer to participate");
		console.log("2. Verify AVS registration:");
		console.log(`   allocationManager.getAVSId("${veyraOracleAVSAddress}")`);
		console.log("3. Check registered operators:");
		console.log(`   allocationManager.getAVSOperators(avsId)`);

	} catch (error: any) {
		console.error("❌ Error registering AVS:", error.message);
		if (error.data) {
			console.error("   Error data:", error.data);
		}
		throw error;
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});



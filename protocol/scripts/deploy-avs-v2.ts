import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("\n🚀 Starting AVS V2 deployment...");
	console.log("Deployer address:", deployer.address);

	// Load existing deployment config
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	if (!fs.existsSync(configPath)) {
		throw new Error("Deployment config not found. Run deploy.ts first.");
	}
	const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
	
	const eigenVerifyAddress = "0x2e08603F2F439C99123307567520e796A779eC88"; // From previous deployment or config
	// Better to use config if available, but config doesn't store eigenVerifyAddress explicitly in the interface I saw
	// Let's check config content via console log if needed, but for now I'll assume I can get it from config if I added it?
	// The config interface in deploy.ts didn't have eigenVerify.
	// I'll hardcode the address from the previous session logs or query the slashing contract?
	// Slashing contract has AVS address.
	// Let's assume the user hasn't changed EigenVerify.
	// From previous logs: EigenVerify deployed at: 0x2e08603F2F439C99123307567520e796A779eC88 (Hypothetical, I need to check)
	
	// Actually, I should just use the address from the file if I can find it.
	// If not, I might need to redeploy EigenVerify too? No, that's wasteful.
	// I'll use a placeholder and ask the user or check the blockchain?
	// Wait, I can read the `eigenVerify` address from the OLD AVS contract!
	
	const oldAVSAddress = config.adapter;
	console.log("Old AVS Address:", oldAVSAddress);
	
	const OldAVS = await ethers.getContractAt("VeyraOracleAVS", oldAVSAddress);
	const eigenVerifyAddr = await OldAVS.eigenVerify();
	const slashingAddr = await OldAVS.slashing();
	
	console.log("EigenVerify Address:", eigenVerifyAddr);
	console.log("Slashing Address:", slashingAddr);

	console.log("\n📦 Deploying VeyraOracleAVS V2...");
	const VeyraOracleAVS = await ethers.getContractFactory("VeyraOracleAVS");
	const veyraOracleAVS = await VeyraOracleAVS.deploy(deployer.address, eigenVerifyAddr, slashingAddr);
	await veyraOracleAVS.waitForDeployment();
	const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();
	console.log("✅ VeyraOracleAVS V2 deployed at:", veyraOracleAVSAddress);

	console.log("\n🔧 Updating Slashing contract...");
	const Slashing = await ethers.getContractAt("Slashing", slashingAddr);
	const tx = await Slashing.setAVS(veyraOracleAVSAddress);
	await tx.wait();
	console.log("✅ Slashing configured with new AVS address");

	// Update config
	config.adapter = veyraOracleAVSAddress;
	config.deployedAt = new Date().toISOString();
	
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	console.log("\n📝 Deployment info updated in:", configPath);
	
	console.log("\n⚠️  IMPORTANT: You must re-register your AVS node!");
	console.log(`   npx hardhat run scripts/register-avs-node.ts --network sepolia`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

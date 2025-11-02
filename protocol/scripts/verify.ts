import { ethers } from "hardhat";

/**
 * Helper script to verify contracts on Etherscan after deployment
 * Usage: npx hardhat run scripts/verify.ts --network sepolia
 */

async function main() {
	const configPath = require("path").join(__dirname, "..", "deployments", "sepolia.json");
	const config = require(configPath);

	console.log("📋 Deployment addresses:");
	console.log("Oracle:", config.oracle);
	console.log("Factory:", config.factory);
	console.log("\n✅ Contracts deployed at:", config.deployedAt);

	console.log("\n💡 To verify on Etherscan, run:");
	console.log(`npx hardhat verify --network sepolia ${config.oracle} "${config.deployer}"`);
	console.log(`npx hardhat verify --network sepolia ${config.factory} "${config.deployer}" "${config.oracle}" "${config.deployer}" "${config.flatFee}"`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


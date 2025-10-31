import { ethers } from "hardhat";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deployer:", deployer.address);

	// Deploy oracle (admin = deployer for now)
	const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
	const oracle = await Oracle.deploy(deployer.address);
	await oracle.waitForDeployment();
	console.log("VPOOracleChainlink:", await oracle.getAddress());

	// Fee config example: $0.50 USDC (6 decimals) -> 500000
	const flatFee = 500000n;
	const feeRecipient = deployer.address;

	const Factory = await ethers.getContractFactory("MarketFactory");
	const factory = await Factory.deploy(deployer.address, await oracle.getAddress(), feeRecipient, flatFee);
	await factory.waitForDeployment();
	console.log("MarketFactory:", await factory.getAddress());
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

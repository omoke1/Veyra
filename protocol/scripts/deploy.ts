import { ethers } from "hardhat";

async function main() {
	const [deployer] = await ethers.getSigners();
	console.log("Deployer:", deployer.address);

	const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
	const oracle = await Oracle.deploy(deployer.address);
	await oracle.waitForDeployment();
	console.log("VPOOracleChainlink:", await oracle.getAddress());

	const flatFee = 500000n; // $0.50 for 6-decimal collateral
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

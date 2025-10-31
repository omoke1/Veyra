import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.26",
		settings: {
			optimizer: { enabled: true, runs: 200 },
		},
	},
	paths: {
		sources: "contracts",
		artifacts: "artifacts",
		cache: "cache",
	},
	networks: {
		sepolia: {
			url: process.env.SEPOLIA_RPC_URL || "",
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
		},
	},
	typechain: {
		outDir: "typechain-types",
		target: "ethers-v6",
	},
};

export default config;

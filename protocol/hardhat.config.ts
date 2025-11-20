import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

function getAccounts(): string[] {
	const pk = process.env.PRIVATE_KEY || "";
	const hex = pk.startsWith("0x") ? pk.slice(2) : pk;
	return hex.length === 64 ? [pk] : [];
}

const root = __dirname;

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.26",
		settings: {
			optimizer: { enabled: true, runs: 200 },
			viaIR: true, // Enable IR-based compilation to resolve "stack too deep" errors
		},
	},
	paths: {
		sources: path.join(root, "contracts"),
		artifacts: path.join(root, "artifacts"),
		cache: path.join(root, "cache"),
		tests: path.join(root, "test"),
	},
	networks: {
		sepolia: {
			url: process.env.SEPOLIA_RPC_URL || "",
			accounts: getAccounts(),
			chainId: 11155111,
		},
		baseSepolia: {
			url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
			accounts: getAccounts(),
			chainId: 84532,
		},
	},
	typechain: {
		outDir: path.join(root, "typechain-types"),
		target: "ethers-v6",
	},
};

export default config;

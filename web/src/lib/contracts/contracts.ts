/**
 * Contract ABIs and factory functions
 * Import contract ABIs from protocol artifacts
 */

import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./config";
import {
	VeyraOracleAVSABI,
	VPOOracleChainlinkABI,
	MarketFactoryABI,
	PredictionMarketABI,
	ERC20ABI,
} from "./abis";

export { CONTRACT_ADDRESSES };

// Re-export ABIs for backward compatibility
export { VeyraOracleAVSABI, VPOOracleChainlinkABI, MarketFactoryABI, ERC20ABI };
export const MarketABI = PredictionMarketABI;

export const TEST_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TEST_TOKEN_ADDRESS || "0x228727D028c45f9fD21f2232e0B3775c5CA972Cc").toLowerCase();

/**
 * Get contract instances using ethers.js
 */
export function getMarketFactoryContract(
	signerOrProvider: ethers.Signer | ethers.Provider,
	network: "sepolia" | "baseSepolia" | "local" = "sepolia"
): ethers.Contract {
	const address = CONTRACT_ADDRESSES[network].MarketFactory;
	if (!address) {
		throw new Error(`MarketFactory address not set for ${network}`);
	}
	return new ethers.Contract(address, MarketFactoryABI, signerOrProvider);
}

export function getMarketContract(
	address: string,
	signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
	return new ethers.Contract(address, MarketABI, signerOrProvider);
}

export function getERC20Contract(
	address: string,
	signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
	return new ethers.Contract(address, ERC20ABI, signerOrProvider);
}

export function getVPOOracleContract(
	signerOrProvider: ethers.Signer | ethers.Provider,
	network: "sepolia" | "baseSepolia" | "local" = "sepolia"
): ethers.Contract {
	const address = CONTRACT_ADDRESSES[network].VPOOracleChainlink;
	if (!address) {
		throw new Error(`VPOOracleChainlink address not set for ${network}`);
	}
	return new ethers.Contract(address, VPOOracleChainlinkABI, signerOrProvider);
}

export function getVPOAdapterContract(
	signerOrProvider: ethers.Signer | ethers.Provider,
	network: "sepolia" | "baseSepolia" | "local" = "sepolia"
): ethers.Contract {
	const address = CONTRACT_ADDRESSES[network].VPOAdapter;
	if (!address) {
		throw new Error(`VPOAdapter address not set for ${network}`);
	}
	return new ethers.Contract(address, VeyraOracleAVSABI, signerOrProvider);
}

/**
 * Get provider for the specified network
 */
export function getProvider(network: "sepolia" | "baseSepolia" | "local" = "sepolia"): ethers.JsonRpcProvider {
	let rpcUrl: string;
	if (network === "sepolia") {
		rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia.publicnode.com";
	} else if (network === "baseSepolia") {
		rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
	} else {
		rpcUrl = "http://localhost:8545"; 
	}
	return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get signer from wallet provider
 */
/**
 * Get signer from wallet provider
 */
export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
	if (typeof window === "undefined" || !window.ethereum) {
		return null;
	}

	try {
		const provider = new ethers.BrowserProvider(window.ethereum);
		return await provider.getSigner();
	} catch {
		return null;
	}
}


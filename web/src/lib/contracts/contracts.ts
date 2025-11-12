/**
 * Contract ABIs and factory functions
 * Import contract ABIs from protocol artifacts
 */

import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./config";

// Contract ABIs - import from protocol artifacts
// We'll use the minimal ABI we need for frontend interactions
export const MarketFactoryABI = [
	"function createMarket(address collateral, string memory question, uint256 endTime, uint16 feeBps) external returns (address market, address vault)",
	"function createMarketWithOracle(address collateral_, string memory question_, uint256 endTime_, uint16 feeBps_, address oracle_) public returns (address market, address vault)",
	"function computeMarketId(address creator, string memory question, uint256 endTime) public pure returns (bytes32)",
	"function oracle() external view returns (address)",
	"event MarketDeployed(bytes32 indexed marketId, address market, address vault, string question, uint256 endTime, uint16 feeBps, uint256 flatFee, address feeRecipient)",
] as const;

export const MarketABI = [
	"function buy(bool isLong, uint256 collateralIn) external",
	"function sell(bool isLong, uint256 shares) external",
	"function closeTrading() external",
	"function requestResolve(bytes calldata extraData) external",
	"function settleFromOracle() external",
	"function redeem() external",
	"function longOf(address) external view returns (uint256)",
	"function shortOf(address) external view returns (uint256)",
	"function status() external view returns (uint8)",
	"function outcome() external view returns (uint8)",
	"function question() external view returns (string)",
	"function endTime() external view returns (uint256)",
	"function flatFee() external view returns (uint256)",
	"function marketId() external view returns (bytes32)",
	"function vault() external view returns (address)",
	"function collateral() external view returns (address)",
	"event Trade(address indexed trader, bool isLong, uint256 collateralInOrOut, uint256 sharesDelta, uint256 fee)",
	"event Resolve(bytes32 indexed marketId, uint8 outcome, bytes resultData, bytes metadata)",
	"event Redeem(address indexed user, uint256 payout)",
] as const;

export const VPOOracleChainlinkABI = [
	"function requestResolve(bytes32 marketId, bytes calldata extraData) external",
	"function fulfillResult(bytes32 marketId, bytes calldata resultData, bytes calldata metadata) external",
	"function getResult(bytes32 marketId) external view returns (bool resolved, bytes memory resultData, bytes memory metadata)",
	"function admin() external view returns (address)",
	"event ResolveRequested(bytes32 indexed marketId, address indexed requester, bytes extraData)",
	"event ResolveFulfilled(bytes32 indexed marketId, bytes resultData, bytes metadata)",
] as const;

export const ERC20ABI = [
	"function approve(address spender, uint256 amount) external returns (bool)",
	"function allowance(address owner, address spender) external view returns (uint256)",
	"function balanceOf(address account) external view returns (uint256)",
	"function decimals() external view returns (uint8)",
	"function symbol() external view returns (string)",
] as const;

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

/**
 * Get provider for the specified network
 */
export function getProvider(network: "sepolia" | "baseSepolia" | "local" = "sepolia"): ethers.JsonRpcProvider {
	let rpcUrl: string;
	if (network === "sepolia") {
		rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
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
export async function getSigner(): Promise<ethers.BrowserProvider | null> {
	if (typeof window === "undefined" || !window.ethereum) {
		return null;
	}

	try {
		return new ethers.BrowserProvider(window.ethereum);
	} catch {
		return null;
	}
}


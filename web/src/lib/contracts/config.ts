/**
 * Contract configuration and addresses
 * Update these addresses after deploying to Sepolia
 */

export const NETWORKS = {
	sepolia: {
		chainId: 11155111,
		name: "Sepolia",
		rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
	},
	baseSepolia: {
		chainId: 84532,
		name: "Base Sepolia",
		rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
	},
	local: {
		chainId: 31337,
		name: "Local Hardhat",
		rpcUrl: "http://localhost:8545",
	},
} as const;

export type NetworkName = keyof typeof NETWORKS;

// Contract addresses - Deployed on Sepolia and Base Sepolia
// Update these if you need to override via environment variables
export const CONTRACT_ADDRESSES = {
	sepolia: {
		MarketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x5DbDf19ee3FbF92ABbdBf2370b85A5C8971F3cD4",
		VPOOracleChainlink: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "0xa249E2981768f8B708027418625D5a0Ac85b8f1B",
		VPOOracleRelayer: process.env.NEXT_PUBLIC_RELAYER_ORACLE_ADDRESS || "",
		VPOAdapter: process.env.NEXT_PUBLIC_ADAPTER_ADDRESS || "0x13179cdE5ff82f8ab183a5465445818c243118de",
	},
	baseSepolia: {
		MarketFactory: process.env.NEXT_PUBLIC_BASE_FACTORY_ADDRESS || "",
		VPOOracleChainlink: process.env.NEXT_PUBLIC_BASE_ORACLE_ADDRESS || "",
		VPOOracleRelayer: process.env.NEXT_PUBLIC_BASE_RELAYER_ORACLE_ADDRESS || "",
		VPOAdapter: process.env.NEXT_PUBLIC_BASE_ADAPTER_ADDRESS || "",
	},
	local: {
		MarketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",
		VPOOracleChainlink: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "",
		VPOOracleRelayer: process.env.NEXT_PUBLIC_RELAYER_ORACLE_ADDRESS || "",
		VPOAdapter: process.env.NEXT_PUBLIC_ADAPTER_ADDRESS || "",
	},
} as const;

/**
 * Get the current network from the wallet
 */
export async function getCurrentNetwork(): Promise<NetworkName | null> {
	if (typeof window === "undefined" || !window.ethereum) {
		return null;
	}

	try {
		const chainId = await window.ethereum.request({
			method: "eth_chainId",
		});
		const chainIdNumber = parseInt(chainId as string, 16);

		if (chainIdNumber === NETWORKS.sepolia.chainId) {
			return "sepolia";
		}
		if (chainIdNumber === NETWORKS.baseSepolia.chainId) {
			return "baseSepolia";
		}
		if (chainIdNumber === NETWORKS.local.chainId) {
			return "local";
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Switch to Sepolia network
 */
export async function switchToSepolia(): Promise<boolean> {
	if (typeof window === "undefined" || !window.ethereum) {
		return false;
	}

	try {
		await window.ethereum.request({
			method: "wallet_switchEthereumChain",
			params: [{ chainId: `0x${NETWORKS.sepolia.chainId.toString(16)}` }],
		});
		return true;
	} catch (error: any) {
		// If chain doesn't exist, add it
		if (error.code === 4902) {
			try {
				await window.ethereum.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: `0x${NETWORKS.sepolia.chainId.toString(16)}`,
							chainName: NETWORKS.sepolia.name,
							rpcUrls: [NETWORKS.sepolia.rpcUrl],
							nativeCurrency: {
								name: "ETH",
								symbol: "ETH",
								decimals: 18,
							},
						},
					],
				});
				return true;
			} catch {
				return false;
			}
		}
		return false;
	}
}


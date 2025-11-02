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
	local: {
		chainId: 31337,
		name: "Local Hardhat",
		rpcUrl: "http://localhost:8545",
	},
} as const;

export type NetworkName = keyof typeof NETWORKS;

// Contract addresses - will be populated from deployments/sepolia.json after deployment
// For now, these are placeholders that will be replaced during deployment
export const CONTRACT_ADDRESSES = {
	sepolia: {
		MarketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",
		VPOOracleChainlink: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "",
	},
	local: {
		MarketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",
		VPOOracleChainlink: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "",
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


/**
 * React hooks for contract interactions
 */

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/lib/wallet/walletContext";
import {
	getMarketFactoryContract,
	getMarketContract,
	getERC20Contract,
	getProvider,
	getSigner,
} from "./contracts";
import { getCurrentNetwork, switchToSepolia } from "./config";
import { MarketFactoryABI, MarketABI, ERC20ABI } from "./contracts";

export interface CreateMarketParams {
	collateral: string;
	question: string;
	endTime: number;
	feeBps?: number;
	oracle?: string; // Optional oracle address (uses factory default if not provided)
}

export interface TradeParams {
	marketAddress: string;
	collateralAddress: string;
	isLong: boolean;
	amount: bigint; // in collateral smallest units (e.g., 6 decimals for USDC)
}

/**
 * Hook for creating a new market
 */
export function useCreateMarket() {
	const { address, isConnected } = useWallet();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createMarket = useCallback(
		async (params: CreateMarketParams) => {
			if (!isConnected || !address) {
				setError("Please connect your wallet");
				return null;
			}

			setIsLoading(true);
			setError(null);

			try {
				// Check network
				const network = await getCurrentNetwork();
				if (!network) {
					const switched = await switchToSepolia();
					if (!switched) {
						throw new Error("Please switch to Sepolia network");
					}
				}

				const provider = await getSigner();
				if (!provider) {
					throw new Error("Failed to get wallet provider");
				}

				const signer = await provider.getSigner();
				const factory = getMarketFactoryContract(signer, network || "sepolia");

				// Use createMarketWithOracle if oracle is provided, otherwise use default createMarket
				const tx = params.oracle && params.oracle !== ethers.ZeroAddress
					? await factory.createMarketWithOracle(
							params.collateral,
							params.question,
							params.endTime,
							params.feeBps || 0,
							params.oracle
						)
					: await factory.createMarket(
							params.collateral,
							params.question,
							params.endTime,
							params.feeBps || 0
						);

				const receipt = await tx.wait();

				// Find MarketDeployed event
				const event = receipt.logs
					.map((log: any) => {
						try {
							return factory.interface.parseLog({
								topics: log.topics,
								data: log.data,
							});
						} catch {
							return null;
						}
					})
					.find((e: any) => e && e.name === "MarketDeployed");

				if (!event) {
					throw new Error("MarketDeployed event not found");
				}

				const { market, vault, marketId } = event.args;

				setIsLoading(false);
				return {
					market: market as string,
					vault: vault as string,
					marketId: marketId as string,
					txHash: receipt.hash,
				};
			} catch (err: any) {
				setError(err.message || "Failed to create market");
				setIsLoading(false);
				return null;
			}
		},
		[address, isConnected]
	);

	return { createMarket, isLoading, error };
}

/**
 * Hook for trading (buy/sell)
 */
export function useTrade() {
	const { address, isConnected } = useWallet();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const trade = useCallback(
		async (params: TradeParams) => {
			if (!isConnected || !address) {
				setError("Please connect your wallet");
				return false;
			}

			setIsLoading(true);
			setError(null);

			try {
				const provider = await getSigner();
				if (!provider) {
					throw new Error("Failed to get wallet provider");
				}

				const signer = await provider.getSigner();
				const network = await getCurrentNetwork() || "sepolia";

				// Get market and ERC20 contracts
				const market = getMarketContract(params.marketAddress, signer);
				const vaultAddress = await market.vault();
				const collateralAddress = await market.collateral();
				const collateral = getERC20Contract(collateralAddress, signer);

				// Check if we need to approve (for buy only)
				if (params.isLong !== false) {
					// For buy: check allowance
					const allowance = await collateral.allowance(address, vaultAddress);
					if (allowance < params.amount) {
						const approveTx = await collateral.approve(vaultAddress, params.amount);
						await approveTx.wait();
					}
				}

				// Execute trade
				let tx;
				if (params.isLong !== false) {
					// Buy
					tx = await market.buy(params.isLong, params.amount);
				} else {
					// Sell
					tx = await market.sell(params.isLong, params.amount);
				}

				await tx.wait();
				setIsLoading(false);
				return true;
			} catch (err: any) {
				setError(err.message || "Failed to execute trade");
				setIsLoading(false);
				return false;
			}
		},
		[address, isConnected]
	);

	return { trade, isLoading, error };
}

/**
 * Hook for reading market data
 */
export function useMarketData(marketAddress: string | null) {
	const [data, setData] = useState<{
		question: string;
		endTime: bigint;
		status: number;
		outcome: number;
		flatFee: bigint;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!marketAddress) {
			setData(null);
			return;
		}

		const fetchData = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const network = await getCurrentNetwork() || "sepolia";
				const provider = getProvider(network);
				const market = getMarketContract(marketAddress, provider);

				const [question, endTime, status, outcome, flatFee] = await Promise.all([
					market.question(),
					market.endTime(),
					market.status(),
					market.outcome(),
					market.flatFee(),
				]);

				setData({
					question,
					endTime,
					status: Number(status),
					outcome: Number(outcome),
					flatFee,
				});
			} catch (err: any) {
				setError(err.message || "Failed to fetch market data");
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [marketAddress]);

	return { data, isLoading, error };
}


"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { getProvider, getCurrentNetwork, getMarketContract, getERC20Contract } from "@/lib/contracts/contracts";
import { ethers } from "ethers";

interface Position {
	marketAddress: string;
	question: string;
	longShares: string;
	shortShares: string;
	status: number; // 0 = Trading, 1 = PendingResolve, 2 = Resolved
	outcome: number; // 0 = short wins, 1 = long wins
	endTime: bigint;
	collateralSymbol: string;
	collateralDecimals: number;
}

export default function PositionsPage(): React.ReactElement {
	const { address, isConnected } = useWallet();
	const [positions, setPositions] = useState<Position[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch user positions from indexer or contract
	useEffect(() => {
		if (!isConnected || !address) {
			setPositions([]);
			return;
		}

		const fetchPositions = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const network = await getCurrentNetwork() || "sepolia";
				const provider = getProvider(network);

				// For now, we'll need to get market addresses from indexer
				// TODO: Replace with actual indexer API call
				const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";
				const marketsRes = await fetch(`${indexerUrl}/positions/${address}`);
				
				if (!marketsRes.ok) {
					// Fallback: try to get from trades endpoint
					const tradesRes = await fetch(`${indexerUrl}/positions/${address}`);
					if (!tradesRes.ok) {
						setPositions([]);
						setIsLoading(false);
						return;
					}
					const trades = await tradesRes.json();
					
					// Group trades by market and calculate positions
					const marketMap = new Map<string, {
						longShares: bigint;
						shortShares: bigint;
						marketAddress: string;
					}>();

					for (const trade of trades) {
						const marketAddr = trade.market.toLowerCase();
						if (!marketMap.has(marketAddr)) {
							marketMap.set(marketAddr, {
								longShares: 0n,
								shortShares: 0n,
								marketAddress: trade.market,
							});
						}
						const pos = marketMap.get(marketAddr)!;
						
						// Accumulate shares (simplified - would need to track buy vs sell)
						if (trade.isLong) {
							pos.longShares += BigInt(trade.sharesDelta || 0);
						} else {
							pos.shortShares += BigInt(trade.sharesDelta || 0);
						}
					}

					// Fetch market details for each position
					const positionPromises = Array.from(marketMap.entries()).map(async ([addr, pos]) => {
						try {
							const market = getMarketContract(pos.marketAddress, provider);
							const collateralAddr = await market.collateral();
							const collateral = getERC20Contract(collateralAddr, provider);
							
							const [question, endTime, status, outcome, decimals, symbol] = await Promise.all([
								market.question(),
								market.endTime(),
								market.status(),
								market.outcome(),
								collateral.decimals(),
								collateral.symbol(),
							]);

							// Get actual user positions
							const [longShares, shortShares] = await Promise.all([
								market.longOf(address),
								market.shortOf(address),
							]);

							if (longShares === 0n && shortShares === 0n) {
								return null; // Skip positions with no shares
							}

							return {
								marketAddress: pos.marketAddress,
								question,
								longShares: ethers.formatUnits(longShares, decimals),
								shortShares: ethers.formatUnits(shortShares, decimals),
								status: Number(status),
								outcome: Number(outcome),
								endTime,
								collateralSymbol: symbol,
								collateralDecimals: Number(decimals),
							} as Position;
						} catch (err) {
							console.error(`Error fetching market ${addr}:`, err);
							return null;
						}
					});

					const fetchedPositions = (await Promise.all(positionPromises)).filter(
						(p): p is Position => p !== null
					);

					setPositions(fetchedPositions);
				} else {
					// If indexer has positions endpoint with full data
					const data = await marketsRes.json();
					setPositions(data);
				}
			} catch (err: any) {
				setError(err.message || "Failed to fetch positions");
			} finally {
				setIsLoading(false);
			}
		};

		fetchPositions();
	}, [address, isConnected]);

	const getStatusBadge = (status: number) => {
		switch (status) {
			case 0:
				return <Badge className="bg-blue-500/10 text-blue-500">Trading</Badge>;
			case 1:
				return <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
			case 2:
				return <Badge className="bg-green-500/10 text-green-500">Resolved</Badge>;
			default:
				return <Badge variant="outline">Unknown</Badge>;
		}
	};

	const getPnl = (position: Position): { amount: string; isWinning: boolean } => {
		if (position.status !== 2) {
			return { amount: "-", isWinning: false };
		}

		const longShares = parseFloat(position.longShares);
		const shortShares = parseFloat(position.shortShares);

		if (position.outcome === 1 && longShares > 0) {
			// Long won
			return { amount: position.longShares, isWinning: true };
		} else if (position.outcome === 0 && shortShares > 0) {
			// Short won
			return { amount: position.shortShares, isWinning: true };
		}

		return { amount: "0", isWinning: false };
	};

	if (!isConnected) {
		return (
			<div className="space-y-4 sm:space-y-6">
				<h1 className="text-xl sm:text-2xl font-semibold">My Positions</h1>
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						<p>Please connect your wallet to view your positions</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<h1 className="text-xl sm:text-2xl font-semibold">My Positions</h1>

			{isLoading ? (
				<Card>
					<CardContent className="py-8 text-center">
						<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
						<p className="text-muted-foreground">Loading positions...</p>
					</CardContent>
				</Card>
			) : error ? (
				<Card>
					<CardContent className="py-8 text-center text-red-500">
						<p>Error: {error}</p>
					</CardContent>
				</Card>
			) : positions.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						<p>You don't have any open positions</p>
						<p className="text-sm mt-2">Trade in markets to see your positions here</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{positions.map((position) => {
						const pnl = getPnl(position);
						return (
							<Card key={position.marketAddress}>
								<CardHeader>
									<div className="flex items-start justify-between gap-4 mb-2">
										<CardTitle className="text-base sm:text-lg line-clamp-2 flex-1">
											{position.question}
										</CardTitle>
										{getStatusBadge(position.status)}
									</div>
									<CardDescription className="text-xs font-mono">
										{position.marketAddress}
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<div className="text-muted-foreground text-xs mb-1">Long Position</div>
											<div className="flex items-center gap-2">
												<TrendingUp className="h-4 w-4 text-green-500" />
												<span className="font-medium">
													{parseFloat(position.longShares) > 0
														? parseFloat(position.longShares).toFixed(4)
														: "0"}
												</span>
											</div>
										</div>
										<div>
											<div className="text-muted-foreground text-xs mb-1">Short Position</div>
											<div className="flex items-center gap-2">
												<TrendingDown className="h-4 w-4 text-red-500" />
												<span className="font-medium">
													{parseFloat(position.shortShares) > 0
														? parseFloat(position.shortShares).toFixed(4)
														: "0"}
												</span>
											</div>
										</div>
									</div>

									{position.status === 2 && (
										<div className="pt-2 border-t">
											<div className="text-muted-foreground text-xs mb-1">Potential Payout</div>
											<div
												className={`text-lg font-semibold ${
													pnl.isWinning ? "text-green-500" : "text-muted-foreground"
												}`}
											>
												{pnl.isWinning
													? `${pnl.amount} ${position.collateralSymbol}`
													: "0 (No winning position)"}
											</div>
										</div>
									)}

									<Separator />

									<div className="flex gap-2 pt-2">
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												window.location.href = `/dashboard/markets`;
											}}
										>
											View Market
										</Button>
										{position.status === 2 && pnl.isWinning && (
											<Button
												size="sm"
												className="flex-1"
												onClick={() => {
													window.location.href = `/dashboard/markets?redeem=${position.marketAddress}`;
												}}
											>
												Redeem
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}


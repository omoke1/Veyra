"use client";

import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrade } from "@/lib/contracts/hooks";
import { useWallet } from "@/lib/wallet/walletContext";
import { useMarketData } from "@/lib/contracts/hooks";
import { getERC20Contract, getProvider } from "@/lib/contracts/contracts";
import { getCurrentNetwork } from "@/lib/contracts/config";
import { ethers } from "ethers";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface TradeDialogProps {
	marketAddress: string;
	trigger?: React.ReactNode;
}

export function TradeDialog({ marketAddress, trigger }: TradeDialogProps): React.ReactElement {
	const { isConnected, connect, address } = useWallet();
	const { trade, isLoading, error } = useTrade();
	const { data: marketData } = useMarketData(marketAddress);
	
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<"buy" | "sell">("buy");
	const [amount, setAmount] = useState("");
	const [isLong, setIsLong] = useState(true);
	const [collateralAddress, setCollateralAddress] = useState<string | null>(null);
	const [decimals, setDecimals] = useState<number>(6);
	const [balance, setBalance] = useState<string>("0");
	const [shares, setShares] = useState({ long: "0", short: "0" });

	// Fetch market collateral address and user positions
	useEffect(() => {
		if (!marketAddress || !address || !isConnected || !open) return;

		const fetchMarketInfo = async () => {
			try {
				const network = await getCurrentNetwork() || "sepolia";
				const provider = getProvider(network);
				const marketContract = new ethers.Contract(
					marketAddress,
					["function collateral() external view returns (address)", "function vault() external view returns (address)"],
					provider
				);

				const collateralAddr = await marketContract.collateral();
				setCollateralAddress(collateralAddr);

				// Get ERC20 info
				const erc20 = getERC20Contract(collateralAddr, provider);
				const [decimalsVal, balanceVal] = await Promise.all([
					erc20.decimals(),
					erc20.balanceOf(address),
				]);
				setDecimals(Number(decimalsVal));
				setBalance(ethers.formatUnits(balanceVal, decimalsVal));

				// Get user positions
				const marketFull = new ethers.Contract(
					marketAddress,
					[
						"function longOf(address) external view returns (uint256)",
						"function shortOf(address) external view returns (uint256)",
					],
					provider
				);
				const [longPos, shortPos] = await Promise.all([
					marketFull.longOf(address),
					marketFull.shortOf(address),
				]);
				setShares({
					long: ethers.formatUnits(longPos, decimalsVal),
					short: ethers.formatUnits(shortPos, decimalsVal),
				});
			} catch (err) {
				console.error("Error fetching market info:", err);
			}
		};

		fetchMarketInfo();
	}, [marketAddress, address, isConnected, open]);

	const handleTrade = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!isConnected) {
			await connect();
			return;
		}

		if (!amount || !collateralAddress) {
			return;
		}

		// Convert amount to smallest units (considering decimals)
		// For sell, amount is in shares (which have same decimals as collateral)
		// For buy, amount is in collateral units
		const amountInUnits = ethers.parseUnits(amount, decimals);

		const success = await trade({
			marketAddress,
			collateralAddress,
			isLong: tab === "buy" ? isLong : isLong, // Keep same direction for sell
			amount: amountInUnits,
		});

		if (success) {
			setOpen(false);
			setAmount("");
			// Reset shares after successful trade
			setShares({ long: "0", short: "0" });
		}
	};

	const maxAmount = tab === "sell"
		? (isLong ? shares.long : shares.short)
		: balance;

	const handleMaxClick = () => {
		if (maxAmount && parseFloat(maxAmount) > 0) {
			setAmount(maxAmount);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button size="sm" variant="outline">
						Trade
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle>
						{tab === "buy" ? "Buy Position" : "Sell Position"}
					</DialogTitle>
					<DialogDescription>
						{tab === "buy"
							? "Buy long or short shares in this market"
							: "Sell your existing positions"}
					</DialogDescription>
				</DialogHeader>
				
				<Tabs value={tab} onValueChange={(v) => setTab(v as "buy" | "sell")}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="buy">
							<TrendingUp className="h-4 w-4 mr-2" />
							Buy
						</TabsTrigger>
						<TabsTrigger value="sell">
							<TrendingDown className="h-4 w-4 mr-2" />
							Sell
						</TabsTrigger>
					</TabsList>

					<TabsContent value="buy" className="space-y-4 mt-4">
						<div className="space-y-2">
							<Label>Direction</Label>
							<div className="flex gap-2">
								<Button
									type="button"
									variant={isLong ? "default" : "outline"}
									className="flex-1"
									onClick={() => setIsLong(true)}
									disabled={isLoading}
								>
									Long (Yes)
								</Button>
								<Button
									type="button"
									variant={!isLong ? "default" : "outline"}
									className="flex-1"
									onClick={() => setIsLong(false)}
									disabled={isLoading}
								>
									Short (No)
								</Button>
							</div>
						</div>

						<form onSubmit={handleTrade} className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="amount">Amount</Label>
									{balance && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-auto p-0 text-xs"
											onClick={handleMaxClick}
										>
											Max: {parseFloat(balance).toFixed(4)}
										</Button>
									)}
								</div>
								<Input
									id="amount"
									type="number"
									step="0.000001"
									placeholder="0.0"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									required
									disabled={isLoading}
									min="0"
									max={balance}
								/>
								{marketData && (
									<p className="text-xs text-muted-foreground">
										Fee: {ethers.formatUnits(marketData.flatFee, decimals)} (flat fee)
									</p>
								)}
							</div>

							{error && (
								<div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
									{error}
								</div>
							)}

							<Button type="submit" className="w-full" disabled={isLoading || !isConnected}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Processing...
									</>
								) : !isConnected ? (
									"Connect Wallet"
								) : (
									`Buy ${isLong ? "Long" : "Short"}`
								)}
							</Button>
						</form>
					</TabsContent>

					<TabsContent value="sell" className="space-y-4 mt-4">
						{(parseFloat(shares.long) > 0 || parseFloat(shares.short) > 0) ? (
							<>
								<div className="space-y-2">
									<Label>Direction</Label>
									<div className="flex gap-2">
										<Button
											type="button"
											variant={isLong ? "default" : "outline"}
											className="flex-1"
											onClick={() => setIsLong(true)}
											disabled={isLoading || parseFloat(shares.long) === 0}
										>
											Long ({parseFloat(shares.long).toFixed(4)})
										</Button>
										<Button
											type="button"
											variant={!isLong ? "default" : "outline"}
											className="flex-1"
											onClick={() => setIsLong(false)}
											disabled={isLoading || parseFloat(shares.short) === 0}
										>
											Short ({parseFloat(shares.short).toFixed(4)})
										</Button>
									</div>
								</div>

								<form onSubmit={handleTrade} className="space-y-4">
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="sellAmount">Amount to Sell</Label>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-auto p-0 text-xs"
												onClick={handleMaxClick}
											>
												Max: {maxAmount}
											</Button>
										</div>
										<Input
											id="sellAmount"
											type="number"
											step="0.000001"
											placeholder="0.0"
											value={amount}
											onChange={(e) => setAmount(e.target.value)}
											required
											disabled={isLoading}
											min="0"
											max={maxAmount}
										/>
									</div>

									{error && (
										<div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
											{error}
										</div>
									)}

									<Button type="submit" className="w-full" disabled={isLoading || !isConnected}>
										{isLoading ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Processing...
											</>
										) : !isConnected ? (
											"Connect Wallet"
										) : (
											`Sell ${isLong ? "Long" : "Short"}`
										)}
									</Button>
								</form>
							</>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<p className="text-sm">You don't have any positions to sell.</p>
								<p className="text-xs mt-2">Buy a position first to enable selling.</p>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}


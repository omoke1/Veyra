"use client";

import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet/walletContext";
import { getProvider, getMarketContract, getSigner } from "@/lib/contracts/contracts";
import { getCurrentNetwork } from "@/lib/contracts/config";
import { ethers } from "ethers";
import { Loader2, CheckCircle2, Wallet } from "lucide-react";

interface RedeemDialogProps {
	marketAddress: string;
	trigger?: React.ReactNode;
}

export function RedeemDialog({ marketAddress, trigger }: RedeemDialogProps): React.ReactElement {
	const { address, isConnected, connect } = useWallet();
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isChecking, setIsChecking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [redeemable, setRedeemable] = useState<{
		amount: string;
		symbol: string;
		hasWinningPosition: boolean;
	} | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);

	useEffect(() => {
		if (!marketAddress || !open || !address || !isConnected) {
			setRedeemable(null);
			return;
		}

		const checkRedeemable = async () => {
			setIsChecking(true);
			setError(null);

			try {
				const network = await getCurrentNetwork() || "sepolia";
				const provider = getProvider(network);
				const market = getMarketContract(marketAddress, provider);

				// Check market status
				const status = await market.status();
				if (Number(status) !== 2) {
					setError("Market is not resolved yet");
					setRedeemable(null);
					setIsChecking(false);
					return;
				}

				// Get user positions
				const [longShares, shortShares, outcome] = await Promise.all([
					market.longOf(address),
					market.shortOf(address),
					market.outcome(),
				]);

				// Get collateral info
				const collateralAddr = await market.collateral();
				const collateral = new ethers.Contract(
					collateralAddr,
					["function symbol() external view returns (string)", "function decimals() external view returns (uint8)"],
					provider
				);
				const [symbol, decimals] = await Promise.all([
					collateral.symbol(),
					collateral.decimals(),
				]);

				// Calculate redeemable amount based on outcome
				let redeemableAmount = BigInt(0);
				if (Number(outcome) === 1 && longShares > BigInt(0)) {
					// Long won
					redeemableAmount = longShares;
				} else if (Number(outcome) === 0 && shortShares > BigInt(0)) {
					// Short won
					redeemableAmount = shortShares;
				}

				if (redeemableAmount === BigInt(0)) {
					setRedeemable({
						amount: "0",
						symbol: symbol as string,
						hasWinningPosition: false,
					});
				} else {
					setRedeemable({
						amount: ethers.formatUnits(redeemableAmount, Number(decimals)),
						symbol: symbol as string,
						hasWinningPosition: true,
					});
				}
			} catch (err: any) {
				setError(err.message || "Failed to check redeemable amount");
				setRedeemable(null);
			} finally {
				setIsChecking(false);
			}
		};

		checkRedeemable();
	}, [marketAddress, open, address, isConnected]);

	const handleRedeem = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		if (!redeemable || !redeemable.hasWinningPosition) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const signer = await getSigner();
			if (!signer) throw new Error("Failed to get wallet signer");
			const network = await getCurrentNetwork() || "sepolia";
			const market = getMarketContract(marketAddress, signer);

			const tx = await market.redeem();
			const receipt = await tx.wait();

			setTxHash(receipt.hash);
		} catch (err: any) {
			setError(err.message || "Failed to redeem");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button size="sm" variant="default">
						Redeem
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle>Redeem Winnings</DialogTitle>
					<DialogDescription>
						Redeem your winning shares from this resolved market
					</DialogDescription>
				</DialogHeader>

				{isChecking ? (
					<div className="py-8 text-center">
						<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
						<p className="text-sm text-muted-foreground">Checking redeemable amount...</p>
					</div>
				) : redeemable ? (
					<div className="space-y-4">
						{redeemable.hasWinningPosition ? (
							<>
								<div className="text-center py-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
									<div className="text-sm text-muted-foreground mb-2">Redeemable Amount</div>
									<div className="text-2xl font-bold text-green-600 dark:text-green-400">
										{parseFloat(redeemable.amount).toFixed(4)} {redeemable.symbol}
									</div>
								</div>

								{txHash ? (
									<div className="text-center py-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
										<CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
										<p className="text-sm font-medium mb-2">Redemption Successful!</p>
										<a
											href={`https://sepolia.etherscan.io/tx/${txHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-blue-500 hover:underline"
										>
											View on Etherscan
										</a>
									</div>
								) : (
									<>
										{error && (
											<div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
												{error}
											</div>
										)}

										<Button
											className="w-full"
											onClick={handleRedeem}
											disabled={isLoading || !isConnected}
										>
											{isLoading ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Processing...
												</>
											) : !isConnected ? (
												<>
													<Wallet className="mr-2 h-4 w-4" />
													Connect Wallet
												</>
											) : (
												"Redeem Now"
											)}
										</Button>
									</>
								)}
							</>
						) : (
							<div className="text-center py-4">
								<p className="text-sm text-muted-foreground">
									You don't have any winning positions in this market.
								</p>
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-4">
						{error ? (
							<p className="text-sm text-red-500">{error}</p>
						) : (
							<p className="text-sm text-muted-foreground">Checking...</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}


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
import { useWallet } from "@/lib/wallet/walletContext";
import { getProvider, getMarketContract, getVPOOracleContract } from "@/lib/contracts/contracts";
import { getCurrentNetwork } from "@/lib/contracts/config";
import { ethers } from "ethers";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResolveMarketDialogProps {
	marketAddress: string;
	trigger?: React.ReactNode;
}

export function ResolveMarketDialog({ marketAddress, trigger }: ResolveMarketDialogProps): React.ReactElement {
	const { address, isConnected, connect } = useWallet();
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isChecking, setIsChecking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [marketStatus, setMarketStatus] = useState<{
		status: number;
		endTime: bigint;
		isOracle: boolean;
		marketId: string;
	} | null>(null);
	const [outcome, setOutcome] = useState<"0" | "1">("1");
	const [txHash, setTxHash] = useState<string | null>(null);
	const [step, setStep] = useState<"check" | "request" | "fulfill" | "settle" | "success">("check");

	useEffect(() => {
		if (!marketAddress || !open || !address || !isConnected) {
			setMarketStatus(null);
			return;
		}

		const checkMarketStatus = async () => {
			setIsChecking(true);
			setError(null);

			try {
				const network = await getCurrentNetwork() || "sepolia";
				const provider = getProvider(network);
				const market = getMarketContract(marketAddress, provider);

				const [status, endTime, marketId] = await Promise.all([
					market.status(),
					market.endTime(),
					market.marketId(),
				]);

				// Check if current block time has passed endTime
				const block = await provider.getBlock("latest");
				const canClose = block && BigInt(block.timestamp) >= endTime;

				// Check if user is oracle admin (simplified - in production, check actual oracle admin)
				// For now, we'll allow anyone to try, but contract will reject if not authorized
				const oracle = getVPOOracleContract(provider, network);
				const oracleAdmin = await oracle.admin();

				setMarketStatus({
					status: Number(status),
					endTime,
					isOracle: oracleAdmin.toLowerCase() === address.toLowerCase(),
					marketId: marketId as string,
				});

				if (Number(status) === 2) {
					setError("Market is already resolved");
				} else if (Number(status) === 0 && canClose) {
					setStep("request");
				} else if (Number(status) === 0) {
					setError(`Market trading ends at ${new Date(Number(endTime) * 1000).toLocaleString()}`);
				} else if (Number(status) === 1) {
					setStep("fulfill");
				}
			} catch (err: any) {
				setError(err.message || "Failed to check market status");
				setMarketStatus(null);
			} finally {
				setIsChecking(false);
			}
		};

		checkMarketStatus();
	}, [marketAddress, open, address, isConnected]);

	const handleCloseTrading = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const provider = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!provider) {
				throw new Error("Failed to get wallet provider");
			}

			const signer = await provider.getSigner();
			const market = (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, signer);

			const tx = await market.closeTrading();
			await tx.wait();

			setStep("request");
		} catch (err: any) {
			setError(err.message || "Failed to close trading");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRequestResolve = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const provider = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!provider) {
				throw new Error("Failed to get wallet provider");
			}

			const signer = await provider.getSigner();
			const market = (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, signer);

			const tx = await market.requestResolve("0x");
			await tx.wait();

			setStep("fulfill");
		} catch (err: any) {
			setError(err.message || "Failed to request resolution");
		} finally {
			setIsLoading(false);
		}
	};

	const handleFulfillResult = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		if (!marketStatus || !marketStatus.isOracle) {
			setError("Only oracle admin can fulfill results");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const provider = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!provider) {
				throw new Error("Failed to get wallet provider");
			}

			const signer = await provider.getSigner();
			const network = await getCurrentNetwork() || "sepolia";
			const oracle = (await import("@/lib/contracts/contracts")).getVPOOracleContract(signer, network);

			// Encode outcome as uint8
			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [parseInt(outcome)]);
			const metadata = ethers.toUtf8Bytes(JSON.stringify({ timestamp: Date.now(), source: "admin" }));

			// fulfillResult signature: function fulfillResult(bytes32 marketId, bytes calldata resultData, bytes calldata metadata)
			const tx = await oracle["fulfillResult(bytes32,bytes,bytes)"](marketStatus.marketId, resultData, metadata);
			await tx.wait();

			setStep("settle");
		} catch (err: any) {
			setError(err.message || "Failed to fulfill result");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSettle = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const provider = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!provider) {
				throw new Error("Failed to get wallet provider");
			}

			const signer = await provider.getSigner();
			const market = (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, signer);

			const tx = await market.settleFromOracle();
			const receipt = await tx.wait();

			setTxHash(receipt.hash);
			setStep("success");
		} catch (err: any) {
			setError(err.message || "Failed to settle market");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button size="sm" variant="outline">
						Resolve Market
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Resolve Market</DialogTitle>
					<DialogDescription>
						Trigger oracle resolution for this market. This process requires multiple steps.
					</DialogDescription>
				</DialogHeader>

				{isChecking ? (
					<div className="py-8 text-center">
						<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
						<p className="text-sm text-muted-foreground">Checking market status...</p>
					</div>
				) : marketStatus ? (
					<div className="space-y-4">
						{step === "check" && marketStatus.status === 0 && (
							<>
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Market is still in trading phase. You need to close trading first.
									</AlertDescription>
								</Alert>
								<Button
									className="w-full"
									onClick={handleCloseTrading}
									disabled={isLoading || !isConnected}
								>
									{isLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Closing...
										</>
									) : !isConnected ? (
										"Connect Wallet"
									) : (
										"Close Trading"
									)}
								</Button>
							</>
						)}

						{step === "request" && (
							<>
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Step 1: Request resolution from oracle. This will trigger the Chainlink Functions request.
									</AlertDescription>
								</Alert>
								<Button
									className="w-full"
									onClick={handleRequestResolve}
									disabled={isLoading || !isConnected}
								>
									{isLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Requesting...
										</>
									) : !isConnected ? (
										"Connect Wallet"
									) : (
										"Request Resolution"
									)}
								</Button>
							</>
						)}

						{step === "fulfill" && (
							<>
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Step 2: Fulfill the result (Oracle Admin only). Set the market outcome.
									</AlertDescription>
								</Alert>
								{!marketStatus.isOracle && (
									<Alert variant="destructive">
										<AlertDescription>
											Warning: Only the oracle admin can fulfill results. Your address is not the oracle admin.
										</AlertDescription>
									</Alert>
								)}
								<div className="space-y-2">
									<Label>Outcome</Label>
									<div className="flex gap-2">
										<Button
											type="button"
											variant={outcome === "1" ? "default" : "outline"}
											className="flex-1"
											onClick={() => setOutcome("1")}
											disabled={isLoading}
										>
											Long (Yes) Wins
										</Button>
										<Button
											type="button"
											variant={outcome === "0" ? "default" : "outline"}
											className="flex-1"
											onClick={() => setOutcome("0")}
											disabled={isLoading}
										>
											Short (No) Wins
										</Button>
									</div>
								</div>
								<Button
									className="w-full"
									onClick={handleFulfillResult}
									disabled={isLoading || !isConnected || !marketStatus.isOracle}
								>
									{isLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Fulfilling...
										</>
									) : !isConnected ? (
										"Connect Wallet"
									) : (
										"Fulfill Result"
									)}
								</Button>
							</>
						)}

						{step === "settle" && (
							<>
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Step 3: Settle the market from oracle result. This will finalize the market.
									</AlertDescription>
								</Alert>
								<Button
									className="w-full"
									onClick={handleSettle}
									disabled={isLoading || !isConnected}
								>
									{isLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Settling...
										</>
									) : !isConnected ? (
										"Connect Wallet"
									) : (
										"Settle Market"
									)}
								</Button>
							</>
						)}

						{step === "success" && (
							<div className="text-center py-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
								<CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
								<p className="text-sm font-medium mb-2">Market Resolved Successfully!</p>
								{txHash && (
									<a
										href={`https://sepolia.etherscan.io/tx/${txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-xs text-blue-500 hover:underline"
									>
										View on Etherscan
									</a>
								)}
							</div>
						)}

						{error && (
							<div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
								{error}
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


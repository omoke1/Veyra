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
import { getERC20Contract, getProvider, getMarketContract, getVPOOracleContract, getVPOAdapterContract, CONTRACT_ADDRESSES } from "@/lib/contracts/contracts";
import { getCurrentNetwork } from "@/lib/contracts/config";
import { ethers } from "ethers";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseContractError } from "@/lib/utils";


interface ResolveMarketDialogProps {
	marketAddress: string;
	trigger?: React.ReactNode;
}

export function ResolveMarketDialog({ marketAddress, trigger }: ResolveMarketDialogProps): React.ReactElement {
	const { address, isConnected, connect } = useWallet();
	const [open, setOpen] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);
	const [marketStatus, setMarketStatus] = useState<{
		status: number;
		endTime: bigint;
		isOracle: boolean;
		marketId: string;
		isAVS: boolean;
	} | null>(null);
	const [step, setStep] = useState<"check" | "request" | "fulfill" | "settle" | "success">("check");
	const [outcome, setOutcome] = useState("1");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [txHash, setTxHash] = useState<string | null>(null);

	const addLog = (message: string) => {
		setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
	};

	useEffect(() => {
		if (!marketAddress || !open || !address || !isConnected) {
			setMarketStatus(null);
			setLogs([]);
			return;
		}

		const checkMarketStatus = async () => {
			setIsChecking(true);
			setError(null);
			setLogs([]);
			addLog("Initializing market check...");

			try {
				const network = await getCurrentNetwork() || "sepolia";
				addLog(`Network detected: ${network}`);
				
				const provider = getProvider(network);
				addLog("Provider initialized");

				addLog(`Fetching market contract at ${marketAddress.slice(0, 8)}...`);
				const market = getMarketContract(marketAddress, provider);

				addLog("Reading market state...");
				const [status, endTime, marketId] = await Promise.all([
					market.status(),
					market.endTime(),
					market.marketId(),
				]);
				addLog(`Market State: Status=${status}, EndTime=${endTime}`);

				// Check if current block time has passed endTime
				const block = await provider.getBlock("latest");
				const canClose = block && BigInt(block.timestamp) >= endTime;
				addLog(`Block Time: ${block?.timestamp}, Can Close: ${canClose}`);

				// Check if oracle is AVS Adapter
				const avsAddress = CONTRACT_ADDRESSES[network]?.VPOAdapter;
				const oracleAddress = await market.oracle();
				const isAVS = !!(oracleAddress && avsAddress && oracleAddress.toLowerCase() === avsAddress.toLowerCase());
				addLog(`Oracle Type: ${isAVS ? "Gemini AVS" : "Standard Oracle"}`);

				// Check if user is oracle admin
				const oracle = getVPOOracleContract(provider, network);
				const oracleAdmin = await oracle.admin();
				const isOracle = oracleAdmin.toLowerCase() === address.toLowerCase();
				addLog(`Is Oracle Admin: ${isOracle}`);

				setMarketStatus({
					status: Number(status),
					endTime,
					isOracle,
					marketId: marketId as string,
					isAVS,
				});

				if (Number(status) === 2) {
					addLog("Market is already resolved.");
					setError("Market is already resolved");
				} else if (Number(status) === 0 && canClose) {
					addLog("Market ready for resolution. Step 1: Close Trading.");
					setStep("check");
				} else if (Number(status) === 0) {
					const endDate = new Date(Number(endTime) * 1000).toLocaleString();
					addLog(`Market not ready. Ends at ${endDate}`);
					setError(`Market trading ends at ${endDate}`);
				} else if (Number(status) === 1) {
					if (isAVS) {
						// Check if already resolved by AVS
						const oracle = getVPOOracleContract(provider, network);
						const [resolved] = await oracle.getResult(marketId);
						if (resolved) {
							addLog("AVS has resolved the market. Step 3: Settle.");
							setStep("settle");
						} else {
							// Check if request has been sent to AVS
							const adapter = getVPOAdapterContract(provider, network);
							const requestId = await adapter.marketToRequestId(marketId);
							
							if (requestId && requestId !== ethers.ZeroHash) {
								addLog(`Request sent to AVS (ID: ${requestId.slice(0, 10)}...). Step 2: Waiting.`);
								setStep("fulfill"); // Show waiting UI
							} else {
								addLog("Market closed. Step 2: Request Resolution.");
								setStep("request"); // Show Request button
							}
						}
					} else {
						addLog("Market closed. Step 2: Request Resolution.");
						setStep("request");
					}
				}
			} catch (err: any) {
				console.error(err);
				addLog(`Error: ${err.message}`);
				setError(err.message || "Failed to check market status");
				setMarketStatus(null);
			} finally {
				setIsChecking(false);
			}
		};

		checkMarketStatus();

		// Polling for AVS resolution
		const interval = setInterval(async () => {
			if (step === "fulfill" && marketStatus?.isAVS && open) {
				try {
					const provider = getProvider(await getCurrentNetwork() || "sepolia");
					// Use the market's oracle address if it's an AVS market
					const oracleAddress = await (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, provider).oracle();
					const oracle = new ethers.Contract(oracleAddress, [
						"function getResult(bytes32) view returns (bool, uint256, bytes)"
					], provider);
					
					const [resolved] = await oracle.getResult(marketStatus.marketId);
					if (resolved) {
						addLog("AVS Resolution Complete! Moving to settlement.");
						setStep("settle");
					}
				} catch (e) {
					console.error("Polling error", e);
				}
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [marketAddress, open, address, isConnected, step, marketStatus?.isAVS]);

	const handleCloseTrading = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		setIsLoading(true);
		setError(null);
		addLog("Initiating Close Trading transaction...");

		try {
			const signer = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!signer) throw new Error("Failed to get wallet signer");
			const market = (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, signer);

			addLog("Sending closeTrading()...");
			const tx = await market.closeTrading();
			addLog(`Transaction sent: ${tx.hash}`);
			
			await tx.wait();
			addLog("Transaction confirmed!");

			setStep("request");
		} catch (err: any) {
			addLog(`Error: ${err.message}`);
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
		addLog("Initiating Resolution Request...");

		try {
			const signer = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!signer) throw new Error("Failed to get wallet signer");
			const market = (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, signer);

			addLog("Sending requestResolve()...");
			// Check if oracle is AVS Adapter (Gemini)
			const currentNetwork = await getCurrentNetwork();
			const avsAddress = currentNetwork ? CONTRACT_ADDRESSES[currentNetwork]?.VPOAdapter : undefined;
			const oracleAddress = await market.oracle();
			
			let extraData = "0x";
			if (oracleAddress && avsAddress && oracleAddress.toLowerCase() === avsAddress.toLowerCase()) {
				console.log("Resolving via Gemini AVS...");
				// Encode (source, question) for AVS
				// source = "gemini"
				// logic = market.question
				const question = await market.question();
				extraData = ethers.AbiCoder.defaultAbiCoder().encode(
					["string", "string"],
					["gemini", question]
				);
			}

			console.log("Requesting resolution with data:", extraData);
			const tx = await market.requestResolve(extraData);
			setTxHash(tx.hash);
			addLog(`Transaction sent: ${tx.hash}`);

			await tx.wait();
			addLog("Transaction confirmed!");

			setStep("fulfill");
		} catch (err: any) {
			addLog(`Error: ${err.message}`);
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
		addLog("Initiating Result Fulfillment...");

		try {
			const signer = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!signer) throw new Error("Failed to get wallet signer");
			const network = await getCurrentNetwork() || "sepolia";
			const oracle = (await import("@/lib/contracts/contracts")).getVPOOracleContract(signer, network);

			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [parseInt(outcome)]);
			const metadata = ethers.toUtf8Bytes(JSON.stringify({ timestamp: Date.now(), source: "admin" }));

			addLog(`Fulfilling result: ${outcome === "1" ? "YES" : "NO"}`);
			const tx = await oracle["fulfillResult(bytes32,bytes,bytes)"](marketStatus.marketId, resultData, metadata);
			addLog(`Transaction sent: ${tx.hash}`);

			await tx.wait();
			addLog("Transaction confirmed!");

			setStep("settle");
		} catch (err: any) {
			addLog(`Error: ${err.message}`);
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
		addLog("Initiating Market Settlement...");

		try {
			const signer = await (await import("@/lib/contracts/contracts")).getSigner();
			if (!signer) throw new Error("Failed to get wallet signer");
			const market = (await import("@/lib/contracts/contracts")).getMarketContract(marketAddress, signer);

			addLog("Sending settleFromOracle()...");
			const tx = await market.settleFromOracle();
			addLog(`Transaction sent: ${tx.hash}`);

			const receipt = await tx.wait();
			addLog("Transaction confirmed! Market settled.");

			setTxHash(receipt.hash);
			setStep("success");
		} catch (err: any) {
			addLog(`Error: ${err.message}`);
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
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Resolve Market</DialogTitle>
					<DialogDescription>
						Trigger oracle resolution for this market. This process requires multiple steps.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Process Logs */}
					<div className="bg-slate-950 rounded-md p-3 font-mono text-xs text-slate-300 h-32 overflow-y-auto border border-slate-800">
						{logs.length === 0 ? (
							<span className="text-slate-500">Waiting to start...</span>
						) : (
							logs.map((log, i) => (
								<div key={i} className="mb-1 last:mb-0">
									{log}
								</div>
							))
						)}
					</div>

					{isChecking ? (
						<div className="py-4 text-center">
							<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
							<p className="text-sm text-muted-foreground">Checking market status...</p>
						</div>
					) : marketStatus ? (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4 text-sm p-3 bg-muted/50 rounded-lg">
								<div>
									<span className="text-muted-foreground">Market ID:</span>
									<p className="font-mono text-xs mt-1 break-all" title={marketStatus.marketId}>
										{marketStatus.marketId.slice(0, 10)}...{marketStatus.marketId.slice(-8)}
									</p>
								</div>
								<div>
									<span className="text-muted-foreground">Status:</span>
									<p className="font-medium mt-1">
										{marketStatus.status === 0 ? "Trading" : marketStatus.status === 1 ? "Resolving" : "Resolved"}
									</p>
								</div>
							</div>

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
											Step 2: Waiting for AVS Resolution.
										</AlertDescription>
									</Alert>
									
									{marketStatus.isAVS ? (
										<div className="py-6 text-center space-y-4">
											<Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
											<div>
												<p className="font-medium">Waiting for AVS Operators...</p>
												<p className="text-xs text-muted-foreground mt-1">
													The decentralized network is verifying the outcome. This may take a few minutes.
												</p>
											</div>
											<div className="text-xs font-mono bg-slate-900 p-2 rounded">
												Status: Pending Quorum
											</div>
										</div>
									) : (
										<>
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
									{parseContractError(error)}
								</div>
							)}
						</div>
					) : (
						<div className="text-center py-4">
							{error ? (
								<p className="text-sm text-red-500">{error}</p>
							) : (
								<p className="text-sm text-muted-foreground">Waiting for status check...</p>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}


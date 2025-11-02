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
import { useCreateMarket } from "@/lib/contracts/hooks";
import { useWallet } from "@/lib/wallet/walletContext";
import { Loader2, Plus } from "lucide-react";

interface CreateMarketDialogProps {
	onSuccess?: (marketAddress: string) => void;
}

export function CreateMarketDialog({ onSuccess }: CreateMarketDialogProps): React.ReactElement {
	const { isConnected, connect } = useWallet();
	const { createMarket, isLoading, error } = useCreateMarket();
	
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [collateralAddress, setCollateralAddress] = useState("");
	const [endDate, setEndDate] = useState("");
	const [endTime, setEndTime] = useState("");
	const [feeBps, setFeeBps] = useState("0");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!isConnected) {
			await connect();
			return;
		}

		if (!question.trim() || !collateralAddress.trim() || !endDate || !endTime) {
			return;
		}

		// Combine date and time into Unix timestamp
		const dateTimeString = `${endDate}T${endTime}:00`;
		const endTimestamp = Math.floor(new Date(dateTimeString).getTime() / 1000);

		if (endTimestamp <= Math.floor(Date.now() / 1000)) {
			alert("End time must be in the future");
			return;
		}

		const result = await createMarket({
			collateral: collateralAddress,
			question: question.trim(),
			endTime: endTimestamp,
			feeBps: parseInt(feeBps) || 0,
		});

		if (result) {
			setOpen(false);
			setQuestion("");
			setCollateralAddress("");
			setEndDate("");
			setEndTime("");
			setFeeBps("0");
			if (onSuccess) {
				onSuccess(result.market);
			}
		}
	};

	// Set default end date to tomorrow
	useEffect(() => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];
		setEndDate(dateStr);
		
		// Default time to 23:59
		setEndTime("23:59");
	}, []);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2">
					<Plus className="h-4 w-4" />
					Create Market
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create New Prediction Market</DialogTitle>
					<DialogDescription>
						Create a new binary prediction market. Participants can trade long or short positions.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="question">Market Question</Label>
						<Input
							id="question"
							placeholder="e.g., Will BTC reach $100k by Dec 31, 2024?"
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							required
							disabled={isLoading}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="collateral">Collateral Token Address</Label>
						<Input
							id="collateral"
							placeholder="0x..."
							value={collateralAddress}
							onChange={(e) => setCollateralAddress(e.target.value)}
							required
							disabled={isLoading}
							pattern="^0x[a-fA-F0-9]{40}$"
							title="Valid Ethereum address (0x followed by 40 hex characters)"
						/>
						<p className="text-xs text-muted-foreground">
							ERC20 token address to use as collateral (e.g., USDC on Sepolia)
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="endDate">End Date</Label>
							<Input
								id="endDate"
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								required
								disabled={isLoading}
								min={new Date().toISOString().split("T")[0]}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="endTime">End Time</Label>
							<Input
								id="endTime"
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="feeBps">Fee (basis points, optional)</Label>
						<Input
							id="feeBps"
							type="number"
							placeholder="0"
							value={feeBps}
							onChange={(e) => setFeeBps(e.target.value)}
							min="0"
							max="10000"
							disabled={isLoading}
						/>
						<p className="text-xs text-muted-foreground">
							1 basis point = 0.01% (e.g., 100 = 1%)
						</p>
					</div>

					{error && (
						<div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
							{error}
						</div>
					)}

					<div className="flex justify-end gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading || !isConnected}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : !isConnected ? (
								"Connect Wallet"
							) : (
								"Create Market"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}


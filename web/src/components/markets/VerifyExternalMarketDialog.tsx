import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/lib/wallet/walletContext";
import { ethers } from "ethers";
import { getCurrentNetwork } from "@/lib/contracts/config";
import { getVPOAdapterContract, getSigner } from "@/lib/contracts/contracts";

interface VerifyExternalMarketDialogProps {
	marketId: string;
	source: string;
	question: string;
	trigger?: React.ReactNode;
}

export function VerifyExternalMarketDialog({
	marketId,
	source,
	question,
	trigger,
}: VerifyExternalMarketDialogProps): React.ReactElement {
	const { address, isConnected, connect } = useWallet();
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleVerify = async () => {
		if (!isConnected || !address) {
			await connect();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const signer = await getSigner();
			if (!signer) throw new Error("Failed to get wallet signer");
			const network = await getCurrentNetwork() || "sepolia";
			
			// Get the AVS contract (VeyraOracleAVS)
			// Note: getVPOAdapterContract returns the VeyraOracleAVS contract instance
			const avs = getVPOAdapterContract(signer, network);

			// Prepare parameters
			// marketRef: keccak256 of the market ID string
			const marketRef = ethers.keccak256(ethers.toUtf8Bytes(marketId));
			
			// data: abi.encode(string source, string logic)
			// For now we use simple defaults based on the source
			const logic = "default_resolution_logic";
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string"],
				[source, logic]
			);

			console.log("Requesting resolution:", { marketRef, data });

			const tx = await avs.requestResolution(marketRef, data);
			console.log("Transaction sent:", tx.hash);

			const receipt = await tx.wait();
			console.log("Transaction confirmed:", receipt.hash);

			setTxHash(receipt.hash);
			setSuccess(true);
		} catch (err: any) {
			console.error("Verification failed:", err);
			setError(err.message || "Failed to request verification");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button size="sm" variant="outline">
						Verify Market
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Verify External Market</DialogTitle>
					<DialogDescription>
						Request verification for this {source} market on the Veyra AVS.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="p-3 bg-muted rounded-md text-sm">
						<p className="font-medium mb-1">Market Question:</p>
						<p className="text-muted-foreground">{question}</p>
						<p className="font-medium mt-2 mb-1">Source ID:</p>
						<p className="font-mono text-xs text-muted-foreground">{marketId}</p>
					</div>

					{success ? (
						<div className="text-center py-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
							<CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
							<p className="text-sm font-medium mb-2">Verification Requested!</p>
							<p className="text-xs text-muted-foreground mb-2">
								The AVS operators will now verify this market.
							</p>
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
							<Button
								className="w-full mt-4"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								Close
							</Button>
						</div>
					) : (
						<>
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									This will create an on-chain task for Veyra operators to verify the outcome of this market.
								</AlertDescription>
							</Alert>

							{error && (
								<div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
									{error}
								</div>
							)}

							<Button
								className="w-full"
								onClick={handleVerify}
								disabled={isLoading || !isConnected}
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Requesting Verification...
									</>
								) : !isConnected ? (
									"Connect Wallet"
								) : (
									"Request Verification"
								)}
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

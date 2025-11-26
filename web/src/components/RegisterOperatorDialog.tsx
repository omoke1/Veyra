import React, { useState } from "react";
import { ethers } from "ethers";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/lib/wallet/walletContext";
import { getSigner } from "@/lib/contracts/contracts";
import { CONTRACT_ADDRESSES, getCurrentNetwork, switchToSepolia, NETWORKS, type NetworkName } from "@/lib/contracts/config";

const VEYRA_ORACLE_AVS_ABI = [
	"function setAVSNode(address node, bool enabled) external",
	"function setOperatorWeight(address operator, uint256 weight) external",
	"function avsNodes(address) external view returns (bool)",
	"function operatorWeights(address) external view returns (uint256)",
];

interface RegisterOperatorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function RegisterOperatorDialog({
	open,
	onOpenChange,
	onSuccess,
}: RegisterOperatorDialogProps) {
	const { address, isConnected } = useWallet();
	const [operatorAddress, setOperatorAddress] = useState("");
	const [weight, setWeight] = useState("100");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleRegister = async () => {
		if (!isConnected || !address) {
			setError("Please connect your wallet");
			return;
		}

		if (!ethers.isAddress(operatorAddress)) {
			setError("Invalid operator address");
			return;
		}

		setIsLoading(true);
		setError(null);
		setSuccess(false);

		try {
			// Check current network
			const currentNetwork: NetworkName | null = await getCurrentNetwork();
			
			// If not on Sepolia, switch to it
			if (currentNetwork !== "sepolia") {
				const switched = await switchToSepolia();
				if (!switched) {
					throw new Error("Please switch to Sepolia network in your wallet");
				}
			}
			
			const provider = await getSigner();
			if (!provider) {
				throw new Error("Failed to get wallet provider");
			}

			const signer = await provider.getSigner();
			const adapterAddress = CONTRACT_ADDRESSES.sepolia.VPOAdapter;

			if (!adapterAddress) {
				throw new Error(`VeyraOracleAVS not deployed on sepolia`);
			}

			const adapter = new ethers.Contract(
				adapterAddress,
				VEYRA_ORACLE_AVS_ABI,
				signer
			);

			// Register as AVS node
			const tx1 = await adapter.setAVSNode(operatorAddress, true);
			await tx1.wait();

			// Set operator weight
			const weightBigInt = ethers.parseEther(weight);
			const tx2 = await adapter.setOperatorWeight(operatorAddress, weightBigInt);
			await tx2.wait();

			setSuccess(true);
			setIsLoading(false);

			// Close dialog after 2 seconds
			setTimeout(() => {
				onOpenChange(false);
				setSuccess(false);
				setOperatorAddress("");
				setWeight("100");
				onSuccess?.();
			}, 2000);
		} catch (err: any) {
			console.error("Registration error:", err);
			setError(err.message || "Failed to register operator");
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Register Operator</DialogTitle>
					<DialogDescription>
						Register a new AVS operator node. You must be the admin to perform this action.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="operator-address">Operator Address</Label>
						<Input
							id="operator-address"
							placeholder="0x..."
							value={operatorAddress}
							onChange={(e) => setOperatorAddress(e.target.value)}
							disabled={isLoading || success}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="weight">Operator Weight (ETH)</Label>
						<Input
							id="weight"
							type="number"
							placeholder="100"
							value={weight}
							onChange={(e) => setWeight(e.target.value)}
							disabled={isLoading || success}
						/>
						<p className="text-xs text-muted-foreground">
							Stake weight for quorum calculation
						</p>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{success && (
						<Alert className="border-green-500 bg-green-500/10">
							<CheckCircle2 className="h-4 w-4 text-green-500" />
							<AlertDescription className="text-green-500">
								Operator registered successfully!
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button onClick={handleRegister} disabled={isLoading || success}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Register
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

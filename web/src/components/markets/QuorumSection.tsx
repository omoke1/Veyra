"use client";

import React, { useEffect, useState } from "react";
import { QuorumStatus } from "./QuorumStatus";
import { OperatorAttestations } from "./OperatorAttestations";
import { QuorumManager, type Operator } from "@/lib/dashboard/managers/QuorumManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useWallet } from "@/lib/wallet/walletContext";

interface QuorumSectionProps {
	requestId: string;
	adapterAddress?: string;
}

export function QuorumSection({ requestId, adapterAddress }: QuorumSectionProps): React.ReactElement {
	const [quorumStatus, setQuorumStatus] = useState<{
		isQuorumReached: boolean;
		yesWeight: bigint;
		noWeight: bigint;
		requiredWeight: bigint;
		totalWeight: bigint;
		quorumThreshold: number;
	} | null>(null);
	const [operators, setOperators] = useState<Operator[]>([]);
	const [loading, setLoading] = useState(true);
	const [finalizing, setFinalizing] = useState(false);
	const manager = new QuorumManager();
	const { isConnected, address } = useWallet();

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			const [status, ops] = await Promise.all([
				manager.getQuorumStatus(requestId),
				manager.getOperatorsForRequest(requestId),
			]);
			if (status) setQuorumStatus(status);
			setOperators(ops);
			setLoading(false);
		};

		loadData();

		// Poll every 5 seconds for updates
		const interval = setInterval(loadData, 5000);
		return () => clearInterval(interval);
	}, [requestId]);

	const handleFinalize = async () => {
		if (!quorumStatus || !adapterAddress || !isConnected) return;

		setFinalizing(true);
		try {
			// Determine which outcome reached quorum
			const outcome = quorumStatus.yesWeight >= quorumStatus.requiredWeight;

			// Call finalizeResolution on the adapter contract
			// This would require the adapter ABI and contract instance
			// For now, we'll show a placeholder
			console.log("Finalizing resolution:", { requestId, outcome, adapterAddress });
			alert("Finalization will be implemented with wallet integration");
		} catch (error) {
			console.error("Error finalizing:", error);
		} finally {
			setFinalizing(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="py-8">
					<p className="text-center text-muted-foreground">Loading quorum status...</p>
				</CardContent>
			</Card>
		);
	}

	if (!quorumStatus) {
		return (
			<Card>
				<CardContent className="py-8">
					<p className="text-center text-muted-foreground">No quorum data available</p>
				</CardContent>
			</Card>
		);
	}

	const currentWeight = quorumStatus.yesWeight >= quorumStatus.requiredWeight
		? quorumStatus.yesWeight
		: quorumStatus.noWeight >= quorumStatus.requiredWeight
		? quorumStatus.noWeight
		: quorumStatus.yesWeight + quorumStatus.noWeight;

	return (
		<div className="space-y-4">
			<QuorumStatus
				requestId={requestId}
				currentWeight={currentWeight}
				totalWeight={quorumStatus.totalWeight}
				quorumThreshold={quorumStatus.quorumThreshold}
				isQuorumReached={quorumStatus.isQuorumReached}
				yesWeight={quorumStatus.yesWeight}
				noWeight={quorumStatus.noWeight}
			/>

			<OperatorAttestations requestId={requestId} operators={operators} />

			{quorumStatus.isQuorumReached && (
				<Card className="border-green-500 bg-green-50 dark:bg-green-950">
					<CardContent className="py-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-5 w-5 text-green-500" />
								<span className="font-medium">Quorum reached! Ready to finalize.</span>
							</div>
							<Button
								onClick={handleFinalize}
								disabled={finalizing || !isConnected}
								className="bg-green-500 hover:bg-green-600"
							>
								{finalizing ? "Finalizing..." : "Finalize Resolution"}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}


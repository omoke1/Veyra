"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface QuorumStatusProps {
	requestId: string;
	currentWeight: bigint | number;
	totalWeight: bigint | number;
	quorumThreshold: number; // percentage, e.g., 66
	isQuorumReached: boolean;
	yesWeight?: bigint | number;
	noWeight?: bigint | number;
}

export function QuorumStatus({
	requestId,
	currentWeight,
	totalWeight,
	quorumThreshold,
	isQuorumReached,
	yesWeight = BigInt(0),
	noWeight = BigInt(0),
}: QuorumStatusProps): React.ReactElement {
	const currentWeightNum = typeof currentWeight === "bigint" ? Number(currentWeight) : currentWeight;
	const totalWeightNum = typeof totalWeight === "bigint" ? Number(totalWeight) : totalWeight;
	const yesWeightNum = typeof yesWeight === "bigint" ? Number(yesWeight) : yesWeight;
	const noWeightNum = typeof noWeight === "bigint" ? Number(noWeight) : noWeight;

	const percentage = totalWeightNum > 0 ? (currentWeightNum / totalWeightNum) * 100 : 0;
	const requiredPercentage = quorumThreshold;
	const requiredWeight = (totalWeightNum * quorumThreshold) / 100;

	// Determine color based on progress
	let progressColor = "bg-red-500";
	let statusIcon = <Clock className="h-4 w-4" />;
	let statusText = "Waiting for quorum";

	if (percentage >= requiredPercentage) {
		progressColor = "bg-green-500";
		statusIcon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
		statusText = "Quorum reached!";
	} else if (percentage >= requiredPercentage * 0.5) {
		progressColor = "bg-yellow-500";
		statusIcon = <AlertCircle className="h-4 w-4 text-yellow-500" />;
		statusText = "Approaching quorum";
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{statusIcon}
					Quorum Status
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Progress Bar */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Progress</span>
						<span className="font-medium">
							{percentage.toFixed(1)}% ({currentWeightNum.toLocaleString()} / {totalWeightNum.toLocaleString()})
						</span>
					</div>
					<div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
						<div
							className={`h-full ${progressColor} transition-all duration-500`}
							style={{ width: `${Math.min(percentage, 100)}%` }}
						/>
					</div>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Need {requiredPercentage}% ({requiredWeight.toLocaleString()})</span>
						{isQuorumReached && <Badge variant="default" className="bg-green-500">Quorum Met</Badge>}
					</div>
				</div>

				{/* Outcome Breakdown */}
				{(yesWeightNum > 0 || noWeightNum > 0) && (
					<div className="space-y-2 pt-2 border-t">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Yes (YES)</span>
							<span className="font-medium text-green-600">
								{yesWeightNum.toLocaleString()} ({(totalWeightNum > 0 ? (yesWeightNum / totalWeightNum) * 100 : 0).toFixed(1)}%)
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">No (NO)</span>
							<span className="font-medium text-red-600">
								{noWeightNum.toLocaleString()} ({(totalWeightNum > 0 ? (noWeightNum / totalWeightNum) * 100 : 0).toFixed(1)}%)
							</span>
						</div>
					</div>
				)}

				{/* Status Badge */}
				<div className="flex items-center justify-center pt-2">
					<Badge
						variant={isQuorumReached ? "default" : "secondary"}
						className={isQuorumReached ? "bg-green-500" : ""}
					>
						{statusText}
					</Badge>
				</div>
			</CardContent>
		</Card>
	);
}


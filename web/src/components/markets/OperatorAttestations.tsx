"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
// Simple date formatting without external dependency

interface Operator {
	address: string;
	weight: bigint | number;
	hasAttested: boolean;
	outcome?: boolean;
	timestamp?: number;
	signature?: string;
}

interface OperatorAttestationsProps {
	requestId: string;
	operators: Operator[];
}

export function OperatorAttestations({
	requestId,
	operators,
}: OperatorAttestationsProps): React.ReactElement {
	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const formatWeight = (weight: bigint | number) => {
		const weightNum = typeof weight === "bigint" ? Number(weight) : weight;
		// Assuming weight is in wei, convert to ETH for display
		return (weightNum / 1e18).toFixed(2);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Operator Attestations</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{operators.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							No operators registered
						</p>
					) : (
						operators.map((operator, index) => (
							<div
								key={operator.address}
								className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
							>
								<div className="flex items-center gap-3 flex-1">
									{/* Status Icon */}
									{operator.hasAttested ? (
										<CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
									) : (
										<Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
									)}

									{/* Operator Info */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-mono text-sm font-medium">
												{formatAddress(operator.address)}
											</span>
											{operator.hasAttested && operator.outcome !== undefined && (
												<Badge
													variant={operator.outcome ? "default" : "destructive"}
													className={
														operator.outcome
															? "bg-green-500 text-white"
															: "bg-red-500 text-white"
													}
												>
													{operator.outcome ? "YES" : "NO"}
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
											<span>Weight: {formatWeight(operator.weight)} ETH</span>
											{operator.timestamp && (
												<span>
													{new Date(operator.timestamp * 1000).toLocaleString()}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Status Badge */}
								<Badge variant={operator.hasAttested ? "default" : "secondary"}>
									{operator.hasAttested ? "Attested" : "Pending"}
								</Badge>
							</div>
						))
					)}
				</div>

				{/* Summary */}
				{operators.length > 0 && (
					<div className="mt-4 pt-4 border-t flex justify-between text-sm">
						<span className="text-muted-foreground">
							{operators.filter((op) => op.hasAttested).length} of {operators.length} operators
						</span>
						<span className="font-medium">
							{(
								(operators.filter((op) => op.hasAttested).length / operators.length) *
								100
							).toFixed(0)}
							% participation
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}


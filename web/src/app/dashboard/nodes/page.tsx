"use client";

import React, { useEffect, useState } from "react";
import { OperatorsManager } from "@/lib/dashboard/managers/OperatorsManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import type { Operator } from "@/lib/dashboard/types";
import { RegisterOperatorDialog } from "@/components/RegisterOperatorDialog";

export default function NodesPage(): React.ReactElement {
	const [operators, setOperators] = useState<Operator[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const operatorsManager = new OperatorsManager();

	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			try {
				const ops = await operatorsManager.listOperators();
				setOperators(ops);
			} catch (error) {
				console.error("Error loading operators:", error);
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	const averageCompletionRate = operators.length > 0
		? (operators.reduce((sum, op) => sum + op.completionRate, 0) / operators.length).toFixed(1)
		: "0.0";

	const onlineOperators = operators.filter(op => op.latency !== "N/A");
	const averageLatency = onlineOperators.length > 0
		? onlineOperators.reduce((sum, op) => {
			const lat = parseFloat(op.latency.replace("ms", ""));
			return sum + lat;
		}, 0) / onlineOperators.length
		: 0;

	const totalRewards = operators.reduce((sum, op) => {
		const rewardNum = parseFloat(op.rewards.replace(/[^0-9.]/g, ""));
		return sum + rewardNum;
	}, 0);

	return (
		<div className="space-y-4 sm:space-y-6">
			<Card>
				<CardHeader>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div>
							<CardTitle className="text-base sm:text-lg">Operator Registry</CardTitle>
							<CardDescription className="text-xs sm:text-sm">Network node operators</CardDescription>
						</div>
						<Button className="gap-2 text-xs sm:text-sm" size="sm" onClick={() => setIsDialogOpen(true)}>
							<Plus className="w-4 h-4" />
							<span className="hidden sm:inline">Register Operator</span>
							<span className="sm:hidden">Register</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-0 sm:p-6">
					{isLoading ? (
						<div className="py-8 text-center">
							<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
							<p className="text-muted-foreground text-sm">Loading operators...</p>
						</div>
					) : operators.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							<p className="text-sm">No operators found</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Node ID</TableHead>
										<TableHead>Staked</TableHead>
										<TableHead>Jobs Completed</TableHead>
										<TableHead>Completion Rate</TableHead>
										<TableHead>Latency</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{operators.map((operator) => (
									<TableRow key={operator.id}>
										<TableCell className="font-medium">{operator.nodeId}</TableCell>
										<TableCell>{operator.staked}</TableCell>
										<TableCell>{operator.jobsCompleted.toLocaleString()}</TableCell>
										<TableCell>{operator.completionRate}%</TableCell>
										<TableCell>{operator.latency}</TableCell>
										<TableCell>
											<Badge
												className={
													operator.status === "Online"
														? "bg-green-500/10 text-green-500"
														: "bg-gray-500/10 text-gray-500"
												}
											>
												{operator.status}
											</Badge>
										</TableCell>
										<TableCell>
											<Button size="sm" variant="ghost">
												Details
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Performance Metrics */}
			<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Average Completion Rate</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{averageCompletionRate}%</div>
						<p className="text-xs text-muted-foreground mt-1">Across all operators</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Average Latency</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{averageLatency > 0 ? `${Math.round(averageLatency)}ms` : "N/A"}</div>
						<p className="text-xs text-muted-foreground mt-1">Network average</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Total Rewards</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{totalRewards.toLocaleString()} VPO</div>
						<p className="text-xs text-muted-foreground mt-1">Distributed this month</p>
					</CardContent>
				</Card>
			</div>

			<RegisterOperatorDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				onSuccess={() => {
					// Reload operators after successful registration
					void (async () => {
						const ops = await operatorsManager.listOperators();
						setOperators(ops);
					})();
				}}
			/>
		</div>
	);
}



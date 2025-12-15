"use client";

import React, { useEffect, useState } from "react";
import { TelemetryManager } from "@/lib/dashboard/managers/TelemetryManager";
import { MarketsManager } from "@/lib/dashboard/managers/MarketsManager";
import { AttestationManager } from "@/lib/dashboard/managers/AttestationManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, TrendingUp, Globe, Clock, Shield, Zap, Plus, FileText, LineChart, PieChart } from "lucide-react";

export default function VeyraDashboardPage(): React.ReactElement {
	const [kpis, setKpis] = useState<any | null>(null);
	const [markets, setMarkets] = useState<any[]>([]);
	const [attestations, setAttestations] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				const telemetryManager = new TelemetryManager();
				const marketsManager = new MarketsManager();
				const attestationManager = new AttestationManager();

				const [kpisData, marketsData, attestationsData] = await Promise.all([
					telemetryManager.getKpis(),
					marketsManager.listRecent(),
					attestationManager.listRecent()
				]);

				setKpis(kpisData);
				setMarkets(marketsData);
				setAttestations(attestationsData);
			} catch (error) {
				console.error("Failed to load dashboard data", error);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Stats Cards */}
			<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
						<Activity className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{kpis ? (kpis.activeMarkets * 1000 + 2847).toLocaleString() : "—"}</div>
						<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
							<TrendingUp className="w-3 h-3 text-green-500" />
							<span className="text-green-500">+12.5%</span>
							<span>from last month</span>
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Integrated Markets</CardTitle>
						<Globe className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{markets.length > 0 ? markets.length : "—"}</div>
						<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
							<TrendingUp className="w-3 h-3 text-green-500" />
							<span className="text-green-500">+8.2%</span>
							<span>from last month</span>
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
						<Clock className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{kpis ? kpis.pendingJobs : "—"}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Proofs Verified</CardTitle>
						<Shield className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{kpis ? `${(99.8).toFixed(1)}%` : "—"}</div>
						<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
							<TrendingUp className="w-3 h-3 text-green-500" />
							<span className="text-green-500">+0.3%</span>
							<span>from last month</span>
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">$VPO Staked</CardTitle>
						<Zap className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">2.4M</div>
						<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
							<TrendingUp className="w-3 h-3 text-green-500" />
							<span className="text-green-500">+15.7%</span>
							<span>from last month</span>
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Recent Resolutions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base sm:text-lg">Recent Resolutions</CardTitle>
					<CardDescription className="text-xs sm:text-sm">Latest verified prediction outcomes</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6">
					<div className="overflow-x-auto">
						<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Market</TableHead>
								<TableHead>Question</TableHead>
								<TableHead className="text-center">Result</TableHead>
								<TableHead>Proof CID</TableHead>
								<TableHead>Timestamp</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{attestations.filter(a => a.outcome !== null).map(a => {
								const market = markets.find(m => m.id === a.marketId);
								return (
									<TableRow key={a.cid} className="cursor-pointer hover:bg-muted/50">
										<TableCell>
											<Badge variant="outline" className="inline-flex">{market?.platform ?? "Unknown"}</Badge>
										</TableCell>
										<TableCell className="max-w-xs truncate">
											{market?.question ?? a.marketId}
										</TableCell>
										<TableCell className="text-center">
											<div className="flex justify-center">
												<Badge
													className={
														a.outcome
															? "bg-green-500/10 text-green-500"
															: "bg-red-500/10 text-red-500"
													}
												>
													{a.outcome ? "Yes" : "No"}
												</Badge>
											</div>
										</TableCell>
										<TableCell className="font-mono text-xs">
											{a.cid}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{new Date(a.timestamp * 1000).toLocaleString()}
										</TableCell>
									</TableRow>
								);
							})}
							{attestations.length === 0 && !loading && (
								<TableRow>
									<TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
										No resolutions found
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					</div>
				</CardContent>
			</Card>

			{/* Charts and Activity */}
			<div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Resolutions Over Time</CardTitle>
						<CardDescription>Last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
							<div className="text-center text-muted-foreground">
								<LineChart className="w-12 h-12 mx-auto mb-2" />
								<p className="text-sm">Line chart visualization</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Market Share</CardTitle>
						<CardDescription>By platform</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
							<div className="text-center text-muted-foreground">
								<PieChart className="w-12 h-12 mx-auto mb-2" />
								<p className="text-sm">Pie chart visualization</p>
								<div className="mt-4 space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span>Polymarket</span>
										<span className="font-semibold">65%</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span>Gnosis</span>
										<span className="font-semibold">35%</span>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* CTA Buttons */}
			<div className="flex flex-wrap gap-2 sm:gap-4">
				<Button className="gap-2 text-xs sm:text-sm" size="sm">
					<Plus className="w-4 h-4" />
					<span className="hidden sm:inline">Create New Adapter</span>
					<span className="sm:hidden">New Adapter</span>
				</Button>
				<Button variant="outline" className="gap-2 text-xs sm:text-sm" size="sm" asChild>
					<a href="/dashboard/attestations">
						<FileText className="w-4 h-4" />
						<span className="hidden sm:inline">View Proof Explorer</span>
						<span className="sm:hidden">Proofs</span>
					</a>
				</Button>
				<Button variant="outline" className="gap-2 text-xs sm:text-sm" size="sm">
					<Zap className="w-4 h-4" />
					<span className="hidden sm:inline">Run Test Job</span>
					<span className="sm:hidden">Test Job</span>
				</Button>
			</div>
		</div>
	);
}



"use client";

import React, { useEffect, useState } from "react";
import { DashboardKpiViewModel } from "@/lib/dashboard/viewmodels/DashboardKpiViewModel";
import { TelemetryManager } from "@/lib/dashboard/managers/TelemetryManager";
import { MarketsListViewModel } from "@/lib/dashboard/viewmodels/MarketsListViewModel";
import { MarketsManager } from "@/lib/dashboard/managers/MarketsManager";
import { JobsListViewModel } from "@/lib/dashboard/viewmodels/JobsListViewModel";
import { VerificationManager } from "@/lib/dashboard/managers/VerificationManager";
import { AttestationsFeedViewModel } from "@/lib/dashboard/viewmodels/AttestationsFeedViewModel";
import { AttestationManager } from "@/lib/dashboard/managers/AttestationManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage(): React.ReactElement {
	const [kpiVm] = useState(() => new DashboardKpiViewModel(new TelemetryManager()));
	const [marketsVm] = useState(() => new MarketsListViewModel(new MarketsManager()));
	const [jobsVm] = useState(() => new JobsListViewModel(new VerificationManager()));
	const [attVm] = useState(() => new AttestationsFeedViewModel(new AttestationManager()));

	useEffect(() => {
		void (async () => {
			await Promise.all([kpiVm.refresh(), marketsVm.load(), jobsVm.load(), attVm.load()]);
		})();
	}, [kpiVm, marketsVm, jobsVm, attVm]);

	// Build a quick index from marketId to title for the recent resolutions table
	const marketTitleById = new Map(marketsVm.items.map(m => [m.id, m.title] as const));

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">Total Predictions</CardTitle></CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold">{kpiVm.kpis ? kpiVm.kpis.activeMarkets * 1000 + 2847 : "—"}</div>
						<div className="text-xs text-muted-foreground">+12.5% from last month</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">Integrated Markets</CardTitle></CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold">{kpiVm.kpis ? marketsVm.items.length : "—"}</div>
						<div className="text-xs text-muted-foreground">+8.2% from last month</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">Active Jobs</CardTitle></CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold">{kpiVm.kpis ? kpiVm.kpis.pendingJobs : "—"}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">Proofs Verified</CardTitle></CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold">{kpiVm.kpis ? `${(99.8).toFixed(1)}%` : "—"}</div>
						<div className="text-xs text-muted-foreground">+0.3% from last month</div>
					</CardContent>
				</Card>
			</div>

			{/* Recent Resolutions */}
			<Card>
				<CardHeader><CardTitle className="text-sm sm:text-base">Recent Resolutions</CardTitle></CardHeader>
				<CardContent className="p-0 sm:p-6">
					<div className="overflow-x-auto">
						<div className="min-w-[600px]">
							<div className="grid grid-cols-5 text-xs font-medium text-muted-foreground border-b py-2 px-2 sm:px-0">
								<div>Market</div>
								<div>Question</div>
								<div>Result</div>
								<div>Proof CID</div>
								<div className="hidden sm:block">Timestamp</div>
								<div className="sm:hidden">Time</div>
							</div>
							{attVm.items.filter(a => a.outcome !== null).map(a => (
								<div key={a.cid} className="grid grid-cols-5 text-xs sm:text-sm py-2 border-b last:border-b-0 px-2 sm:px-0">
									<div><Badge variant="outline" className="text-[10px] sm:text-xs">{a.marketId.startsWith("m-") ? "Internal" : "Market"}</Badge></div>
									<div className="truncate">{marketTitleById.get(a.marketId) ?? a.marketId}</div>
									<div>
										<Badge variant={a.outcome ? "default" : "secondary"} className="text-[10px] sm:text-xs">{a.outcome ? "Yes" : "No"}</Badge>
									</div>
									<div className="truncate font-mono text-[10px] sm:text-xs">{a.cid}</div>
									<div className="text-[10px] sm:text-xs">{new Date(a.timestamp * 1000).toLocaleString()}</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Charts row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
				<Card>
					<CardHeader><CardTitle className="text-base">Resolutions Over Time</CardTitle></CardHeader>
					<CardContent>
						<div className="h-56 grid place-items-center text-sm text-muted-foreground">Line chart visualization</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader><CardTitle className="text-base">Market Share</CardTitle></CardHeader>
					<CardContent>
						<div className="h-56 grid place-items-center text-sm text-muted-foreground">Pie chart visualization</div>
					</CardContent>
				</Card>
			</div>

			{/* Actions */}
			<div className="flex flex-wrap gap-2">
				<Button variant="default" size="sm" className="text-xs sm:text-sm">Create New Adapter</Button>
				<Button variant="secondary" size="sm" asChild className="text-xs sm:text-sm">
					<a href="/dashboard/attestations">View Proof Explorer</a>
				</Button>
				<Button variant="outline" size="sm" className="text-xs sm:text-sm">Run Test Job</Button>
			</div>
		</div>
	);
}



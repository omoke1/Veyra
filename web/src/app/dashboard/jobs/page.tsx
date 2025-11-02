"use client";

import React, { useEffect, useState } from "react";
import { JobsListViewModel } from "@/lib/dashboard/viewmodels/JobsListViewModel";
import { VerificationManager } from "@/lib/dashboard/managers/VerificationManager";
import { Loader2 } from "lucide-react";

export default function JobsPage(): React.ReactElement {
	const [vm] = useState(() => new JobsListViewModel(new VerificationManager()));
	const [isLoading, setIsLoading] = useState(true);
	
	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			try {
				await vm.load();
			} catch (error) {
				console.error("Error loading jobs:", error);
			} finally {
				setIsLoading(false);
			}
		})();
	}, [vm]);

	return (
		<div className="space-y-3 sm:space-y-4">
			<h1 className="text-lg sm:text-xl font-semibold">Verification Jobs</h1>
			{isLoading ? (
				<div className="border rounded p-8 text-center">
					<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
					<p className="text-muted-foreground text-sm">Loading jobs...</p>
				</div>
			) : vm.items.length === 0 ? (
				<div className="border rounded p-8 text-center text-muted-foreground">
					<p className="text-sm">No jobs found</p>
				</div>
			) : (
				<div className="border rounded overflow-hidden">
					<div className="overflow-x-auto">
						<div className="min-w-[600px]">
							<div className="grid grid-cols-5 text-xs sm:text-sm font-medium border-b p-2">
								<div>Job ID</div>
								<div>Market</div>
								<div>Stage</div>
								<div className="hidden sm:block">Updated</div>
								<div className="sm:hidden">Time</div>
								<div>Status</div>
							</div>
							{vm.items.map(j => (
							<div key={j.id} className="grid grid-cols-5 text-xs sm:text-sm p-2 border-b last:border-b-0">
								<div className="truncate font-mono text-[10px] sm:text-xs">{j.id}</div>
								<div className="truncate">{j.marketId}</div>
								<div>{j.stage}</div>
								<div className="text-[10px] sm:text-sm">{new Date(j.updatedAt).toLocaleString()}</div>
								<div>{j.status}</div>
							</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}



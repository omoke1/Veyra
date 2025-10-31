"use client";

import React, { useEffect, useState } from "react";
import { JobsListViewModel } from "@/lib/dashboard/viewmodels/JobsListViewModel";
import { VerificationManager } from "@/lib/dashboard/managers/VerificationManager";

export default function JobsPage(): React.ReactElement {
	const [vm] = useState(() => new JobsListViewModel(new VerificationManager()));
	useEffect(() => { void vm.load(); }, [vm]);

	return (
		<div className="space-y-3 sm:space-y-4">
			<h1 className="text-lg sm:text-xl font-semibold">Verification Jobs</h1>
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
		</div>
	);
}



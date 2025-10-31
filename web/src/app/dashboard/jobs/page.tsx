"use client";

import React, { useEffect, useState } from "react";
import { JobsListViewModel } from "@/lib/dashboard/viewmodels/JobsListViewModel";
import { VerificationManager } from "@/lib/dashboard/managers/VerificationManager";

export default function JobsPage(): React.ReactElement {
	const [vm] = useState(() => new JobsListViewModel(new VerificationManager()));
	useEffect(() => { void vm.load(); }, [vm]);

	return (
		<div className="p-6 space-y-4">
			<h1 className="text-xl font-semibold">Verification Jobs</h1>
			<div className="border rounded">
				<div className="grid grid-cols-5 text-sm font-medium border-b p-2">
					<div>Job ID</div>
					<div>Market</div>
					<div>Stage</div>
					<div>Updated</div>
					<div>Status</div>
				</div>
				{vm.items.map(j => (
					<div key={j.id} className="grid grid-cols-5 text-sm p-2 border-b last:border-b-0">
						<div>{j.id}</div>
						<div>{j.marketId}</div>
						<div>{j.stage}</div>
						<div>{new Date(j.updatedAt).toLocaleString()}</div>
						<div>{j.status}</div>
					</div>
				))}
			</div>
		</div>
	);
}



"use client";

import React, { useEffect, useState } from "react";
import { AttestationsFeedViewModel } from "@/lib/dashboard/viewmodels/AttestationsFeedViewModel";
import { AttestationManager } from "@/lib/dashboard/managers/AttestationManager";

export default function AttestationsPage(): React.ReactElement {
	const [vm] = useState(() => new AttestationsFeedViewModel(new AttestationManager()));
	useEffect(() => { void vm.load(); }, [vm]);

	return (
		<div className="space-y-3 sm:space-y-4">
			<h1 className="text-lg sm:text-xl font-semibold">Attestations</h1>
			<div className="border rounded overflow-hidden">
				<div className="overflow-x-auto">
					<div className="min-w-[600px]">
						<div className="grid grid-cols-5 text-xs sm:text-sm font-medium border-b p-2">
							<div>CID</div>
							<div>Market</div>
							<div>Outcome</div>
							<div className="hidden sm:block">Time</div>
							<div className="sm:hidden">Time</div>
							<div>Signers</div>
						</div>
						{vm.items.map(a => (
							<div key={a.cid} className="grid grid-cols-5 text-xs sm:text-sm p-2 border-b last:border-b-0">
								<div className="truncate font-mono text-[10px] sm:text-xs">{a.cid}</div>
								<div className="truncate">{a.marketId}</div>
								<div>{a.outcome === null ? "-" : a.outcome ? "Yes" : "No"}</div>
								<div className="text-[10px] sm:text-sm">{new Date(a.timestamp * 1000).toLocaleString()}</div>
								<div>{a.signers.length}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}



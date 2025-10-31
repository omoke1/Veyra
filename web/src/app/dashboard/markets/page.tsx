"use client";

import React, { useEffect, useState } from "react";
import { MarketsListViewModel } from "@/lib/dashboard/viewmodels/MarketsListViewModel";
import { MarketsManager } from "@/lib/dashboard/managers/MarketsManager";

export default function MarketsPage(): React.ReactElement {
	const [vm] = useState(() => new MarketsListViewModel(new MarketsManager()));
	useEffect(() => { void vm.load(); }, [vm]);

	return (
		<div className="space-y-3 sm:space-y-4">
			<h1 className="text-lg sm:text-xl font-semibold">Markets</h1>
			<div className="border rounded overflow-hidden">
				<div className="overflow-x-auto">
					<div className="min-w-[600px]">
						<div className="grid grid-cols-5 text-xs sm:text-sm font-medium border-b p-2">
							<div>Market</div>
							<div>Category</div>
							<div>Status</div>
							<div className="hidden sm:block">Deadline</div>
							<div className="sm:hidden">Date</div>
							<div>Oracle</div>
						</div>
						{vm.items.map(m => (
							<div key={m.id} className="grid grid-cols-5 text-xs sm:text-sm p-2 border-b last:border-b-0">
								<div className="truncate">{m.title}</div>
								<div>{m.category}</div>
								<div>{m.status}</div>
								<div className="text-[10px] sm:text-sm">{new Date(m.deadline).toLocaleString()}</div>
								<div>{m.oracleStatus}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}



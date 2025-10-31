"use client";

import React, { useEffect, useState } from "react";
import { MarketsListViewModel } from "@/lib/dashboard/viewmodels/MarketsListViewModel";
import { MarketsManager } from "@/lib/dashboard/managers/MarketsManager";

export default function MarketsPage(): React.ReactElement {
	const [vm] = useState(() => new MarketsListViewModel(new MarketsManager()));
	useEffect(() => { void vm.load(); }, [vm]);

	return (
		<div className="p-6 space-y-4">
			<h1 className="text-xl font-semibold">Markets</h1>
			<div className="border rounded">
				<div className="grid grid-cols-5 text-sm font-medium border-b p-2">
					<div>Market</div>
					<div>Category</div>
					<div>Status</div>
					<div>Deadline</div>
					<div>Oracle</div>
				</div>
				{vm.items.map(m => (
					<div key={m.id} className="grid grid-cols-5 text-sm p-2 border-b last:border-b-0">
						<div className="truncate">{m.title}</div>
						<div>{m.category}</div>
						<div>{m.status}</div>
						<div>{new Date(m.deadline).toLocaleString()}</div>
						<div>{m.oracleStatus}</div>
					</div>
				))}
			</div>
		</div>
	);
}



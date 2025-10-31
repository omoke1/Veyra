"use client";

import React from "react";

export default function AdminPage(): React.ReactElement {
	return (
		<div className="p-6 space-y-2">
			<h1 className="text-xl font-semibold">Admin</h1>
			<p className="text-sm text-muted-foreground">Planned: set oracle, fee recipient, flat fee; rotate oracle admin.</p>
		</div>
	);
}



import React from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactElement {
	return (
		<div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<div>
					<h1 className="text-xl sm:text-2xl font-semibold">Veyra Dashboard</h1>
					<p className="text-xs sm:text-sm text-muted-foreground">Verifiable Prediction Oracle Network</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<Badge variant="secondary" className="text-xs">Network Online</Badge>
					<Button variant="outline" size="sm" className="text-xs">Connect Wallet</Button>
					<Button variant="ghost" size="sm" className="text-xs hidden sm:inline-flex">Sign Out</Button>
				</div>
			</div>
			<DashboardNav />
			<div>{children}</div>
		</div>
	);
}



import React from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactElement {
	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Veyra Dashboard</h1>
					<p className="text-sm text-muted-foreground">Verifiable Prediction Oracle Network</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">Network Online</Badge>
					<Button variant="outline">Connect Wallet</Button>
					<Button variant="ghost">Sign Out</Button>
				</div>
			</div>
			<DashboardNav />
			<div>{children}</div>
		</div>
	);
}



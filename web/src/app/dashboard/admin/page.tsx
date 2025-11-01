"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function AdminPage(): React.ReactElement {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Governance</CardTitle>
					<CardDescription>Protocol upgrades and community participation</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
						<Users className="w-24 h-24 text-muted-foreground/40 mb-6" />
						<p className="text-lg text-muted-foreground mb-2">Governance features coming soon</p>
						<p className="text-sm text-muted-foreground">Future-proof for decentralization and community participation</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}



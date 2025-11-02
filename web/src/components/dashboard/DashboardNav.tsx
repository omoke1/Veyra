"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
	label: string;
	path: string;
}

const NAV_ITEMS: NavItem[] = [
	{ label: "Overview", path: "/dashboard/veyra" },
	{ label: "Markets", path: "/dashboard/markets" },
	{ label: "Positions", path: "/dashboard/positions" },
	{ label: "Proofs", path: "/dashboard/attestations" },
	{ label: "Operators", path: "/dashboard/nodes" },
	{ label: "Dev", path: "/dashboard/docs" },
	{ label: "Gov", path: "/dashboard/admin" }
];

export function DashboardNav(): React.ReactElement {
	const pathname = usePathname();
	return (
		<nav className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto scrollbar-hide w-full sm:w-auto">
			{NAV_ITEMS.map((item) => {
				const active = pathname === item.path || (item.path === "/dashboard/veyra" && pathname === "/dashboard");
				return (
					<Link
						key={item.path}
						href={item.path}
						className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shrink-0 ${
							active
								? "bg-background text-foreground shadow-sm"
								: "hover:bg-background/50 hover:text-foreground"
						}`}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}



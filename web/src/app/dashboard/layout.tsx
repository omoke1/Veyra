"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github, Twitter, Globe, LogOut } from "lucide-react";
import { useWallet } from "@/lib/wallet/walletContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactElement {
	const router = useRouter();
	const { address, isConnected, connect, disconnect } = useWallet();

	const handleSignOut = () => {
		disconnect();
		router.push("/");
	};

	const handleDisconnect = () => {
		disconnect();
	};

	const formatAddress = (addr: string | null): string => {
		if (!addr) return "";
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	};

	return (
		<div className="container mx-auto max-w-7xl p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6 pb-3 sm:pb-4">
				<div className="flex flex-col gap-3 sm:gap-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div className="flex-1 min-w-0">
							<h1 className="text-xl sm:text-2xl font-semibold">Veyra Dashboard</h1>
							<p className="text-xs sm:text-sm text-muted-foreground">Verifiable Prediction Oracle Network</p>
						</div>
						<div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
							<Badge variant="secondary" className="text-[10px] sm:text-xs bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap px-1.5 sm:px-2">Network Online</Badge>
							{isConnected && address ? (
								<div className="flex items-center gap-1.5 sm:gap-2">
									<Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3 font-mono">
										{formatAddress(address)}
									</Badge>
									<Button 
										variant="ghost" 
										size="sm" 
										className="text-[10px] sm:text-xs p-1.5 sm:p-2 h-auto" 
										onClick={handleDisconnect}
										title="Disconnect Wallet"
									>
										<LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
									</Button>
								</div>
							) : (
								<Button variant="outline" size="sm" className="text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3" onClick={connect}>
									Connect Wallet
								</Button>
							)}
							<Button variant="ghost" size="sm" className="text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3" onClick={handleSignOut}>
								Sign Out
							</Button>
						</div>
					</div>
					<div>
						<DashboardNav />
					</div>
				</div>
			</header>
			<div>{children}</div>

			<footer className="mt-12 pt-8 border-t border-border">
				<div className="flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<span className="text-sm text-muted-foreground">
							© 2025 Veyra Network. All rights reserved.
						</span>
					</div>
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon">
							<Github className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon">
							<Twitter className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon">
							<Globe className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</footer>
		</div>
	);
}



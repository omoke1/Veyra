"use client";

import React, { useEffect, useState } from "react";
import { ExternalMarketsManager, type ExternalMarketSummary } from "@/lib/dashboard/managers/ExternalMarketsManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResolveMarketDialog } from "@/components/markets/ResolveMarketDialog";
import { VerifyExternalMarketDialog } from "@/components/markets/VerifyExternalMarketDialog";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function ExternalMarketsPage(): React.ReactElement {
	const [sourceFilter, setSourceFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedMarket, setSelectedMarket] = useState<ExternalMarketSummary | null>(null);
	const [markets, setMarkets] = useState<ExternalMarketSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			const manager = new ExternalMarketsManager();
			const data = await manager.listRecent(
				sourceFilter !== "all" ? sourceFilter : undefined,
				statusFilter !== "all" ? statusFilter : undefined
			);
			setMarkets(data);
			setIsLoading(false);
		})();
	}, [sourceFilter, statusFilter]);

	const getSourceBadgeColor = (source: string) => {
		switch (source) {
			case "UMA":
				return "bg-purple-500/10 text-purple-500";
			case "Gnosis":
				return "bg-blue-500/10 text-blue-500";
			case "Polymarket":
				return "bg-green-500/10 text-green-500";
			default:
				return "bg-gray-500/10 text-gray-500";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "Resolved":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />;
			case "Pending":
				return <Clock className="h-4 w-4 text-yellow-500" />;
			default:
				return <AlertCircle className="h-4 w-4 text-gray-500" />;
		}
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">External Markets</h1>
					<p className="text-sm sm:text-base text-muted-foreground mt-1">
						Markets from UMA, Gnosis, and Polymarket verified by Veyra
					</p>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="source">Source</Label>
							<Select value={sourceFilter} onValueChange={setSourceFilter}>
								<SelectTrigger id="source">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Sources</SelectItem>
									<SelectItem value="UMA">UMA</SelectItem>
									<SelectItem value="Gnosis">Gnosis</SelectItem>
									<SelectItem value="Polymarket">Polymarket</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="status">Status</Label>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger id="status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="Pending">Pending</SelectItem>
									<SelectItem value="Resolved">Resolved</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Markets Grid */}
			{isLoading ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						<p>Loading external markets...</p>
					</CardContent>
				</Card>
			) : markets.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						<p>No external markets found.</p>
						<p className="text-xs mt-2">Markets will appear here when detected by the bridge service.</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{markets.map((market) => (
						<Card
							key={market.id}
							className="flex flex-col hover:border-primary transition-colors cursor-pointer"
							onClick={() => setSelectedMarket(market)}
						>
							<CardHeader>
								<div className="flex items-start justify-between gap-2 mb-2">
									<Badge variant="secondary" className={`text-xs ${getSourceBadgeColor(market.source)}`}>
										{market.source}
									</Badge>
									<Badge
										variant={market.status === "Resolved" ? "default" : "outline"}
										className={`text-xs flex items-center gap-1 ${
											market.status === "Resolved"
												? "bg-green-500/10 text-green-500"
												: "bg-yellow-500/10 text-yellow-500"
										}`}
									>
										{getStatusIcon(market.status)}
										{market.status}
									</Badge>
								</div>
								<CardTitle className="text-sm sm:text-base line-clamp-2">{market.question}</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col justify-between">
								<div className="space-y-2">
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>Outcome:</span>
										<Badge variant="outline" className="text-xs">
											{market.outcome || "Pending"}
										</Badge>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>Verification:</span>
										<Badge variant="outline" className="text-xs">
											{market.verificationStatus || "Pending"}
										</Badge>
									</div>
								</div>
								{market.txHash && (
									<Button
										variant="ghost"
										size="sm"
										className="mt-4 w-full"
										onClick={(e) => {
											e.stopPropagation();
											window.open(`https://sepolia.etherscan.io/tx/${market.txHash}`, "_blank");
										}}
									>
										<ExternalLink className="h-3 w-3 mr-2" />
										View on Etherscan
									</Button>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Market Detail Dialog */}
			<Dialog open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
				<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
					{selectedMarket && (
						<>
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<Badge className={getSourceBadgeColor(selectedMarket.source)}>
										{selectedMarket.source}
									</Badge>
									Market Details
								</DialogTitle>
								<DialogDescription>{selectedMarket.question}</DialogDescription>
							</DialogHeader>

							<div className="space-y-4">
								<Separator />

								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label className="text-xs text-muted-foreground">Status</Label>
										<div className="mt-1">
											<Badge
												variant={selectedMarket.status === "Resolved" ? "default" : "outline"}
												className={selectedMarket.status === "Resolved" ? "bg-green-500/10 text-green-500" : ""}
											>
												{selectedMarket.status}
											</Badge>
										</div>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Outcome</Label>
										<div className="mt-1">
											<Badge variant="outline">{selectedMarket.outcome || "Pending"}</Badge>
										</div>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Verification Status</Label>
										<div className="mt-1">
											<Badge variant="outline">{selectedMarket.verificationStatus || "Pending"}</Badge>
										</div>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">Market ID</Label>
										<div className="mt-1 text-xs font-mono break-all">{selectedMarket.id}</div>
									</div>
								</div>

								{selectedMarket.createdAt && (
									<div>
										<Label className="text-xs text-muted-foreground">Created</Label>
										<div className="mt-1 text-sm">
											{new Date(selectedMarket.createdAt * 1000).toLocaleString()}
										</div>
									</div>
								)}

								{selectedMarket.resolvedAt && (
									<div>
										<Label className="text-xs text-muted-foreground">Resolved</Label>
										<div className="mt-1 text-sm">
											{new Date(selectedMarket.resolvedAt * 1000).toLocaleString()}
										</div>
									</div>
								)}

								{selectedMarket.txHash && (
									<div>
										<Label className="text-xs text-muted-foreground">Transaction</Label>
										<div className="mt-1">
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													window.open(`https://sepolia.etherscan.io/tx/${selectedMarket.txHash}`, "_blank");
												}}
											>
												<ExternalLink className="h-3 w-3 mr-2" />
												View on Etherscan
											</Button>
										</div>
									</div>
								)}

								{selectedMarket.status === "Pending" && (
									<VerifyExternalMarketDialog
										marketId={selectedMarket.id}
										source={selectedMarket.source}
										question={selectedMarket.question}
										trigger={
											<Button variant="outline" className="flex-1 gap-2">
												<ExternalLink className="w-4 h-4" />
												Verify
											</Button>
										}
									/>
								)}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}


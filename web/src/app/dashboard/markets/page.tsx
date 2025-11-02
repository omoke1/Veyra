"use client";

import React, { useEffect, useState } from "react";
import { MarketsManager } from "@/lib/dashboard/managers/MarketsManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Copy, CheckCircle2 } from "lucide-react";
import type { MarketSummary } from "@/lib/dashboard/types";
import { CreateMarketDialog } from "@/components/markets/CreateMarketDialog";
import { TradeDialog } from "@/components/markets/TradeDialog";
import { RedeemDialog } from "@/components/markets/RedeemDialog";
import { ResolveMarketDialog } from "@/components/markets/ResolveMarketDialog";

export default function MarketsPage(): React.ReactElement {
	const [platformFilter, setPlatformFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedMarket, setSelectedMarket] = useState<MarketSummary | null>(null);
	const [markets, setMarkets] = useState<MarketSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			const marketsManager = new MarketsManager();
			const data = await marketsManager.listRecent();
			setMarkets(data);
			setIsLoading(false);
		})();
	}, []);

	const filteredMarkets = markets.filter((market) => {
		if (platformFilter !== "all" && market.platform !== platformFilter) return false;
		if (statusFilter !== "all" && market.status !== statusFilter) return false;
		return true;
	});

	const handleMarketCreated = (marketAddress: string) => {
		// Refresh markets list
		void (async () => {
			const marketsManager = new MarketsManager();
			const data = await marketsManager.listRecent();
			setMarkets(data);
		})();
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl sm:text-2xl font-semibold">Prediction Markets</h1>
				<CreateMarketDialog onSuccess={handleMarketCreated} />
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Market Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<Label>Platform</Label>
							<Select value={platformFilter} onValueChange={setPlatformFilter}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Platforms</SelectItem>
									<SelectItem value="Polymarket">Polymarket</SelectItem>
									<SelectItem value="Gnosis">Gnosis</SelectItem>
									<SelectItem value="UMA">UMA</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1 min-w-[200px]">
							<Label>Status</Label>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="Active">Active</SelectItem>
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
						<p>Loading markets...</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredMarkets.map(market => (
					<Card
						key={market.id}
						className="flex flex-col hover:border-primary transition-colors cursor-pointer"
						onClick={() => setSelectedMarket(market)}
					>
						<CardHeader>
							<div className="flex items-start justify-between gap-2 mb-2">
								<Badge variant="secondary" className="text-xs">{market.platform}</Badge>
								<Badge 
									variant={market.status === "Active" ? "default" : "outline"}
									className={`text-xs ${
										market.status === "Active" 
											? "bg-blue-500/10 text-blue-500" 
											: "bg-green-500/10 text-green-500"
									}`}
								>
									{market.status}
								</Badge>
							</div>
							<CardTitle className="text-sm sm:text-base line-clamp-2">{market.question}</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 flex flex-col justify-between space-y-3">
							<div className="space-y-2 text-xs sm:text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Category</span>
									<span className="font-medium">{market.category}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Result</span>
									<Badge 
										variant="outline"
										className={
											market.result === "Yes"
												? "bg-green-500/10 text-green-500"
												: market.result === "No"
												? "bg-red-500/10 text-red-500"
												: ""
										}
									>
										{market.result}
									</Badge>
								</div>
								<div className="flex items-center justify-between pt-1 border-t">
									<span className="text-muted-foreground">Linked Proofs</span>
									<span className="font-medium">{market.proofIds.length}</span>
								</div>
							</div>
							<div className="pt-2 flex gap-2">
								{market.status === "Active" && (
									<TradeDialog
										marketAddress={market.id}
										trigger={
											<Button
												variant="default"
												size="sm"
												className="flex-1 text-xs"
												onClick={(e) => e.stopPropagation()}
											>
												Trade
											</Button>
										}
									/>
								)}
								<Button
									variant="outline"
									size="sm"
									className={market.status === "Active" ? "flex-1 text-xs" : "w-full text-xs"}
									onClick={(e) => {
										e.stopPropagation();
										setSelectedMarket(market);
									}}
								>
									View Details
								</Button>
							</div>
						</CardContent>
					</Card>
					))}
				</div>
			)}

			{!isLoading && filteredMarkets.length === 0 && (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						<p>No markets found matching the selected filters.</p>
					</CardContent>
				</Card>
			)}

			{/* Market Details Dialog */}
			<Dialog open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-xl">{selectedMarket?.question}</DialogTitle>
						<DialogDescription>Market verification details and proofs</DialogDescription>
					</DialogHeader>
					{selectedMarket && (
						<div className="space-y-4">
							{/* Market Info */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-xs text-muted-foreground">Platform</Label>
									<div className="mt-1">
										<Badge variant="secondary">{selectedMarket.platform}</Badge>
									</div>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Status</Label>
									<div className="mt-1">
										<Badge
											variant={selectedMarket.status === "Active" ? "default" : "outline"}
											className={
												selectedMarket.status === "Active"
													? "bg-blue-500/10 text-blue-500"
													: "bg-green-500/10 text-green-500"
											}
										>
											{selectedMarket.status}
										</Badge>
									</div>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Category</Label>
									<p className="text-sm font-medium mt-1">{selectedMarket.category}</p>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Result</Label>
									<div className="mt-1">
										<Badge
											variant="outline"
											className={
												selectedMarket.result === "Yes"
													? "bg-green-500/10 text-green-500"
													: selectedMarket.result === "No"
													? "bg-red-500/10 text-red-500"
													: ""
											}
										>
											{selectedMarket.result}
										</Badge>
									</div>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Market ID</Label>
									<p className="text-sm font-mono mt-1">{selectedMarket.id}</p>
								</div>
								<div>
									<Label className="text-xs text-muted-foreground">Linked Proofs</Label>
									<p className="text-sm font-medium mt-1">{selectedMarket.proofIds.length} proof(s)</p>
								</div>
							</div>

							<Separator />

							{/* Proof IDs */}
							{selectedMarket.proofIds.length > 0 ? (
								<div>
									<Label className="text-sm font-medium mb-3 block">Linked Proofs</Label>
									<div className="space-y-2">
										{selectedMarket.proofIds.map((proofId, index) => (
											<div key={proofId} className="flex items-center justify-between p-3 bg-muted rounded-md">
												<div className="flex items-center gap-2">
													<FileText className="w-4 h-4 text-muted-foreground" />
													<span className="text-sm font-mono">{proofId}</span>
												</div>
												<div className="flex gap-2">
													<Button
														size="sm"
														variant="ghost"
														onClick={() => navigator.clipboard.writeText(proofId)}
													>
														<Copy className="w-3 h-3" />
													</Button>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => {
															window.location.href = `/dashboard/attestations`;
														}}
													>
														<ExternalLink className="w-3 h-3" />
													</Button>
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-center py-4 text-muted-foreground">
									<p className="text-sm">No proofs linked yet. Proofs will appear here once verification is complete.</p>
								</div>
							)}

							<Separator />

							{/* Actions */}
							<div className="flex flex-wrap gap-2">
								{selectedMarket.status === "Resolved" && (
									<RedeemDialog
										marketAddress={selectedMarket.id}
										trigger={
											<Button className="flex-1 gap-2">
												<CheckCircle2 className="w-4 h-4" />
												Redeem
											</Button>
										}
									/>
								)}
								{selectedMarket.status === "Active" && (
									<ResolveMarketDialog
										marketAddress={selectedMarket.id}
										trigger={
											<Button variant="outline" className="flex-1 gap-2">
												<ExternalLink className="w-4 h-4" />
												Resolve
											</Button>
										}
									/>
								)}
								{selectedMarket.proofIds.length > 0 && (
									<Button variant="outline" className="flex-1 gap-2" onClick={() => {
										window.location.href = `/dashboard/attestations`;
									}}>
										<FileText className="w-4 h-4" />
										View Proofs
									</Button>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}



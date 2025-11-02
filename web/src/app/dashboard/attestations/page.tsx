"use client";

import React, { useEffect, useState } from "react";
import { AttestationsFeedViewModel } from "@/lib/dashboard/viewmodels/AttestationsFeedViewModel";
import { AttestationManager } from "@/lib/dashboard/managers/AttestationManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter, ExternalLink, Copy, Shield, Loader2 } from "lucide-react";
import type { Proof } from "@/lib/dashboard/types";

export default function AttestationsPage(): React.ReactElement {
	const [vm] = useState(() => new AttestationsFeedViewModel(new AttestationManager()));
	const [proofs, setProofs] = useState<Proof[]>([]);
	const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	const attestationManager = new AttestationManager();

	useEffect(() => {
		void (async () => {
			setIsLoading(true);
			try {
				await vm.load();
				const proofList = await attestationManager.listProofs();
				setProofs(proofList);
			} catch (error) {
				console.error("Error loading proofs:", error);
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	const filteredProofs = proofs.filter((proof) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			proof.jobId.toLowerCase().includes(query) ||
			proof.marketId.toLowerCase().includes(query) ||
			proof.ipfsCID.toLowerCase().includes(query) ||
			proof.computedBy.toLowerCase().includes(query)
		);
	});

	return (
		<div className="space-y-4 sm:space-y-6">
			<h1 className="text-xl sm:text-2xl font-semibold">Proof Explorer</h1>

			{/* Search and Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base sm:text-lg">Search Proofs</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
						<div className="flex-1">
							<Input
								placeholder="Search by Market ID, Proof ID, or CID..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="text-xs sm:text-sm"
							/>
						</div>
						<Button variant="outline" className="gap-2 text-xs sm:text-sm" size="sm">
							<Filter className="w-4 h-4" />
							Filters
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Proofs Table */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base sm:text-lg">Verified Proofs</CardTitle>
					<CardDescription className="text-xs sm:text-sm">All verified prediction proofs</CardDescription>
				</CardHeader>
				<CardContent className="p-0 sm:p-6">
					{isLoading ? (
						<div className="py-8 text-center">
							<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
							<p className="text-muted-foreground text-sm">Loading proofs...</p>
						</div>
					) : filteredProofs.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							<p className="text-sm">No proofs found</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Job ID</TableHead>
									<TableHead>Result</TableHead>
									<TableHead>Computed By</TableHead>
									<TableHead>Timestamp</TableHead>
									<TableHead>IPFS CID</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredProofs.map((proof) => (
									<TableRow key={proof.id}>
										<TableCell className="font-mono text-xs">{proof.jobId}</TableCell>
										<TableCell>
											<Badge className="bg-green-500/10 text-green-500">
												{proof.result}
											</Badge>
										</TableCell>
										<TableCell>{proof.computedBy}</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{proof.timestamp}
										</TableCell>
										<TableCell className="font-mono text-xs">{proof.ipfsCID}</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => setSelectedProof(proof)}
												>
													Details
												</Button>
												<Button size="sm" variant="ghost">
													<ExternalLink className="w-4 h-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Proof Details Dialog */}
			<Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Proof Details</DialogTitle>
						<DialogDescription>Verification information</DialogDescription>
					</DialogHeader>
					{selectedProof && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label>Job ID</Label>
									<p className="text-sm font-mono mt-1">{selectedProof.jobId}</p>
								</div>
								<div>
									<Label>Result</Label>
									<p className="text-sm font-medium mt-1">{selectedProof.result}</p>
								</div>
								<div>
									<Label>Computed By</Label>
									<p className="text-sm font-medium mt-1">{selectedProof.computedBy}</p>
								</div>
								<div>
									<Label>Timestamp</Label>
									<p className="text-sm font-medium mt-1">{selectedProof.timestamp}</p>
								</div>
							</div>
							<Separator />
							<div>
								<Label>IPFS CID</Label>
								<div className="flex items-center gap-2 mt-1">
									<code className="flex-1 p-2 bg-muted rounded text-sm">
										{selectedProof.ipfsCID}
									</code>
									<Button size="sm" variant="ghost">
										<Copy className="w-4 h-4" />
									</Button>
								</div>
							</div>
							<div>
								<Label>Signature</Label>
								<div className="flex items-center gap-2 mt-1">
									<code className="flex-1 p-2 bg-muted rounded text-sm truncate">
										{selectedProof.signature}
									</code>
									<Button size="sm" variant="ghost">
										<Copy className="w-4 h-4" />
									</Button>
								</div>
							</div>
							<div className="flex gap-2">
								<Button className="flex-1 gap-2">
									<ExternalLink className="w-4 h-4" />
									View on IPFS
								</Button>
								<Button variant="outline" className="flex-1 gap-2">
									<Shield className="w-4 h-4" />
									Verify Signature
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}



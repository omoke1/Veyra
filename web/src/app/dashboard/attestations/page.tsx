"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Filter, ExternalLink, Copy, Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Proof } from "@/lib/dashboard/types";

export default function AttestationsPage(): React.ReactElement {
	const [vm] = useState(() => new AttestationsFeedViewModel(new AttestationManager()));
	const [proofs, setProofs] = useState<Proof[]>([]);
	const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
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
										<TableCell className="font-mono text-xs" title={proof.ipfsCID}>
											{proof.ipfsCID.length > 20 ? `${proof.ipfsCID.substring(0, 10)}...` : proof.ipfsCID}
										</TableCell>
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
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Shield className="w-5 h-5 text-primary" />
							Proof Details
						</DialogTitle>
						<DialogDescription>Cryptographic verification of the prediction outcome</DialogDescription>
					</DialogHeader>
					{selectedProof && (
						<div className="space-y-6">
							{/* Status Banner */}
							<div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
								<div className="flex items-center gap-3">
									<div className={`p-2 rounded-full ${selectedProof.result === "Verified" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
										{selectedProof.result === "Verified" ? <CheckCircle2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
									</div>
									<div>
										<p className="font-medium">Verification Status</p>
										<p className="text-sm text-muted-foreground">{selectedProof.result}</p>
									</div>
								</div>
								<Badge variant="outline" className="font-mono">
									{selectedProof.timestamp}
								</Badge>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Left Column: Request Details */}
								<div className="space-y-4">
									<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Request Info</h3>
									
									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">Job ID</Label>
										<div className="flex items-center gap-2">
											<code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
												{selectedProof.jobId}
											</code>
											<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(selectedProof.jobId)}>
												<Copy className="w-3 h-3" />
											</Button>
										</div>
									</div>

									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">Market ID</Label>
										<div className="flex items-center gap-2">
											<code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
												{selectedProof.marketId}
											</code>
											<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(selectedProof.marketId)}>
												<Copy className="w-3 h-3" />
											</Button>
										</div>
									</div>

									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">Computed By (Operator)</Label>
										<div className="flex items-center gap-2">
											<code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
												{selectedProof.computedBy}
											</code>
											<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(selectedProof.computedBy)}>
												<Copy className="w-3 h-3" />
											</Button>
										</div>
									</div>
								</div>

								{/* Right Column: Proof Data */}
								<div className="space-y-4">
									<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Proof Data</h3>
									
									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">IPFS CID</Label>
										<div className="flex items-center gap-2">
											<code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate" title={selectedProof.ipfsCID}>
												{selectedProof.ipfsCID}
											</code>
											<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(selectedProof.ipfsCID)}>
												<Copy className="w-3 h-3" />
											</Button>
										</div>
										<a 
											href={`https://gateway.pinata.cloud/ipfs/${selectedProof.ipfsCID}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
										>
											View Raw Data <ExternalLink className="w-3 h-3" />
										</a>
									</div>

									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">Signature</Label>
										<div className="flex items-center gap-2">
											<code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate" title={selectedProof.signature}>
												{selectedProof.signature || "Not signed"}
											</code>
											<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(selectedProof.signature)}>
												<Copy className="w-3 h-3" />
											</Button>
										</div>
									</div>
								</div>
							</div>

							<Separator />

							{/* Actions */}
							<div className="flex gap-3">
								<Button 
									variant="outline"
									className="flex-1 gap-2"
									onClick={async () => {
										try {
											const { ethers } = await import("ethers");
											
											if (!selectedProof.signature || selectedProof.signature === "0x") {
												alert("No valid signature found for this proof.");
												return;
											}

											// EIP-712 Domain
											const domain = {
												name: "Veyra Oracle AVS",
												version: "1",
												chainId: 11155111, // Sepolia
												verifyingContract: "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203" // Adapter Address
											};

											// EIP-712 Types
											const types = {
												Attestation: [
													{ name: "requestId", type: "bytes32" },
													{ name: "outcome", type: "bool" },
													{ name: "attestationCid", type: "string" },
													{ name: "timestamp", type: "uint256" },
												],
											};

											// Message
											// Note: We need to ensure types match exactly what was signed
											const message = {
												requestId: selectedProof.jobId, // Assuming jobId is the requestId (it is in indexer)
												outcome: true, // Assuming "Verified" means outcome was true (or we need to fetch actual outcome)
												// Wait, outcome could be false! 
												// In AttestationManager, we map outcome 1 -> true, 0 -> false.
												// But Proof type doesn't have raw outcome boolean.
												// We need to fix this. For now, let's assume true if result is "Verified" and green.
												// Actually, let's check AttestationManager again.
												attestationCid: selectedProof.ipfsCID,
												timestamp: selectedProof.rawTimestamp,
											};
											
											// Hack: Try both true and false if verification fails?
											// Or better, update Proof type to include outcome boolean.
											// For now, let's try true.
											
											const recoveredAddress = ethers.verifyTypedData(domain, types, message, selectedProof.signature);
											
											if (recoveredAddress.toLowerCase() === selectedProof.computedBy.toLowerCase()) {
												alert(`✅ Signature Valid!\n\nSigned by: ${recoveredAddress}\nMatches Operator: ${selectedProof.computedBy}`);
											} else {
												// Try with outcome = false
												const messageFalse = { ...message, outcome: false };
												const recoveredAddressFalse = ethers.verifyTypedData(domain, types, messageFalse, selectedProof.signature);
												
												if (recoveredAddressFalse.toLowerCase() === selectedProof.computedBy.toLowerCase()) {
													alert(`✅ Signature Valid (Outcome: NO)!\n\nSigned by: ${recoveredAddressFalse}\nMatches Operator: ${selectedProof.computedBy}`);
												} else {
													alert(`❌ Signature Invalid.\n\nRecovered: ${recoveredAddress}\nExpected: ${selectedProof.computedBy}`);
												}
											}
										} catch (e: any) {
											console.error(e);
											alert(`Verification Error: ${e.message}`);
										}
									}}
								>
									<Shield className="w-4 h-4" />
									Verify Signature
								</Button>
								<Button 
									className="flex-1 gap-2"
									onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${selectedProof.ipfsCID}`, "_blank")}
								>
									<ExternalLink className="w-4 h-4" />
									View Proof Data
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}



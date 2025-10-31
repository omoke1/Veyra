"use client";

import React, { useState } from "react";
import {
	Activity,
	TrendingUp,
	TrendingDown,
	Users,
	CheckCircle2,
	Clock,
	Search,
	Filter,
	Download,
	ExternalLink,
	Plus,
	BarChart3,
	PieChart,
	LineChart,
	Globe,
	Shield,
	Zap,
	FileText,
	Code,
	AlertCircle,
	ChevronRight,
	Copy,
	Twitter,
	Github,
	MessageCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StatCardProps {
	title: string;
	value: string;
	trend?: number;
	icon: React.ReactNode;
}

function StatCard({ title, value, trend, icon }: StatCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				{icon}
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{trend !== undefined && (
					<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
						{trend > 0 ? (
							<>
								<TrendingUp className="w-3 h-3 text-green-500" />
								<span className="text-green-500">+{trend}%</span>
							</>
						) : (
							<>
								<TrendingDown className="w-3 h-3 text-red-500" />
								<span className="text-red-500">{trend}%</span>
							</>
						)}
						<span>from last month</span>
					</p>
				)}
			</CardContent>
		</Card>
	);
}

interface Resolution {
	id: string;
	market: string;
	question: string;
	result: string;
	proofCID: string;
	timestamp: string;
	platform: string;
}

interface Market {
	id: string;
	question: string;
	platform: string;
	status: string;
	result: string;
	category: string;
	proofIds: string[];
}

interface Proof {
	id: string;
	jobId: string;
	result: string;
	computedBy: string;
	timestamp: string;
	ipfsCID: string;
	signature: string;
	marketId: string;
}

interface Operator {
	id: string;
	nodeId: string;
	staked: string;
	jobsCompleted: number;
	lastHeartbeat: string;
	status: string;
	completionRate: number;
	latency: string;
	rewards: string;
}

interface Proposal {
	id: string;
	title: string;
	status: string;
	votes: { yes: number; no: number };
	endDate: string;
}

export default function VPODashboard() {
	const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
	const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
	const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
	const [platformFilter, setPlatformFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const resolutions: Resolution[] = [
		{ id: "1", market: "Polymarket", question: "Will Bitcoin reach $100k in 2024?", result: "Yes", proofCID: "Qm...abc123", timestamp: "2024-01-15 14:32:00", platform: "Polymarket" },
		{ id: "2", market: "Gnosis", question: "Will ETH surpass $5000?", result: "No", proofCID: "Qm...def456", timestamp: "2024-01-15 13:20:00", platform: "Gnosis" },
		{ id: "3", market: "Polymarket", question: "Will AI regulation pass in 2024?", result: "Yes", proofCID: "Qm...ghi789", timestamp: "2024-01-15 12:15:00", platform: "Polymarket" },
	];

	const markets: Market[] = [
		{ id: "m1", question: "Will Bitcoin reach $100k in 2024?", platform: "Polymarket", status: "Resolved", result: "Yes", category: "Crypto", proofIds: ["p1", "p2"] },
		{ id: "m2", question: "Will ETH surpass $5000?", platform: "Gnosis", status: "Resolved", result: "No", category: "Crypto", proofIds: ["p3"] },
		{ id: "m3", question: "Will AI regulation pass in 2024?", platform: "Polymarket", status: "Active", result: "Pending", category: "Politics", proofIds: [] },
	];

	const proofs: Proof[] = [
		{ id: "p1", jobId: "job_001", result: "Verified", computedBy: "Node_Alpha", timestamp: "2024-01-15 14:32:00", ipfsCID: "Qm...abc123", signature: "0x1234...5678", marketId: "m1" },
		{ id: "p2", jobId: "job_002", result: "Verified", computedBy: "Node_Beta", timestamp: "2024-01-15 13:20:00", ipfsCID: "Qm...def456", signature: "0x5678...9abc", marketId: "m1" },
		{ id: "p3", jobId: "job_003", result: "Verified", computedBy: "Node_Gamma", timestamp: "2024-01-15 12:15:00", ipfsCID: "Qm...ghi789", signature: "0x9abc...def0", marketId: "m2" },
	];

	const operators: Operator[] = [
		{ id: "1", nodeId: "Node_Alpha", staked: "50,000 VPO", jobsCompleted: 1247, lastHeartbeat: "2 min ago", status: "Online", completionRate: 99.8, latency: "45ms", rewards: "12,450 VPO" },
		{ id: "2", nodeId: "Node_Beta", staked: "35,000 VPO", jobsCompleted: 892, lastHeartbeat: "1 min ago", status: "Online", completionRate: 98.5, latency: "52ms", rewards: "8,920 VPO" },
		{ id: "3", nodeId: "Node_Gamma", staked: "25,000 VPO", jobsCompleted: 654, lastHeartbeat: "15 min ago", status: "Offline", completionRate: 97.2, latency: "N/A", rewards: "6,540 VPO" },
	];

	const proposals: Proposal[] = [
		{ id: "1", title: "Increase minimum stake requirement to 100k VPO", status: "Active", votes: { yes: 1250000, no: 450000 }, endDate: "2024-01-20" },
		{ id: "2", title: "Add support for Arbitrum markets", status: "Active", votes: { yes: 980000, no: 320000 }, endDate: "2024-01-22" },
	];

	const filteredMarkets = markets.filter((market) => {
		if (platformFilter !== "all" && market.platform !== platformFilter) return false;
		if (statusFilter !== "all" && market.status !== statusFilter) return false;
		return true;
	});

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-4xl font-bold text-foreground">VPO Dashboard</h1>
						<p className="text-muted-foreground mt-1">Verifiable Prediction Oracle Network</p>
					</div>
					<div className="flex items-center gap-2">
						<Badge className="bg-green-500/10 text-green-500 border-green-500/20">
							<div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
							Network Online
						</Badge>
					</div>
				</div>

				<Tabs defaultValue="overview" className="space-y-6">
					<TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="markets">Markets</TabsTrigger>
						<TabsTrigger value="proofs">Proof Explorer</TabsTrigger>
						<TabsTrigger value="operators">Operators</TabsTrigger>
						<TabsTrigger value="developers">Developers</TabsTrigger>
						<TabsTrigger value="governance">Governance</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-6">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
							<StatCard title="Total Predictions" value="12,847" trend={12.5} icon={<Activity className="w-4 h-4 text-muted-foreground" />} />
							<StatCard title="Integrated Markets" value="247" trend={8.2} icon={<Globe className="w-4 h-4 text-muted-foreground" />} />
							<StatCard title="Active Jobs" value="42" icon={<Clock className="w-4 h-4 text-muted-foreground" />} />
							<StatCard title="Proofs Verified" value="99.8%" trend={0.3} icon={<Shield className="w-4 h-4 text-muted-foreground" />} />
							<StatCard title="$VPO Staked" value="2.4M" trend={15.7} icon={<Zap className="w-4 h-4 text-muted-foreground" />} />
						</div>

						<div className="grid gap-6 md:grid-cols-2">
							<Card className="md:col-span-2">
								<CardHeader>
									<CardTitle>Recent Resolutions</CardTitle>
									<CardDescription>Latest verified prediction outcomes</CardDescription>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Market</TableHead>
												<TableHead>Question</TableHead>
												<TableHead>Result</TableHead>
												<TableHead>Proof CID</TableHead>
												<TableHead>Timestamp</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{resolutions.map((resolution) => (
												<TableRow key={resolution.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedResolution(resolution)}>
													<TableCell>
														<Badge variant="outline">{resolution.market}</Badge>
													</TableCell>
													<TableCell className="max-w-xs truncate">{resolution.question}</TableCell>
													<TableCell>
														<Badge className={resolution.result === "Yes" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>{resolution.result}</Badge>
													</TableCell>
													<TableCell className="font-mono text-xs">{resolution.proofCID}</TableCell>
													<TableCell className="text-muted-foreground text-sm">{resolution.timestamp}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Resolutions Over Time</CardTitle>
									<CardDescription>Last 30 days</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
										<div className="text-center text-muted-foreground">
											<LineChart className="w-12 h-12 mx-auto mb-2" />
											<p className="text-sm">Line chart visualization</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Market Share</CardTitle>
									<CardDescription>By platform</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
										<div className="text-center text-muted-foreground">
											<PieChart className="w-12 h-12 mx-auto mb-2" />
											<p className="text-sm">Pie chart visualization</p>
											<div className="mt-4 space-y-2">
												<div className="flex items-center justify-between text-sm"><span>Polymarket</span><span className="font-semibold">65%</span></div>
												<div className="flex items-center justify-between text-sm"><span>Gnosis</span><span className="font-semibold">35%</span></div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="flex flex-wrap gap-4">
							<Button className="gap-2"><Plus className="w-4 h-4" />Create New Adapter</Button>
							<Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />View Proof Explorer</Button>
							<Button variant="outline" className="gap-2"><Zap className="w-4 h-4" />Run Test Job</Button>
						</div>
					</TabsContent>

					<TabsContent value="markets" className="space-y-6">
						<Card>
							<CardHeader><CardTitle>Market Filters</CardTitle></CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-4">
									<div className="flex-1 min-w-[200px]"><Label>Platform</Label>
										<Select value={platformFilter} onValueChange={setPlatformFilter}>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Platforms</SelectItem>
												<SelectItem value="Polymarket">Polymarket</SelectItem>
												<SelectItem value="Gnosis">Gnosis</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex-1 min-w-[200px]"><Label>Status</Label>
										<Select value={statusFilter} onValueChange={setStatusFilter}>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Status</SelectItem>
												<SelectItem value="Active">Active</SelectItem>
												<SelectItem value="Resolved">Resolved</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex-1 min-w-[200px]"><Label>Category</Label>
										<Select>
											<SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Categories</SelectItem>
												<SelectItem value="crypto">Crypto</SelectItem>
												<SelectItem value="politics">Politics</SelectItem>
												<SelectItem value="sports">Sports</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</CardContent>
						</Card>

						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{filteredMarkets.map((market) => (
								<Card key={market.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedMarket(market)}>
									<CardHeader>
										<div className="flex items-start justify-between gap-2">
											<CardTitle className="text-base line-clamp-2">{market.question}</CardTitle>
											<Badge variant="outline" className={market.status === "Active" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}>{market.status}</Badge>
										</div>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Platform</span><Badge variant="secondary">{market.platform}</Badge></div>
										<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Category</span><span className="font-medium">{market.category}</span></div>
										<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Result</span><span className="font-medium">{market.result}</span></div>
										<Separator />
										<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Proofs</span><span className="font-medium">{market.proofIds.length}</span></div>
									</CardContent>
								</Card>
							))}
						</div>

						<Dialog open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
							<DialogContent className="max-w-2xl">
								<DialogHeader>
									<DialogTitle>{selectedMarket?.question}</DialogTitle>
									<DialogDescription>Market Details and Verification</DialogDescription>
								</DialogHeader>
								{selectedMarket && (
									<div className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<div><Label>Platform</Label><p className="text-sm font-medium mt-1">{selectedMarket.platform}</p></div>
											<div><Label>Status</Label><p className="text-sm font-medium mt-1">{selectedMarket.status}</p></div>
											<div><Label>Category</Label><p className="text-sm font-medium mt-1">{selectedMarket.category}</p></div>
											<div><Label>Result</Label><p className="text-sm font-medium mt-1">{selectedMarket.result}</p></div>
										</div>
										<Separator />
										<div>
											<Label>Linked Proof IDs</Label>
											<div className="mt-2 space-y-2">
												{selectedMarket.proofIds.map((proofId) => (
													<div key={proofId} className="flex items-center justify-between p-2 border rounded-lg">
														<span className="font-mono text-sm">{proofId}</span>
														<Button size="sm" variant="ghost">View</Button>
													</div>
												))}
											</div>
										</div>
										<Button className="w-full">View Full Proof</Button>
									</div>
								)}
							</DialogContent>
						</Dialog>
					</TabsContent>

					<TabsContent value="proofs" className="space-y-6">
						<Card>
							<CardHeader><CardTitle>Search Proofs</CardTitle></CardHeader>
							<CardContent>
								<div className="flex gap-4">
									<div className="flex-1"><Input placeholder="Search by Market ID, Proof ID, or CID..." /></div>
									<Button variant="outline" className="gap-2"><Filter className="w-4 h-4" />Filters</Button>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader><CardTitle>Proof Verification Flow</CardTitle></CardHeader>
							<CardContent>
								<div className="flex items-center justify-center gap-4 p-8">
									<div className="text-center"><div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2"><Shield className="w-8 h-8 text-primary" /></div><p className="text-sm font-medium">VPO</p></div>
									<ChevronRight className="w-6 h-6 text-muted-foreground" />
									<div className="text-center"><div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-2"><Zap className="w-8 h-8 text-blue-500" /></div><p className="text-sm font-medium">EigenCloud</p></div>
									<ChevronRight className="w-6 h-6 text-muted-foreground" />
									<div className="text-center"><div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2"><CheckCircle2 className="w-8 h-8 text-green-500" /></div><p className="text-sm font-medium">Proof</p></div>
									<ChevronRight className="w-6 h-6 text-muted-foreground" />
									<div className="text-center"><div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-2"><Globe className="w-8 h-8 text-purple-500" /></div><p className="text-sm font-medium">Market</p></div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Verified Proofs</CardTitle>
								<CardDescription>All verified prediction proofs</CardDescription>
							</CardHeader>
							<CardContent>
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
										{proofs.map((proof) => (
											<TableRow key={proof.id}>
												<TableCell className="font-mono text-xs">{proof.jobId}</TableCell>
												<TableCell><Badge className="bg-green-500/10 text-green-500">{proof.result}</Badge></TableCell>
												<TableCell>{proof.computedBy}</TableCell>
												<TableCell className="text-sm text-muted-foreground">{proof.timestamp}</TableCell>
												<TableCell className="font-mono text-xs">{proof.ipfsCID}</TableCell>
												<TableCell>
													<div className="flex gap-2">
														<Button size="sm" variant="ghost" onClick={() => setSelectedProof(proof)}>Details</Button>
														<Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
							<DialogContent className="max-w-2xl">
								<DialogHeader>
									<DialogTitle>Proof Details</DialogTitle>
									<DialogDescription>Verification information</DialogDescription>
								</DialogHeader>
								{selectedProof && (
									<div className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<div><Label>Job ID</Label><p className="text-sm font-mono mt-1">{selectedProof.jobId}</p></div>
											<div><Label>Result</Label><p className="text-sm font-medium mt-1">{selectedProof.result}</p></div>
											<div><Label>Computed By</Label><p className="text-sm font-medium mt-1">{selectedProof.computedBy}</p></div>
											<div><Label>Timestamp</Label><p className="text-sm font-medium mt-1">{selectedProof.timestamp}</p></div>
										</div>
										<Separator />
										<div>
											<Label>IPFS CID</Label>
											<div className="flex items-center gap-2 mt-1">
												<code className="flex-1 p-2 bg-muted rounded text-sm">{selectedProof.ipfsCID}</code>
												<Button size="sm" variant="ghost"><Copy className="w-4 h-4" /></Button>
											</div>
										</div>
										<div>
											<Label>Signature</Label>
											<div className="flex items-center gap-2 mt-1">
												<code className="flex-1 p-2 bg-muted rounded text-sm truncate">{selectedProof.signature}</code>
												<Button size="sm" variant="ghost"><Copy className="w-4 h-4" /></Button>
											</div>
										</div>
										<div className="flex gap-2">
											<Button className="flex-1 gap-2"><ExternalLink className="w-4 h-4" />View on IPFS</Button>
											<Button variant="outline" className="flex-1 gap-2"><Shield className="w-4 h-4" />Verify Signature</Button>
										</div>
									</div>
								)}
							</DialogContent>
						</Dialog>
					</TabsContent>

					<TabsContent value="operators" className="space-y-6">
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between"><div><CardTitle>Operator Registry</CardTitle><CardDescription>Network node operators</CardDescription></div><Button className="gap-2"><Plus className="w-4 h-4" />Register Operator</Button></div>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Node ID</TableHead><TableHead>Staked</TableHead><TableHead>Jobs Completed</TableHead><TableHead>Completion Rate</TableHead><TableHead>Latency</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{operators.map((operator) => (
											<TableRow key={operator.id}>
												<TableCell className="font-medium">{operator.nodeId}</TableCell>
												<TableCell>{operator.staked}</TableCell>
												<TableCell>{operator.jobsCompleted.toLocaleString()}</TableCell>
												<TableCell>{operator.completionRate}%</TableCell>
												<TableCell>{operator.latency}</TableCell>
												<TableCell><Badge className={operator.status === "Online" ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"}>{operator.status}</Badge></TableCell>
												<TableCell><Button size="sm" variant="ghost">Details</Button></TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<div className="grid gap-4 md:grid-cols-3">
							<Card><CardHeader><CardTitle className="text-base">Average Completion Rate</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">98.5%</div><p className="text-xs text-muted-foreground mt-1">Across all operators</p></CardContent></Card>
							<Card><CardHeader><CardTitle className="text-base">Average Latency</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">48ms</div><p className="text-xs text-muted-foreground mt-1">Network average</p></CardContent></Card>
							<Card><CardHeader><CardTitle className="text-base">Total Rewards</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">27,910 VPO</div><p className="text-xs text-muted-foreground mt-1">Distributed this month</p></CardContent></Card>
						</div>
					</TabsContent>

					<TabsContent value="developers" className="space-y-6">
						<Card>
							<CardHeader><CardTitle>Quick Start</CardTitle><CardDescription>Get started with VPO integration</CardDescription></CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2"><h4 className="font-semibold">1. Install SDK</h4><div className="bg-muted p-3 rounded-lg font-mono text-sm">npm install @vpo/sdk</div></div>
								<div className="space-y-2"><h4 className="font-semibold">2. Initialize Client</h4><div className="bg-muted p-3 rounded-lg font-mono text-sm">{`const vpo = new VPOClient({ apiKey: 'your-api-key' });`}</div></div>
								<div className="space-y-2"><h4 className="font-semibold">3. Query Proof</h4><div className="bg-muted p-3 rounded-lg font-mono text-sm">{`const proof = await vpo.getProof('Qm...abc123');`}</div></div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader><CardTitle>API Playground</CardTitle><CardDescription>Test API endpoints</CardDescription></CardHeader>
							<CardContent className="space-y-4">
								<div><Label>Proof CID</Label><Input placeholder="Qm..." className="mt-1" /></div>
								<Button className="w-full">Fetch Proof</Button>
								<div><Label>Response</Label><Textarea className="mt-1 font-mono text-xs" rows={8} readOnly value={JSON.stringify({ jobId: "job_001", result: "Verified", timestamp: "2024-01-15T14:32:00Z", signature: "0x1234...5678" }, null, 2)} /></div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader><CardTitle>Code Examples</CardTitle></CardHeader>
							<CardContent className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-2"><Label>Solidity Integration</Label><Button size="sm" variant="ghost"><Copy className="w-4 h-4" /></Button></div>
									<div className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">{`interface IVPO {
  function verifyProof(bytes32 cid) external view returns (bool);
}

contract MyContract {
  IVPO public vpo;
  
  function checkMarket(bytes32 proofCID) public view returns (bool) {
    return vpo.verifyProof(proofCID);
  }
}`}</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="governance" className="space-y-6">
						<div className="grid gap-4 md:grid-cols-3">
							<Card><CardHeader><CardTitle className="text-base">Your Stake</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">50,000 VPO</div><p className="text-xs text-muted-foreground mt-1">Voting power: 2.1%</p></CardContent></Card>
							<Card><CardHeader><CardTitle className="text-base">Rewards Earned</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">1,250 VPO</div><p className="text-xs text-muted-foreground mt-1">This epoch</p></CardContent></Card>
							<Card><CardHeader><CardTitle className="text-base">Active Proposals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">2</div><p className="text-xs text-muted-foreground mt-1">Awaiting your vote</p></CardContent></Card>
						</div>

						<Card>
							<CardHeader><CardTitle>Active Proposals</CardTitle><CardDescription>Vote on network governance</CardDescription></CardHeader>
							<CardContent className="space-y-4">
								{proposals.map((proposal) => (
									<div key={proposal.id} className="border rounded-lg p-4 space-y-3">
										<div className="flex items-start justify-between"><div><h4 className="font-semibold">{proposal.title}</h4><p className="text-sm text-muted-foreground mt-1">Ends: {proposal.endDate}</p></div><Badge>{proposal.status}</Badge></div>
										<div className="space-y-2">
											<div className="flex items-center justify-between text-sm"><span>Yes: {proposal.votes.yes.toLocaleString()}</span><span>No: {proposal.votes.no.toLocaleString()}</span></div>
											<div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(proposal.votes.yes / (proposal.votes.yes + proposal.votes.no)) * 100}%` }} /></div>
										</div>
										<div className="flex gap-2"><Button className="flex-1" variant="outline">Vote Yes</Button><Button className="flex-1" variant="outline">Vote No</Button></div>
									</div>
								))}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				<footer className="border-t border-border pt-8 mt-12">
					<div className="grid gap-8 md:grid-cols-4">
						<div><h3 className="font-semibold mb-3">VPO Network</h3><p className="text-sm text-muted-foreground">Verifiable Prediction Oracle for decentralized markets</p></div>
						<div><h4 className="font-semibold mb-3">Resources</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><a href="#" className="hover:text-foreground">Documentation</a></li><li><a href="#" className="hover:text-foreground">API Reference</a></li><li><a href="#" className="hover:text-foreground">GitHub</a></li></ul></div>
						<div><h4 className="font-semibold mb-3">Community</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><a href="#" className="hover:text-foreground">Discord</a></li><li><a href="#" className="hover:text-foreground">Forum</a></li><li><a href="#" className="hover:text-foreground">Blog</a></li></ul></div>
						<div><h4 className="font-semibold mb-3">Follow Us</h4><div className="flex gap-3"><a href="#" className="text-muted-foreground hover:text-foreground"><Twitter className="w-5 h-5" /></a><a href="#" className="text-muted-foreground hover:text-foreground"><Github className="w-5 h-5" /></a><a href="#" className="text-muted-foreground hover:text-foreground"><MessageCircle className="w-5 h-5" /></a></div></div>
					</div>
					<Separator className="my-6" />
					<div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
						<p>© 2024 VPO Network. All rights reserved.</p>
						<div className="flex gap-4"><a href="#" className="hover:text-foreground">Privacy Policy</a><a href="#" className="hover:text-foreground">Terms of Service</a></div>
					</div>
				</footer>
			</div>
		</div>
	);
}

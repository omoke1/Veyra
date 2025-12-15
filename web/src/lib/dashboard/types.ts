export type MarketStatus = "Active" | "Resolved" | "Pending";

export interface MarketSummary {
	id: string;
	question: string;
	platform: string; // Polymarket, Gnosis, etc.
	status: MarketStatus;
	result: string; // "Yes", "No", "Pending"
	category: string;
	proofIds: string[]; // Linked proof IDs for verification
}

export type JobStage = "Fetch" | "Compute" | "Sign" | "Publish";
export type JobStatus = "Queued" | "Running" | "Succeeded" | "Failed";

export interface VerificationJob {
	id: string;
	marketId: string;
	stage: JobStage;
	startedAt: number;
	updatedAt: number;
	status: JobStatus;
	logsUrl?: string;
}

export interface Attestation {
	cid: string;
	marketId: string;
	outcome: boolean | null;
	timestamp: number;
	signers: string[];
	signatureValid: boolean | null;
	txHash?: string;
}

export interface Proof {
	id: string;
	jobId: string;
	result: string; // "Verified", etc.
	computedBy: string; // Node name
	timestamp: string; // Formatted timestamp
	ipfsCID: string;
	signature: string;
	marketId: string;
	rawTimestamp: number;
}

export interface Operator {
	id: string;
	nodeId: string;
	staked: string; // "50,000 VPO"
	jobsCompleted: number;
	lastHeartbeat: string; // "2 min ago"
	status: "Online" | "Offline";
	completionRate: number; // 99.8
	latency: string; // "45ms" or "N/A"
	rewards: string; // "12,450 VPO"
}

export interface Kpis {
	activeMarkets: number;
	pendingJobs: number;
	success24h: number;
	failed24h: number;
	p50LatencyMs: number;
	p95LatencyMs: number;
	attestations24h: number;
}




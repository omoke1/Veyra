export type MarketStatus = "Open" | "Closed" | "Resolved";

export interface MarketSummary {
	id: string;
	title: string;
	category: string;
	status: MarketStatus;
	deadline: number;
	oracleStatus: "Pending" | "Resolved" | "Unknown";
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

export interface Kpis {
	activeMarkets: number;
	pendingJobs: number;
	success24h: number;
	failed24h: number;
	p50LatencyMs: number;
	p95LatencyMs: number;
	attestations24h: number;
}



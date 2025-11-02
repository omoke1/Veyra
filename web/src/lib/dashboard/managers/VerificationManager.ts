import type { VerificationJob, JobStage, JobStatus } from "../types";

interface IndexerJob {
	id: string;
	requestId: string;
	marketRef: string;
	requester: string;
	status: string;
	stage: string;
	startedAt: number;
	updatedAt: number;
	fulfilledAt: number | null;
	txHash: string;
}

export class VerificationManager {
	async listRecent(): Promise<VerificationJob[]> {
		try {
			const res = await fetch("/api/jobs", {
				cache: "no-store",
			});

			if (res.ok) {
				const jobs: IndexerJob[] = await res.json();
				return jobs.map((j) => ({
					id: j.id,
					marketId: j.marketRef,
					stage: j.stage as JobStage,
					startedAt: j.startedAt,
					updatedAt: j.updatedAt,
					status: j.status as JobStatus,
					logsUrl: j.fulfilledAt ? undefined : undefined, // Could link to logs if available
				}));
			}
		} catch (error) {
			console.error("Error fetching jobs from API:", error);
		}

		// Fallback to empty array if API fails
		return [];
	}
}




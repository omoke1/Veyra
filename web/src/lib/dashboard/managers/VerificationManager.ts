import type { VerificationJob } from "../types";

export class VerificationManager {
	async listRecent(): Promise<VerificationJob[]> {
		const now = Date.now();
		return [
			{ id: "j-1", marketId: "m3", stage: "Sign", startedAt: now - 120000, updatedAt: now - 30000, status: "Running" },
			{ id: "j-2", marketId: "m4", stage: "Publish", startedAt: now - 86400000, updatedAt: now - 86300000, status: "Succeeded", logsUrl: "https://example.com/logs/j-2" },
			{ id: "j-3", marketId: "m7", stage: "Fetch", startedAt: now - 60000, updatedAt: now - 50000, status: "Queued" },
			{ id: "j-4", marketId: "m8", stage: "Compute", startedAt: now - 300000, updatedAt: now - 240000, status: "Running" },
			{ id: "j-5", marketId: "m9", stage: "Sign", startedAt: now - 1800000, updatedAt: now - 1720000, status: "Running" },
			{ id: "j-6", marketId: "m10", stage: "Publish", startedAt: now - 172800000, updatedAt: now - 172700000, status: "Succeeded", logsUrl: "https://example.com/logs/j-6" }
		];
	}
}




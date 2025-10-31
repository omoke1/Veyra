import type { VerificationJob } from "../types";

export class VerificationManager {
	async listRecent(): Promise<VerificationJob[]> {
		const now = Date.now();
		return [
			{ id: "j-1", marketId: "m-2", stage: "Sign", startedAt: now - 120000, updatedAt: now - 30000, status: "Running" },
			{ id: "j-2", marketId: "m-3", stage: "Publish", startedAt: now - 86400000, updatedAt: now - 86300000, status: "Succeeded", logsUrl: "https://example.com/logs/j-2" },
			{ id: "j-3", marketId: "m-1", stage: "Fetch", startedAt: now - 60000, updatedAt: now - 50000, status: "Queued" }
		];
	}
}



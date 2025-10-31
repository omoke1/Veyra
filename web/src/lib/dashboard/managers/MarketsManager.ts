import type { MarketSummary } from "../types";

export class MarketsManager {
	async listRecent(): Promise<MarketSummary[]> {
		// Mock data for Phase A
		return [
			{ id: "m-1", title: "BTC > 100K by Dec 31", category: "Crypto", status: "Open", deadline: Date.now() + 86400000, oracleStatus: "Pending" },
			{ id: "m-2", title: "ETH > 10K by Dec 31", category: "Crypto", status: "Closed", deadline: Date.now() - 3600000, oracleStatus: "Pending" },
			{ id: "m-3", title: "US Election: Candidate X wins", category: "Politics", status: "Resolved", deadline: Date.now() - 86400000 * 7, oracleStatus: "Resolved" }
		];
	}
}



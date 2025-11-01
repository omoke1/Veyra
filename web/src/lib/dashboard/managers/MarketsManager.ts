import type { MarketSummary } from "../types";

export class MarketsManager {
	async listRecent(): Promise<MarketSummary[]> {
		// Markets from external platforms (Polymarket, Gnosis, UMA) that we verify
		return [
			{
				id: "m1",
				question: "Will ETH reach $5000 by Q1 2025?",
				platform: "Polymarket",
				status: "Resolved",
				result: "No",
				category: "Crypto",
				proofIds: ["p1", "p2"]
			},
			{
				id: "m2",
				question: "Bitcoin halving before May 2024?",
				platform: "Gnosis",
				status: "Resolved",
				result: "Yes",
				category: "Crypto",
				proofIds: ["p3"]
			},
			{
				id: "m3",
				question: "US inflation rate below 3%?",
				platform: "UMA",
				status: "Active",
				result: "Pending",
				category: "Economics",
				proofIds: []
			},
			{
				id: "m4",
				question: "AI model surpasses GPT-4 in 2025?",
				platform: "Polymarket",
				status: "Active",
				result: "Pending",
				category: "Technology",
				proofIds: []
			},
			{
				id: "m5",
				question: "Will Bitcoin reach $100,000 by December 31, 2024?",
				platform: "Polymarket",
				status: "Resolved",
				result: "Yes",
				category: "Crypto",
				proofIds: ["p4", "p5", "p6"]
			},
			{
				id: "m6",
				question: "Will Ethereum surpass $5,000 by end of Q1 2025?",
				platform: "Gnosis",
				status: "Resolved",
				result: "No",
				category: "Crypto",
				proofIds: ["p7"]
			},
			{
				id: "m7",
				question: "Will AI regulation pass in the US Congress by June 2025?",
				platform: "Polymarket",
				status: "Active",
				result: "Pending",
				category: "Politics",
				proofIds: []
			},
			{
				id: "m8",
				question: "Will the average global temperature increase exceed 1.5°C in 2024?",
				platform: "Polymarket",
				status: "Active",
				result: "Pending",
				category: "Climate",
				proofIds: []
			},
			{
				id: "m9",
				question: "Will the Fed cut rates by more than 75bps in 2025?",
				platform: "UMA",
				status: "Active",
				result: "Pending",
				category: "Economics",
				proofIds: []
			}
		];
	}

	async getMarketById(id: string): Promise<MarketSummary | null> {
		const markets = await this.listRecent();
		return markets.find(m => m.id === id) || null;
	}
}




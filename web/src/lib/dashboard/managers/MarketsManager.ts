import type { MarketSummary } from "../types";

interface IndexerMarket {
	address: string;
	marketId: string;
	question: string;
	endTime: number;
	oracle: string;
	vault: string;
	createdAt: number;
}

export class MarketsManager {
	async listRecent(): Promise<MarketSummary[]> {
		try {
			// Try to fetch from API first
			const res = await fetch("/api/markets", {
				cache: "no-store",
			});

			if (res.ok) {
				const markets: IndexerMarket[] = await res.json();
				const now = Math.floor(Date.now() / 1000);
				
				return markets.map((m) => {
					const isResolved = m.endTime < now;
					return {
						id: m.address, // Use address as ID for now
						question: m.question,
						platform: "Veyra", // Our own markets
						status: isResolved ? "Resolved" : "Active",
						result: "Pending", // Would need to check resolutions table
						category: "Prediction Market",
						proofIds: [], // Would need to link from attestations
					} as MarketSummary;
				});
			}
		} catch (error) {
			console.error("Error fetching markets from API:", error);
		}

		// Fallback to mock data if API fails
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
		try {
			// Try to fetch from API first
			const res = await fetch(`/api/markets/${id}`, {
				cache: "no-store",
			});

			if (res.ok) {
				const market: IndexerMarket = await res.json();
				const now = Math.floor(Date.now() / 1000);
				const isResolved = market.endTime < now;

				return {
					id: market.address,
					question: market.question,
					platform: "Veyra",
					status: isResolved ? "Resolved" : "Active",
					result: "Pending",
					category: "Prediction Market",
					proofIds: [],
				} as MarketSummary;
			}
		} catch (error) {
			console.error("Error fetching market from API:", error);
		}

		// Fallback to searching in mock data
		const markets = await this.listRecent();
		return markets.find(m => m.id === id) || null;
	}
}




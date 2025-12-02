import type { MarketSummary } from "../types";

interface IndexerMarket {
	address: string;
	marketId: string;
	question: string;
	endTime: number;
	oracle: string;
	vault: string;
	status?: number; // 0=Trading, 1=PendingResolve, 2=Resolved
	outcome?: number; // 0=Short, 1=Long (only set when resolved)
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
				
				// Fetch adapter requests for all markets
				let requests: any[] = [];
				try {
					const requestsRes = await fetch("/api/adapter-requests", { cache: "no-store" });
					if (requestsRes.ok) {
						requests = await requestsRes.json();
					}
				} catch (e) {
					console.error("Error fetching adapter requests:", e);
				}

				return markets.map((m: IndexerMarket) => {
					// Map status numbers to display strings
					const statusDisplay = m.status === 2 ? "Resolved" :
					                      m.status === 1 ? "Pending" :
					                      "Active";
					
					// Map outcome to result
					let result = "Pending";
					if (m.status === 2 && m.outcome !== null && m.outcome !== undefined) {
						result = m.outcome === 1 ? "Long Wins" : "Short Wins";
					}
					
					// Find requests for this market
					const marketRequests = requests.filter((r: any) => r.marketRef === m.marketId);
					const proofIds = marketRequests.map((r: any) => r.requestId);

					return {
						id: m.address, // Use address as ID for now
						question: m.question,
						platform: "Veyra", // Our own markets
						status: statusDisplay,
						result: result,
						category: "Prediction Market",
						proofIds: proofIds,
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
				const market: any = await res.json();
				
				// Map status numbers to display strings
				const statusDisplay = market.status === 2 ? "Resolved" :
				                      market.status === 1 ? "Pending" :
				                      "Active";
				
				// Map outcome to result
				let result = "Pending";
				if (market.status === 2 && market.outcome !== null && market.outcome !== undefined) {
					result = market.outcome === 1 ? "Long Wins" : "Short Wins";
				}

				// Fetch adapter requests to find linked proofs
				let proofIds: string[] = [];
				try {
					const requestsRes = await fetch("/api/adapter-requests", { cache: "no-store" });
					if (requestsRes.ok) {
						const requests: any[] = await requestsRes.json();
						// Find requests for this market
						const marketRequests = requests.filter((r: any) => r.marketRef === market.marketId);
						proofIds = marketRequests.map((r: any) => r.requestId);
					}
				} catch (e) {
					console.error("Error fetching adapter requests:", e);
				}

				return {
					id: market.address,
					question: market.question,
					platform: "Veyra",
					status: statusDisplay,
					result: result,
					category: "Prediction Market",
					proofIds: proofIds,
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




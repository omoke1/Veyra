interface ExternalMarket {
	id: string;
	source: "UMA" | "Gnosis" | "Polymarket";
	marketId?: string;
	question?: string;
	questionId?: string;
	conditionId?: string;
	assertionId?: string;
	status: "Pending" | "Resolved";
	outcome?: number;
	outcomeSlotCount?: number;
	createdAt: number;
	resolvedAt?: number;
	blockNumber?: number;
	txHash?: string;
}

export interface ExternalMarketSummary {
	id: string;
	question: string;
	source: "UMA" | "Gnosis" | "Polymarket";
	status: "Pending" | "Resolved";
	outcome?: "YES" | "NO" | "Pending";
	verificationStatus?: "Pending" | "Fulfilled" | "Submitted";
	createdAt: number;
	resolvedAt?: number;
	txHash?: string;
}

export class ExternalMarketsManager {
	async listRecent(source?: string, status?: string): Promise<ExternalMarketSummary[]> {
		try {
			const params = new URLSearchParams();
			if (source) params.append("source", source);
			if (status) params.append("status", status);

			const url = `/api/external-markets${params.toString() ? `?${params.toString()}` : ""}`;
			const res = await fetch(url, {
				cache: "no-store",
			});

			if (res.ok) {
				const markets: ExternalMarket[] = await res.json();
				return markets.map((m) => ({
					id: m.id,
					question: m.question || m.questionId || m.conditionId || m.assertionId || "Unknown Market",
					source: m.source,
					status: m.status,
					outcome: m.outcome !== undefined 
						? (m.outcome === 1 ? "YES" : "NO")
						: "Pending",
					verificationStatus: m.status === "Resolved" ? "Submitted" : "Pending",
					createdAt: m.createdAt,
					resolvedAt: m.resolvedAt,
					txHash: m.txHash,
				}));
			}
		} catch (error) {
			console.error("Error fetching external markets:", error);
		}

		return [];
	}

	async getById(id: string): Promise<ExternalMarket | null> {
		try {
			const res = await fetch(`/api/external-markets/${id}`, {
				cache: "no-store",
			});

			if (res.ok) {
				return await res.json();
			}
		} catch (error) {
			console.error("Error fetching external market:", error);
		}

		return null;
	}
}


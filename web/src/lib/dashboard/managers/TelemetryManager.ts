import type { Kpis } from "../types";

interface IndexerKpis {
	totalMarkets: number;
	activeMarkets: number;
	resolvedMarkets: number;
	totalTrades: number;
}

export class TelemetryManager {
	async getKpis(): Promise<Kpis> {
		try {
			// Try to fetch from API first
			const res = await fetch("/api/kpis", {
				cache: "no-store",
			});

			if (res.ok) {
				const kpis: IndexerKpis = await res.json();
				return {
					activeMarkets: kpis.activeMarkets || 0,
					pendingJobs: 0, // Would need jobs endpoint
					success24h: 0, // Would need time-based aggregation
					failed24h: 0,
					p50LatencyMs: 0,
					p95LatencyMs: 0,
					attestations24h: 0, // Would need attestations endpoint
				};
			}
		} catch (error) {
			console.error("Error fetching KPIs from API:", error);
		}

		// Fallback to mock data if API fails
		return {
			activeMarkets: 12,
			pendingJobs: 3,
			success24h: 18,
			failed24h: 1,
			p50LatencyMs: 1200,
			p95LatencyMs: 4200,
			attestations24h: 15
		};
	}
}





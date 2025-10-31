import type { Kpis } from "../types";

export class TelemetryManager {
	async getKpis(): Promise<Kpis> {
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



/**
 * Data fetching for market resolution
 */

import type { Attestation } from "./attestation/types.js";

export interface DataSource {
	id: string;
	fetch: (marketId: string, question: string) => Promise<{ outcome: number; data: any }>;
}

/**
 * Mock data fetcher - replace with real data sources
 */
export class MockDataFetcher implements DataSource {
	id = "mock";

	async fetch(marketId: string, question: string): Promise<{ outcome: number; data: any }> {
		// Mock implementation - returns random outcome
		// In production, this would fetch from real data sources
		const outcome = Math.random() > 0.5 ? 1 : 0;
		
		return {
			outcome,
			data: {
				source: "mock",
				timestamp: Date.now(),
				confidence: 0.95,
			},
		};
	}
}

/**
 * Create attestation from fetched data
 */
export function createAttestationFromData(
	marketId: string,
	questionHash: string,
	outcome: number,
	sourceId: string,
	expirySeconds: number = 3600,
	nonce: bigint
): Attestation {
	const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;

	return {
		marketId,
		questionHash,
		outcome,
		sourceId,
		expiresAt,
		nonce,
	};
}


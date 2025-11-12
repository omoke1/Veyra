/**
 * IPFS utilities and helpers
 */

export { IPFSClient, type IPFSConfig } from "./client.js";

/**
 * Create proof object for IPFS storage
 */
export function createProofObject(
	marketId: string,
	question: string,
	outcome: number,
	sourceId: string,
	sources: string[],
	data: any
): {
	marketId: string;
	question: string;
	outcome: number;
	sourceId: string;
	sources: string[];
	timestamp: number;
	data: any;
} {
	return {
		marketId,
		question,
		outcome,
		sourceId,
		sources,
		timestamp: Math.floor(Date.now() / 1000),
		data,
	};
}


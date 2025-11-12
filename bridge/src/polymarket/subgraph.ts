/**
 * Polymarket Subgraph Client
 * For querying on-chain data
 * Docs: https://docs.polymarket.com/developers/subgraph/overview
 */

import { PolymarketSubgraphMarket } from "./types";

const SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/polymarket/polymarket";

export class PolymarketSubgraph {
	private subgraphUrl: string;

	constructor(subgraphUrl?: string) {
		this.subgraphUrl = subgraphUrl || SUBGRAPH_URL;
	}

	/**
	 * Query markets that need resolution
	 * Uses GraphQL to query the subgraph
	 */
	async getUnresolvedMarkets(limit: number = 100): Promise<PolymarketSubgraphMarket[]> {
		const query = `
			query GetUnresolvedMarkets($limit: Int!) {
				markets(
					where: { 
						condition: { resolved: false }
						active: true
					}
					first: $limit
					orderBy: endDate
					orderDirection: desc
				) {
					id
					question
					condition {
						id
						oracle
						outcomeSlotCount
						resolved
					}
					endDate
					active
				}
			}
		`;

		const response = await fetch(this.subgraphUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query,
				variables: { limit },
			}),
		});

		if (!response.ok) {
			throw new Error(`Subgraph error: ${response.statusText}`);
		}

		const data = await response.json() as { data?: { markets?: PolymarketSubgraphMarket[] } };
		return data.data?.markets || [];
	}

	/**
	 * Get market by condition ID
	 */
	async getMarketByConditionId(conditionId: string): Promise<PolymarketSubgraphMarket | null> {
		const query = `
			query GetMarketByCondition($conditionId: ID!) {
				markets(
					where: { condition: $conditionId }
					first: 1
				) {
					id
					question
					condition {
						id
						oracle
						outcomeSlotCount
						resolved
					}
					resolution {
						outcome
						timestamp
					}
					endDate
					active
				}
			}
		`;

		const response = await fetch(this.subgraphUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query,
				variables: { conditionId },
			}),
		});

		if (!response.ok) {
			throw new Error(`Subgraph error: ${response.statusText}`);
		}

		const data = await response.json() as { data?: { markets?: PolymarketSubgraphMarket[] } };
		return data.data?.markets?.[0] || null;
	}

	/**
	 * Get markets that are ready for resolution (past end date)
	 */
	async getMarketsReadyForResolution(limit: number = 50): Promise<PolymarketSubgraphMarket[]> {
		const now = Math.floor(Date.now() / 1000);
		
		const query = `
			query GetMarketsReadyForResolution($limit: Int!, $now: BigInt!) {
				markets(
					where: { 
						condition: { resolved: false }
						active: true
						endDate_lte: $now
					}
					first: $limit
					orderBy: endDate
					orderDirection: asc
				) {
					id
					question
					condition {
						id
						oracle
						outcomeSlotCount
						resolved
					}
					endDate
					active
				}
			}
		`;

		const response = await fetch(this.subgraphUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query,
				variables: { limit, now: now.toString() },
			}),
		});

		if (!response.ok) {
			throw new Error(`Subgraph error: ${response.statusText}`);
		}

		const data = await response.json() as { data?: { markets?: PolymarketSubgraphMarket[] } };
		return data.data?.markets || [];
	}
}


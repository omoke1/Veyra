/**
 * Polymarket API Types
 * Based on: https://docs.polymarket.com/quickstart/introduction/main
 */

export interface PolymarketMarket {
	id: string;
	question: string;
	slug: string;
	conditionId: string;
	endDate: string;
	image: string;
	active: boolean;
	resolved: boolean;
	resolution?: string;
	outcomes: string[];
	volume: string;
	liquidity: string;
	marketMakerAddress?: string;
}

export interface PolymarketEvent {
	id: string;
	title: string;
	slug: string;
	description: string;
	image: string;
	markets: PolymarketMarket[];
	startDate: string;
	endDate: string;
}

export interface PolymarketResolution {
	marketId: string;
	conditionId: string;
	outcome: string;
	resolved: boolean;
	resolutionDate?: string;
	umaAssertionId?: string;
}

export interface PolymarketSubgraphMarket {
	id: string;
	question: string;
	condition: {
		id: string;
		oracle: string;
		outcomeSlotCount: number;
		resolved: boolean;
	};
	resolution?: {
		outcome: string;
		timestamp: string;
	};
}


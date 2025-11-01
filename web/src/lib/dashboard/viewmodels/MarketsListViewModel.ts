import type { MarketSummary } from "../types";
import { MarketsManager } from "../managers/MarketsManager";

export class MarketsListViewModel {
	private readonly marketsManager: MarketsManager;
	private _items: MarketSummary[] = [];

	constructor(marketsManager: MarketsManager) {
		this.marketsManager = marketsManager;
	}

	get items(): MarketSummary[] {
		return this._items;
	}

	async load(): Promise<void> {
		this._items = await this.marketsManager.listRecent();
	}
}




import type { VerificationJob } from "../types";
import { VerificationManager } from "../managers/VerificationManager";

export class JobsListViewModel {
	private readonly verificationManager: VerificationManager;
	private _items: VerificationJob[] = [];

	constructor(verificationManager: VerificationManager) {
		this.verificationManager = verificationManager;
	}

	get items(): VerificationJob[] {
		return this._items;
	}

	async load(): Promise<void> {
		this._items = await this.verificationManager.listRecent();
	}
}




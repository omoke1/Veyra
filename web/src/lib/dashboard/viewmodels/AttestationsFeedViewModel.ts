import type { Attestation } from "../types";
import { AttestationManager } from "../managers/AttestationManager";

export class AttestationsFeedViewModel {
	private readonly attestationManager: AttestationManager;
	private _items: Attestation[] = [];

	constructor(attestationManager: AttestationManager) {
		this.attestationManager = attestationManager;
	}

	get items(): Attestation[] {
		return this._items;
	}

	async load(): Promise<void> {
		this._items = await this.attestationManager.listRecent();
	}
}




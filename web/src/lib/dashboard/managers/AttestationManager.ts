import type { Attestation } from "../types";

export class AttestationManager {
	async listRecent(): Promise<Attestation[]> {
		const now = Math.floor(Date.now() / 1000);
		return [
			{ cid: "Qmabc123", marketId: "m-3", outcome: true, timestamp: now - 86000, signers: ["0xSigner1"], signatureValid: true, txHash: "0xhash1" },
			{ cid: "Qmdef456", marketId: "m-2", outcome: null, timestamp: now - 600, signers: [], signatureValid: null }
		];
	}
}



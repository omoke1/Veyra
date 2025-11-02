import type { Attestation, Proof } from "../types";

interface IndexerAttestation {
	id: string;
	requestId: string;
	marketRef: string;
	attestationCid: string;
	outcome: number;
	fulfiller: string;
	blockNumber: number;
	txHash: string;
	createdAt: number;
}

export class AttestationManager {
	async listRecent(): Promise<Attestation[]> {
		try {
			const res = await fetch("/api/attestations", {
				cache: "no-store",
			});

			if (res.ok) {
				const atts: IndexerAttestation[] = await res.json();
				return atts.map((a) => ({
					cid: a.attestationCid,
					marketId: a.marketRef,
					outcome: a.outcome === 1 ? true : a.outcome === 0 ? false : null,
					timestamp: a.createdAt > 1e10 ? Math.floor(a.createdAt / 1000) : a.createdAt, // Convert to seconds if in ms
					signers: [a.fulfiller],
					signatureValid: true,
					txHash: a.txHash,
				}));
			}
		} catch (error) {
			console.error("Error fetching attestations from API:", error);
		}

		// Fallback to empty array if API fails
		return [];
	}

	async listProofs(): Promise<Proof[]> {
		try {
			const res = await fetch("/api/attestations", {
				cache: "no-store",
			});

			if (res.ok) {
				const atts: IndexerAttestation[] = await res.json();
				const now = new Date();
				return atts.map((a, idx) => {
					const timestamp = new Date(a.createdAt > 1e10 ? a.createdAt : a.createdAt * 1000); // Handle both ms and s
					return {
						id: a.id,
						jobId: a.requestId.substring(0, 20),
						result: "Verified",
						computedBy: a.fulfiller.substring(0, 10),
						timestamp: timestamp.toISOString().replace("T", " ").slice(0, 19),
						ipfsCID: a.attestationCid.length > 20 ? `${a.attestationCid.substring(0, 10)}...${a.attestationCid.substring(a.attestationCid.length - 10)}` : a.attestationCid,
						signature: a.txHash.substring(0, 20) + "...",
						marketId: a.marketRef,
					};
				});
			}
		} catch (error) {
			console.error("Error fetching proofs from API:", error);
		}

		// Fallback to empty array if API fails
		return [];
	}

	async getProofById(id: string): Promise<Proof | null> {
		const proofs = await this.listProofs();
		return proofs.find(p => p.id === id) || null;
	}
}




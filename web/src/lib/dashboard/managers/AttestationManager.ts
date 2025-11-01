import type { Attestation, Proof } from "../types";

export class AttestationManager {
	async listRecent(): Promise<Attestation[]> {
		const now = Math.floor(Date.now() / 1000);
		return [
			{ cid: "Qmabc123def456", marketId: "m5", outcome: true, timestamp: now - 3600, signers: ["0xSigner1", "0xSigner2"], signatureValid: true, txHash: "0xhash1" },
			{ cid: "Qmdef456ghi789", marketId: "m11", outcome: true, timestamp: now - 7200, signers: ["0xSigner3"], signatureValid: true, txHash: "0xhash2" },
			{ cid: "Qmghi789jkl012", marketId: "m1", outcome: false, timestamp: now - 10800, signers: ["0xSigner1", "0xSigner4"], signatureValid: true, txHash: "0xhash3" },
			{ cid: "Qmjkl012mno345", marketId: "m2", outcome: true, timestamp: now - 14400, signers: ["0xSigner2"], signatureValid: true, txHash: "0xhash4" },
			{ cid: "Qmmno345pqr678", marketId: "m6", outcome: false, timestamp: now - 18000, signers: ["0xSigner5", "0xSigner6"], signatureValid: true, txHash: "0xhash5" },
			{ cid: "Qmpqr678stu901", marketId: "m5", outcome: true, timestamp: now - 21600, signers: ["0xSigner1"], signatureValid: true, txHash: "0xhash6" }
		];
	}

	async listProofs(): Promise<Proof[]> {
		const now = new Date();
		return [
			{
				id: "p1",
				jobId: "job_001",
				result: "Verified",
				computedBy: "Node_Alpha",
				timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19),
				ipfsCID: "Qm...abc123",
				signature: "0x1234...5678",
				marketId: "m1"
			},
			{
				id: "p2",
				jobId: "job_002",
				result: "Verified",
				computedBy: "Node_Beta",
				timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19),
				ipfsCID: "Qm...def456",
				signature: "0x5678...9abc",
				marketId: "m1"
			},
			{
				id: "p3",
				jobId: "job_003",
				result: "Verified",
				computedBy: "Node_Gamma",
				timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19),
				ipfsCID: "Qm...ghi789",
				signature: "0x9abc...def0",
				marketId: "m2"
			}
		];
	}

	async getProofById(id: string): Promise<Proof | null> {
		const proofs = await this.listProofs();
		return proofs.find(p => p.id === id) || null;
	}
}




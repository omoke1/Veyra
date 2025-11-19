const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export interface QuorumStatus {
	isQuorumReached: boolean;
	yesWeight: bigint;
	noWeight: bigint;
	requiredWeight: bigint;
	totalWeight: bigint;
	quorumThreshold: number;
}

export interface Attestation {
	operator: string;
	outcome: boolean;
	attestationCid: string;
	signature: string;
	timestamp: number;
}

export interface Operator {
	address: string;
	weight: bigint;
	hasAttested: boolean;
	outcome?: boolean;
	timestamp?: number;
	signature?: string;
}

export class QuorumManager {
	async getQuorumStatus(requestId: string): Promise<QuorumStatus | null> {
		try {
			const res = await fetch(`${INDEXER_URL}/quorum/${requestId}`);
			if (!res.ok) return null;
			const data = await res.json();
			return {
				isQuorumReached: data.isQuorumReached,
				yesWeight: BigInt(data.yesWeight || 0),
				noWeight: BigInt(data.noWeight || 0),
				requiredWeight: BigInt(data.requiredWeight || 0),
				totalWeight: BigInt(data.totalWeight || 0),
				quorumThreshold: data.quorumThreshold || 66,
			};
		} catch {
			return null;
		}
	}

	async getAttestations(requestId: string): Promise<Attestation[]> {
		try {
			const res = await fetch(`${INDEXER_URL}/attestations/${requestId}`);
			if (!res.ok) return [];
			return await res.json();
		} catch {
			return [];
		}
	}

	async getOperators(): Promise<Operator[]> {
		try {
			const res = await fetch(`${INDEXER_URL}/operators`);
			if (!res.ok) return [];
			const data = await res.json();
			return data.map((op: any) => ({
				address: op.address,
				weight: BigInt(op.weight || 0),
				hasAttested: op.hasAttested || false,
				outcome: op.outcome,
				timestamp: op.timestamp,
				signature: op.signature,
			}));
		} catch {
			return [];
		}
	}

	async getOperatorsForRequest(requestId: string): Promise<Operator[]> {
		const [operators, attestations] = await Promise.all([
			this.getOperators(),
			this.getAttestations(requestId),
		]);

		const attestationMap = new Map(
			attestations.map((att) => [att.operator.toLowerCase(), att])
		);

		return operators.map((op) => {
			const attestation = attestationMap.get(op.address.toLowerCase());
			return {
				...op,
				hasAttested: !!attestation,
				outcome: attestation?.outcome,
				timestamp: attestation?.timestamp,
				signature: attestation?.signature,
			};
		});
	}
}


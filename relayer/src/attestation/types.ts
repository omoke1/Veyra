/**
 * Attestation types and interfaces
 */

export interface Attestation {
	marketId: string;
	questionHash: string;
	outcome: number; // 0 or 1
	sourceId: string;
	expiresAt: number; // Unix timestamp
	nonce: bigint;
}

export interface EIP712Domain {
	name: string;
	version: string;
	chainId: bigint;
	verifyingContract: string;
}

export interface AttestationWithSignature {
	attestation: Attestation;
	signature: string;
	ipfsCid?: string;
}


/**
 * Submit attestations to the VPOOracleRelayer contract
 */

import { ethers } from "ethers";
import type { Attestation } from "./attestation/types.js";

// Contract interface
type RelayerContract = ethers.Contract & {
	fulfillAttestation: (
		attestation: {
			marketId: string;
			questionHash: string;
			outcome: number;
			sourceId: string;
			expiresAt: bigint;
			nonce: bigint;
		},
		signature: string,
		ipfsCid: string
	) => Promise<ethers.ContractTransactionResponse>;
	isNonceUsed: (nonce: bigint) => Promise<boolean>;
};

export interface SubmitResult {
	success: boolean;
	txHash?: string;
	error?: string;
}

/**
 * Submit a signed attestation to the contract
 */
export async function submitAttestation(
	contract: RelayerContract,
	attestation: Attestation,
	signature: string,
	ipfsCid: string
): Promise<SubmitResult> {
	try {
		// Convert attestation to contract format
		const attestationStruct = {
			marketId: attestation.marketId,
			questionHash: attestation.questionHash,
			outcome: attestation.outcome,
			sourceId: attestation.sourceId,
			expiresAt: BigInt(attestation.expiresAt),
			nonce: attestation.nonce,
		};

		// Submit to contract
		const tx = await contract.fulfillAttestation(
			attestationStruct,
			signature,
			ipfsCid
		);

		const receipt = await tx.wait();

		return {
			success: true,
			txHash: receipt?.hash,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Unknown error",
		};
	}
}

/**
 * Check if nonce has been used
 */
export async function isNonceUsed(
	contract: RelayerContract,
	nonce: bigint
): Promise<boolean> {
	try {
		return await contract.isNonceUsed(nonce);
	} catch {
		return false;
	}
}


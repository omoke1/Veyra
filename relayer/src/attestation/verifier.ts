/**
 * Attestation verification utilities
 */

import { ethers } from "ethers";
import type { Attestation } from "./types.js";
import { verifyAttestationSignature } from "./signer.js";

/**
 * Verify attestation is valid (not expired, signature valid)
 */
export function verifyAttestation(
	attestation: Attestation,
	signature: string,
	chainId: bigint,
	verifyingContract: string,
	signerAddress: string
): { valid: boolean; reason?: string } {
	// Check expiry
	const now = BigInt(Math.floor(Date.now() / 1000));
	if (BigInt(attestation.expiresAt) < now) {
		return { valid: false, reason: "Attestation expired" };
	}

	// Verify signature
	const signatureValid = verifyAttestationSignature(
		attestation,
		signature,
		chainId,
		verifyingContract,
		signerAddress
	);

	if (!signatureValid) {
		return { valid: false, reason: "Invalid signature" };
	}

	return { valid: true };
}

/**
 * Validate attestation data
 */
export function validateAttestation(attestation: Attestation): { valid: boolean; reason?: string } {
	if (!attestation.marketId || attestation.marketId.length !== 66) {
		return { valid: false, reason: "Invalid marketId" };
	}

	if (!attestation.questionHash || attestation.questionHash.length !== 66) {
		return { valid: false, reason: "Invalid questionHash" };
	}

	if (attestation.outcome !== 0 && attestation.outcome !== 1) {
		return { valid: false, reason: "Outcome must be 0 or 1" };
	}

	if (!attestation.sourceId || attestation.sourceId.length === 0) {
		return { valid: false, reason: "SourceId is required" };
	}

	if (attestation.expiresAt <= 0) {
		return { valid: false, reason: "Invalid expiresAt" };
	}

	if (attestation.nonce < 0n) {
		return { valid: false, reason: "Invalid nonce" };
	}

	return { valid: true };
}


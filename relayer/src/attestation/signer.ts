/**
 * EIP-712 Attestation Signing
 */

import { ethers } from "ethers";
import type { Attestation, EIP712Domain } from "./types.js";

const ATTESTATION_TYPEHASH = ethers.keccak256(
	ethers.toUtf8Bytes(
		"Attestation(bytes32 marketId,bytes32 questionHash,uint8 outcome,string sourceId,uint256 expiresAt,uint256 nonce)"
	)
);

/**
 * Calculate EIP-712 domain separator
 */
export function getDomainSeparator(
	chainId: bigint,
	verifyingContract: string
): string {
	const domain: EIP712Domain = {
		name: "VPOOracleRelayer",
		version: "1",
		chainId,
		verifyingContract,
	};

	const domainTypeHash = ethers.keccak256(
		ethers.toUtf8Bytes(
			"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
		)
	);

	const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
		["bytes32", "bytes32", "bytes32", "uint256", "address"],
		[
			domainTypeHash,
			ethers.keccak256(ethers.toUtf8Bytes(domain.name)),
			ethers.keccak256(ethers.toUtf8Bytes(domain.version)),
			domain.chainId,
			domain.verifyingContract,
		]
	);

	return ethers.keccak256(encoded);
}

/**
 * Create the struct hash for an attestation
 */
export function getAttestationStructHash(attestation: Attestation): string {
	const sourceIdHash = ethers.keccak256(ethers.toUtf8Bytes(attestation.sourceId));

	const structHash = ethers.keccak256(
		ethers.AbiCoder.defaultAbiCoder().encode(
			["bytes32", "bytes32", "bytes32", "uint8", "bytes32", "uint256", "uint256"],
			[
				ATTESTATION_TYPEHASH,
				attestation.marketId,
				attestation.questionHash,
				attestation.outcome,
				sourceIdHash,
				attestation.expiresAt,
				attestation.nonce,
			]
		)
	);

	return structHash;
}

/**
 * Sign an attestation using EIP-712
 */
export async function signAttestation(
	attestation: Attestation,
	signer: ethers.Wallet,
	chainId: bigint,
	verifyingContract: string
): Promise<string> {
	const domainSeparator = getDomainSeparator(chainId, verifyingContract);
	const structHash = getAttestationStructHash(attestation);

	// Create the final hash: keccak256("\x19\x01" || domainSeparator || structHash)
	const messageHash = ethers.keccak256(
		ethers.concat([
			ethers.toUtf8Bytes("\x19\x01"),
			domainSeparator,
			structHash,
		])
	);

	// Sign the hash directly (not as a message, as it's already hashed)
	const signature = await signer.signingKey.sign(ethers.getBytes(messageHash));
	return ethers.Signature.from(signature).serialized;
}

/**
 * Create a complete attestation with signature
 */
export async function createSignedAttestation(
	attestation: Attestation,
	signer: ethers.Wallet,
	chainId: bigint,
	verifyingContract: string,
	ipfsCid?: string
): Promise<{ attestation: Attestation; signature: string; ipfsCid?: string }> {
	const signature = await signAttestation(attestation, signer, chainId, verifyingContract);

	return {
		attestation,
		signature,
		ipfsCid,
	};
}

/**
 * Verify an attestation signature
 */
export function verifyAttestationSignature(
	attestation: Attestation,
	signature: string,
	chainId: bigint,
	verifyingContract: string,
	expectedSigner: string
): boolean {
	const domainSeparator = getDomainSeparator(chainId, verifyingContract);
	const structHash = getAttestationStructHash(attestation);

	const messageHash = ethers.keccak256(
		ethers.concat([
			ethers.toUtf8Bytes("\x19\x01"),
			domainSeparator,
			structHash,
		])
	);

	try {
		// Recover address from signature (messageHash is already hashed)
		const sig = ethers.Signature.from(signature);
		const recoveredAddress = ethers.recoverAddress(ethers.getBytes(messageHash), sig);
		return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
	} catch {
		return false;
	}
}


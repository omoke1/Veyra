/**
 * EIP-712 signing helpers for tests
 * Matches the logic in relayer/src/attestation/signer.ts
 */

import { ethers } from "ethers";

export interface Attestation {
	marketId: string;
	questionHash: string;
	outcome: number;
	sourceId: string;
	expiresAt: bigint;
	nonce: bigint;
}

const ATTESTATION_TYPEHASH = ethers.keccak256(
	ethers.toUtf8Bytes(
		"Attestation(bytes32 marketId,bytes32 questionHash,uint8 outcome,string sourceId,uint256 expiresAt,uint256 nonce)"
	)
);

/**
 * Calculate EIP-712 domain separator (matches contract logic)
 */
export function getDomainSeparator(
	chainId: bigint,
	verifyingContract: string
): string {
	const domainTypeHash = ethers.keccak256(
		ethers.toUtf8Bytes(
			"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
		)
	);

	const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
		["bytes32", "bytes32", "bytes32", "uint256", "address"],
		[
			domainTypeHash,
			ethers.keccak256(ethers.toUtf8Bytes("VPOOracleRelayer")),
			ethers.keccak256(ethers.toUtf8Bytes("1")),
			chainId,
			verifyingContract,
		]
	);

	return ethers.keccak256(encoded);
}

/**
 * Create the struct hash for an attestation (matches contract logic)
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
	signer: ethers.Wallet | any, // Accept Hardhat signer or Wallet
	chainId: bigint,
	verifyingContract: string
): Promise<string> {
	const domainSeparator = getDomainSeparator(chainId, verifyingContract);
	const structHash = getAttestationStructHash(attestation);

	// Create the final hash: keccak256("\x19\x01" || domainSeparator || structHash)
	// Match the relayer service implementation exactly
	const messageHash = ethers.keccak256(
		ethers.concat([
			ethers.toUtf8Bytes("\x19\x01"),
			domainSeparator,
			structHash,
		])
	);

	// Sign the hash directly (not as a message, as it's already hashed)
	let signature: string;
	
	if (signer.signingKey) {
		// Wallet with signingKey (ethers.Wallet)
		const sig = await signer.signingKey.sign(ethers.getBytes(messageHash));
		signature = ethers.Signature.from(sig).serialized;
	} else {
		// Hardhat signer - use the signer's provider to get the account's private key
		// Hardhat exposes accounts through the provider, but we need the private key
		// For Hardhat, we can use the signer's address to look up the account
		// and use Hardhat's account system to derive the private key
		const address = await signer.getAddress();
		
		// Hardhat uses deterministic accounts - try common mnemonics and derivation paths
		const mnemonics = [
			"test test test test test test test test test test test junk", // Standard Hardhat
			"myth like bonus scare over problem client lizard pioneer submit female collect", // Another common one
		];
		
		let derivedWallet: ethers.HDNodeWallet | null = null;
		
		for (const mnemonic of mnemonics) {
			try {
				const rootNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
				// Try first 20 account indices
				for (let i = 0; i < 20; i++) {
					try {
						const testWallet = rootNode.derivePath(`44'/60'/0'/0/${i}`);
						if (testWallet.address.toLowerCase() === address.toLowerCase()) {
							derivedWallet = testWallet;
							break;
						}
					} catch {
						// Continue
					}
				}
				if (derivedWallet) break;
			} catch {
				// Try next mnemonic
			}
		}
		
		if (!derivedWallet) {
			// Hardhat uses a specific account generation - try to get private key from Hardhat's account system
			// Hardhat generates accounts deterministically but we need to find the right derivation
			// Try using Hardhat's default account generation which uses a specific seed
			// The accounts are generated using: keccak256("mnemonic" + accountIndex)
			// But actually Hardhat uses HD wallet derivation with a specific mnemonic
			
			// Last resort: Try to use the signer's provider to impersonate and sign
			// But ethers v6 doesn't support this directly
			
			// For now, throw a helpful error suggesting to use Wallet instances
			throw new Error(
				`Could not derive wallet for address ${address}. ` +
				`Hardhat signers don't expose private keys. ` +
				`For EIP-712 signing in tests, create ethers.Wallet instances from known private keys ` +
				`or use Hardhat's account system with the correct mnemonic.`
			);
		}
		
		// Sign with the derived wallet
		const sig = await derivedWallet.signingKey.sign(ethers.getBytes(messageHash));
		signature = ethers.Signature.from(sig).serialized;
	}

	return signature;
}

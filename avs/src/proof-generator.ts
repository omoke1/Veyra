/**
 * EigenVerify Proof Generator
 * 
 * Generates EigenVerify proofs for computations used in market resolution.
 * Each proof includes:
 * - Data source hash
 * - Computation code hash
 * - Output result hash
 * - Signature from the generator
 */

import { ethers } from "ethers";
import * as crypto from "crypto";

/**
 * Structure for EigenVerify proof components
 */
export interface ProofComponents {
	dataSourceHash: string; // Hash of the data source(s) used
	computationCodeHash: string; // Hash of the computation logic/code
	outputResultHash: string; // Hash of the output result
	signature: string; // Signature from the proof generator
}

/**
 * Structure for data specification components
 */
export interface DataSpecComponents {
	dataSourceId: string; // Identifier for the data source
	queryLogic: string; // Encoded query logic/computation code
	timestamp: number; // Timestamp for data snapshot
	expectedResult: string; // Expected result (e.g., "YES", "NO")
}

/**
 * Generate EigenVerify proof from computation data
 * @param dataSources Array of data source identifiers
 * @param queryLogic The computation logic/code
 * @param result The computed result (e.g., "YES", "NO")
 * @param timestamp Timestamp for data snapshot
 * @param signer Wallet to sign the proof
 * @returns Proof bytes encoded for on-chain verification
 */
export async function generateEigenVerifyProof(
	dataSources: string[],
	queryLogic: string,
	result: string,
	timestamp: number,
	signer: ethers.Wallet
): Promise<{ proof: Uint8Array; dataSpec: Uint8Array }> {
	// 1. Compute data source hash
	const dataSourceId = dataSources.join(",");
	const dataSourceHash = ethers.keccak256(
		ethers.solidityPacked(["string", "uint256"], [dataSourceId, timestamp])
	);

	// 2. Compute computation code hash
	const computationCodeHash = ethers.keccak256(ethers.toUtf8Bytes(queryLogic));

	// 3. Compute output result hash
	const outputResultHash = ethers.keccak256(ethers.toUtf8Bytes(result));

	// 4. Create proof message (first 96 bytes: 3 hashes)
	const proofHeader = ethers.concat([
		ethers.getBytes(dataSourceHash),
		ethers.getBytes(computationCodeHash),
		ethers.getBytes(outputResultHash),
	]);

	// 5. Sign the proof header (matching EigenVerify contract's _recoverSigner)
	// The contract expects: keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(message)))
	// signMessage already does this, so we just need to sign the keccak256 of the proof header
	const proofHeaderHash = ethers.keccak256(proofHeader);
	// signMessage adds "\x19Ethereum Signed Message:\n" + length prefix automatically
	const signature = await signer.signMessage(ethers.getBytes(proofHeaderHash));

	// 6. Encode proof: 32 bytes (dataSourceHash) + 32 bytes (computationCodeHash) + 32 bytes (outputResultHash) + 65 bytes (signature)
	const proofBytes = ethers.concat([
		ethers.getBytes(dataSourceHash),
		ethers.getBytes(computationCodeHash),
		ethers.getBytes(outputResultHash),
		ethers.getBytes(signature),
	]);

	// 7. Encode data specification
	const dataSpec = encodeDataSpec({
		dataSourceId,
		queryLogic,
		timestamp,
		expectedResult: result,
	});

	return {
		proof: ethers.getBytes(proofBytes),
		dataSpec: ethers.getBytes(dataSpec),
	};
}

/**
 * Encode data specification for on-chain verification
 * Format: 32 bytes (dataSourceId as bytes32) + 32 bytes (timestamp as uint256) + 32 bytes (queryLogic length) + queryLogic bytes + result string
 */
function encodeDataSpec(spec: DataSpecComponents): string {
	const abiCoder = new ethers.AbiCoder();
	return abiCoder.encode(
		["string", "string", "uint256", "string"],
		[spec.dataSourceId, spec.queryLogic, spec.timestamp, spec.expectedResult]
	);
}

/**
 * Verify proof locally (for testing/debugging)
 * @param proof Proof bytes
 * @param dataSpec Data specification bytes
 * @returns Whether the proof structure is valid
 */
export function verifyProofStructure(proof: Uint8Array): boolean {
	// Minimum proof length: 3 hashes (96 bytes) + signature (65 bytes) = 161 bytes
	if (proof.length < 161) {
		return false;
	}

	// Check that all components are present
	const dataSourceHash = proof.slice(0, 32);
	const computationCodeHash = proof.slice(32, 64);
	const outputResultHash = proof.slice(64, 96);
	const signature = proof.slice(96, 161);

	// All components should be non-zero (basic check)
	const hasValidHashes = 
		!dataSourceHash.every(b => b === 0) &&
		!computationCodeHash.every(b => b === 0) &&
		!outputResultHash.every(b => b === 0);

	const hasValidSignature = signature.length === 65;

	return hasValidHashes && hasValidSignature;
}


import { ethers } from "hardhat";
import { Signer } from "ethers";

/**
 * Helper function to generate a valid EigenVerify proof for testing
 * This creates a proof that will pass EigenVerify verification
 */
export async function generateValidProof(
	signer: Signer,
	dataSourceId: string,
	queryLogic: string,
	result: string,
	timestamp: number
): Promise<{ proof: Uint8Array; dataSpec: Uint8Array }> {
	// 1. Compute hashes
	const dataSourceHash = ethers.keccak256(
		ethers.solidityPacked(["string", "uint256"], [dataSourceId, timestamp])
	);
	const computationCodeHash = ethers.keccak256(ethers.toUtf8Bytes(queryLogic));
	const outputResultHash = ethers.keccak256(ethers.toUtf8Bytes(result));

	// 2. Create proof header
	const proofHeader = ethers.concat([
		ethers.getBytes(dataSourceHash),
		ethers.getBytes(computationCodeHash),
		ethers.getBytes(outputResultHash),
	]);

	// 3. Sign proof header
	// signMessage adds "\x19Ethereum Signed Message:\n" + length prefix, matching contract's _recoverSigner
	const proofHeaderHash = ethers.keccak256(proofHeader);
	const signature = await signer.signMessage(ethers.getBytes(proofHeaderHash));

	// 4. Encode proof
	const proofBytes = ethers.concat([
		ethers.getBytes(dataSourceHash),
		ethers.getBytes(computationCodeHash),
		ethers.getBytes(outputResultHash),
		ethers.getBytes(signature),
	]);

	// 5. Encode dataSpec
	// Use zeroPadBytes (right padding) so string bytes come first, then trailing zeros
	// This matches the contract's expectation which trims null bytes from the right
	const dataSourceIdBytes = ethers.zeroPadBytes(ethers.toUtf8Bytes(dataSourceId), 32);
	const timestampBytes = ethers.zeroPadValue(ethers.toBeHex(timestamp, 32), 32);
	const queryLogicBytes = ethers.toUtf8Bytes(queryLogic);
	const queryLogicLengthBytes = ethers.zeroPadValue(ethers.toBeHex(queryLogicBytes.length, 32), 32);
	const resultBytes = ethers.toUtf8Bytes(result);
	const resultPadded = ethers.concat([resultBytes, new Uint8Array(1)]);
	
	const dataSpec = ethers.concat([
		dataSourceIdBytes,
		timestampBytes,
		queryLogicLengthBytes,
		queryLogicBytes,
		resultPadded,
	]);

	return {
		proof: ethers.getBytes(proofBytes),
		dataSpec: ethers.getBytes(dataSpec),
	};
}


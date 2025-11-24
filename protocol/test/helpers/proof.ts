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
	// Use abi.encode to match contract's _constructDataSpec
	const dataSpec = ethers.AbiCoder.defaultAbiCoder().encode(
		["string", "string", "uint256", "string"],
		[dataSourceId, queryLogic, timestamp, result]
	);

	// Note: We don't need to manually pad dataSourceId or result anymore because abi.encode handles strings correctly.
	// However, EigenVerify.sol _decodeDataSpec converts string dataSourceId to bytes32.
	// We should ensure dataSourceId is short enough or handled correctly.
	// But for abi.encode, we just pass the string.

	return {
		proof: ethers.getBytes(proofBytes),
		dataSpec: ethers.getBytes(dataSpec),
	};
}


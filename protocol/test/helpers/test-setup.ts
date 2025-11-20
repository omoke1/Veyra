import { ethers } from "hardhat";
import { VPOAdapter, EigenVerify, Slashing } from "../../typechain-types";
import { Signer } from "ethers";
import { generateValidProof } from "./proof";

/**
 * Set up test environment with EigenVerify, Slashing, and VPOAdapter
 */
export async function setupTestContracts(admin: Signer, avsNode: Signer) {
	// Deploy EigenVerify
	const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
	const eigenVerify = await EigenVerifyFactory.connect(admin).deploy(await admin.getAddress());
	await eigenVerify.waitForDeployment();

	// Deploy Slashing with zero address (will set after adapter deployment)
	const SlashingFactory = await ethers.getContractFactory("Slashing");
	const slashing = await SlashingFactory.connect(admin).deploy(ethers.ZeroAddress);
	await slashing.waitForDeployment();

	// Deploy VPOAdapter
	const VPOAdapterFactory = await ethers.getContractFactory("VPOAdapter");
	const adapter = await VPOAdapterFactory.connect(admin).deploy(
		await admin.getAddress(),
		await eigenVerify.getAddress(),
		await slashing.getAddress()
	);
	await adapter.waitForDeployment();

	// Update Slashing to use VPOAdapter address
	await slashing.connect(admin).setAVS(await adapter.getAddress());

	// Add AVS node
	await adapter.connect(admin).setAVSNode(await avsNode.getAddress(), true);

	// Authorize operator in EigenVerify
	await eigenVerify.connect(admin).setAuthorizedVerifier(await avsNode.getAddress(), true);

	// Add stake for operator
	await slashing.connect(admin).addStake(await avsNode.getAddress(), ethers.parseEther("1000"));

	return { adapter, eigenVerify, slashing };
}

/**
 * Create a request with valid dataSpec and return requestId and dataSpec
 */
export async function createTestRequest(
	adapter: VPOAdapter,
	requester: Signer,
	marketRef: string,
	dataSourceId: string = "test-source",
	queryLogic: string = "test query",
	timestamp: number = Math.floor(Date.now() / 1000),
	result: string = "YES"
): Promise<{ requestId: string; dataSpec: Uint8Array }> {
	const { dataSpec } = await generateValidProof(
		requester,
		dataSourceId,
		queryLogic,
		result,
		timestamp
	);

	const tx = await adapter.connect(requester).requestVerification(marketRef, dataSpec);
	const receipt = await tx.wait();

	const event = receipt?.logs.find(
		(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
	);
	if (!event) {
		throw new Error("VerificationRequested event not found");
	}

	const parsed = adapter.interface.parseLog(event as any);
	const requestId = parsed?.args[0] as string;

	return { requestId, dataSpec };
}

/**
 * Generate a proof for a test attestation that matches the request's dataSpec
 */
export async function generateTestProof(
	operator: Signer,
	dataSpec: Uint8Array,
	outcome: boolean
): Promise<Uint8Array> {
	// Parse dataSpec to extract parameters
	// For testing, we'll use simple defaults and generate a matching proof
	const timestamp = Math.floor(Date.now() / 1000);
	const dataSourceId = "test-source";
	const queryLogic = ethers.toUtf8String(dataSpec.slice(96)); // Skip header, get query logic
	const result = outcome ? "YES" : "NO";

	const { proof } = await generateValidProof(
		operator,
		dataSourceId,
		queryLogic || "test query",
		result,
		timestamp
	);

	return proof;
}


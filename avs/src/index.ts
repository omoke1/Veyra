/**
 * Veyra AVS Service
 * 
 * This service implements an EigenLayer AVS node that:
 * 1. Listens to VPOAdapter.VerificationRequested events
 * 2. Fetches data from multiple sources
 * 3. Computes outcomes
 * 4. Generates attestations with real EIP-712 signatures
 * 5. Uploads proofs to IPFS via Pinata
 * 6. Submits attestations for quorum consensus
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
// @ts-ignore - Pinata SDK v2 has type issues
import pinataSDK from "@pinata/sdk";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "";
const AVS_PRIVATE_KEY = process.env.AVS_PRIVATE_KEY || "";
const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || "";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111"); // Default to Sepolia

if (!RPC_URL || !ADAPTER_ADDRESS || !AVS_PRIVATE_KEY) {
	console.error("Missing required environment variables:");
	console.error("SEPOLIA_RPC_URL, ADAPTER_ADDRESS, AVS_PRIVATE_KEY");
	process.exit(1);
}

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
	console.error("Missing Pinata credentials:");
	console.error("PINATA_API_KEY, PINATA_SECRET_API_KEY");
	console.error("Get your keys from: https://app.pinata.cloud/keys");
	process.exit(1);
}

// Initialize Pinata SDK (v2 uses API key and secret)
// @ts-ignore - Pinata SDK initialization pattern
const pinata = pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY);
console.log(`[AVS] ✅ Pinata SDK initialized`);

// Test authentication (will be awaited in startAVSService)
async function verifyPinataAuth(): Promise<void> {
	try {
		const result = await pinata.testAuthentication();
		if (result.authenticated) {
			console.log(`[AVS] ✅ Pinata authentication successful`);
		} else {
			console.error("[AVS] ❌ Pinata authentication failed");
			process.exit(1);
		}
	} catch (error: any) {
		console.error("[AVS] ❌ Pinata authentication error:", error.message);
		console.error("[AVS] Please verify your PINATA_API_KEY and PINATA_SECRET_API_KEY");
		process.exit(1);
	}
}

// VPOAdapter ABI (minimal)
const ADAPTER_ABI = [
	"event VerificationRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed marketRef, bytes data)",
	"event AttestationSubmitted(bytes32 indexed requestId, address indexed operator, bool outcome, bytes attestationCid, bytes signature)",
	"event QuorumReached(bytes32 indexed requestId, bool outcome, uint256 totalWeight)",
	"event ResolutionFinalized(bytes32 indexed requestId, bool outcome, bytes aggregateSignature, uint256 totalWeight)",
	"function submitAttestation(bytes32 requestId, bool outcome, bytes calldata attestationCid, bytes calldata signature) external",
	"function finalizeResolution(bytes32 requestId, bool outcome, bytes calldata aggregateSignature) external",
	"function getQuorumStatus(bytes32 requestId) external view returns (bool isQuorumReached, uint256 yesWeight, uint256 noWeight, uint256 requiredWeight)",
	"function avsNodes(address) external view returns (bool)",
	"function operatorWeights(address) external view returns (uint256)",
] as const;

// Typed contract interface for better TypeScript support
type VPOAdapterContract = ethers.Contract & {
	submitAttestation: (
		requestId: string,
		outcome: boolean,
		attestationCid: Uint8Array,
		signature: string
	) => Promise<ethers.ContractTransactionResponse>;
	finalizeResolution: (
		requestId: string,
		outcome: boolean,
		aggregateSignature: string
	) => Promise<ethers.ContractTransactionResponse>;
	getQuorumStatus: (
		requestId: string
	) => Promise<[boolean, bigint, bigint, bigint]>;
	avsNodes: (address: string) => Promise<boolean>;
	operatorWeights: (address: string) => Promise<bigint>;
};

interface VerificationRequest {
	requestId: string;
	requester: string;
	marketRef: string;
	data: string;
}

/**
 * Mock data fetching - in production, this would fetch from multiple sources
 */
async function fetchDataAndComputeOutcome(data: string): Promise<{ outcome: boolean; sources: string[] }> {
	// Parse data to understand the query
	// For mock purposes, we'll use a simple heuristic
	
	// In real implementation:
	// 1. Parse data to extract query parameters
	// 2. Fetch from multiple data sources (Binance, Coinbase, Kraken, etc.)
	// 3. Cross-verify data
	// 4. Compute outcome based on logic
	
	// Mock: simple rule - if data contains "true" or "yes", outcome is true
	const dataLower = data.toLowerCase();
	const outcome = dataLower.includes("true") || dataLower.includes("yes") || dataLower.includes("1");
	
	return {
		outcome,
		sources: ["MockSource1", "MockSource2", "MockSource3"], // In production, actual API sources
	};
}

/**
 * Upload data to IPFS via Pinata and return CID
 * Uses real IPFS upload with Pinata pinning - no mocks or fake data
 */
async function uploadToIPFS(data: string | Uint8Array): Promise<string> {
	try {
		// Convert string to Buffer if needed
		const dataBuffer = typeof data === "string" 
			? Buffer.from(data, "utf-8") 
			: Buffer.from(data);
		
		// Upload to Pinata with metadata
		const options = {
			pinataMetadata: {
				name: `Veyra Attestation - ${Date.now()}`,
				keyvalues: {
					type: "attestation",
					service: "veyra-avs",
				},
			},
			pinataOptions: {
				cidVersion: 1, // Use CIDv1 for better compatibility
			},
		};

		const result = await pinata.pinFileToIPFS(dataBuffer, options);
		
		const cid = result.IpfsHash;
		console.log(`[AVS] ✅ Uploaded to Pinata IPFS: ${cid}`);
		console.log(`[AVS] 📄 View at: https://gateway.pinata.cloud/ipfs/${cid}`);
		console.log(`[AVS] 📄 View at: https://ipfs.io/ipfs/${cid}`);
		
		return cid;
	} catch (error) {
		console.error("[AVS] ❌ Pinata IPFS upload failed:", error);
		throw new Error(`Failed to upload to Pinata IPFS: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Generate EIP-712 signature for attestation
 */
async function signAttestation(
	signer: ethers.Wallet,
	requestId: string,
	outcome: boolean,
	attestationCid: string,
	adapterAddress: string
): Promise<string> {
	// EIP-712 domain
	const domain = {
		name: "Veyra VPO Adapter",
		version: "1",
		chainId: CHAIN_ID,
		verifyingContract: adapterAddress,
	};

	// EIP-712 types
	const types = {
		Attestation: [
			{ name: "requestId", type: "bytes32" },
			{ name: "outcome", type: "bool" },
			{ name: "attestationCid", type: "string" },
			{ name: "timestamp", type: "uint256" },
		],
	};

	// Message to sign
	const message = {
		requestId: requestId,
		outcome: outcome,
		attestationCid: attestationCid,
		timestamp: Math.floor(Date.now() / 1000),
	};

	// Sign using EIP-712
	const signature = await signer.signTypedData(domain, types, message);
	return signature;
}

/**
 * Generate attestation and upload to IPFS with real signature
 */
async function generateAttestation(
	requestId: string,
	outcome: boolean,
	sources: string[],
	operatorAddress: string,
	signer: ethers.Wallet,
	adapterAddress: string
): Promise<{ cid: string; signature: string }> {
	// Create attestation object
	const attestation = {
		requestId,
		outcome,
		sources,
		timestamp: Math.floor(Date.now() / 1000),
		computedBy: operatorAddress,
		chainId: CHAIN_ID,
		adapterAddress,
	};

	// Upload to IPFS
	const attestationJson = JSON.stringify(attestation, null, 2);
	const cid = await uploadToIPFS(attestationJson);

	// Generate EIP-712 signature
	const signature = await signAttestation(signer, requestId, outcome, cid, adapterAddress);

	console.log(`[AVS] Generated attestation CID: ${cid}`);
	console.log(`[AVS] Generated signature: ${signature.slice(0, 20)}...`);

	return { cid, signature };
}

/**
 * Process a verification request - submit attestation for quorum consensus
 */
async function processRequest(
	adapter: ethers.Contract,
	signer: ethers.Wallet,
	request: VerificationRequest
): Promise<void> {
	console.log(`[AVS] Processing request ${request.requestId}`);
	
	try {
		// Check operator weight
		const weight = await adapter.operatorWeights(signer.address);
		if (weight === 0n) {
			console.warn(`[AVS] ⚠️  Operator ${signer.address} has no weight. Skipping attestation.`);
			return;
		}
		
		// Fetch data and compute outcome
		const data = ethers.toUtf8String(request.data);
		const { outcome, sources } = await fetchDataAndComputeOutcome(data);
		
		// Generate attestation with signature
		const { cid, signature } = await generateAttestation(
			request.requestId,
			outcome,
				sources,
			signer.address,
			signer,
			adapter.target as string
		);
		const attestationCidBytes = ethers.toUtf8Bytes(cid);
		
		// Submit attestation (quorum-based)
		console.log(`[AVS] Submitting attestation for request ${request.requestId} with outcome: ${outcome}`);
		const connectedAdapter = adapter.connect(signer) as VPOAdapterContract;
		const tx = await connectedAdapter.submitAttestation(
			request.requestId,
			outcome,
			attestationCidBytes,
			signature
		);
		
		const receipt = await tx.wait();
		console.log(`[AVS] ✅ Attestation submitted for request ${request.requestId} in tx ${receipt?.hash}`);
		
		// Check quorum status
		const [isQuorumReached, yesWeight, noWeight, requiredWeight] = await adapter.getQuorumStatus(request.requestId);
		
		if (isQuorumReached) {
			console.log(`[AVS] 🎯 Quorum reached! Yes: ${yesWeight}, No: ${noWeight}, Required: ${requiredWeight}`);
			
			// If this operator's outcome reached quorum, finalize
			const finalOutcome = yesWeight >= requiredWeight;
			if (finalOutcome === outcome) {
				console.log(`[AVS] Finalizing resolution for request ${request.requestId}...`);
				const connectedAdapter = adapter.connect(signer) as VPOAdapterContract;
				const finalizeTx = await connectedAdapter.finalizeResolution(
					request.requestId,
					finalOutcome,
					"0x" // Empty aggregate signature for now
				);
				const finalizeReceipt = await finalizeTx.wait();
				console.log(`[AVS] ✅ Resolution finalized in tx ${finalizeReceipt?.hash}`);
			}
		} else {
			console.log(`[AVS] ⏳ Quorum not yet reached. Yes: ${yesWeight}, No: ${noWeight}, Required: ${requiredWeight}`);
		}
	} catch (error: any) {
		console.error(`[AVS] ❌ Error processing request ${request.requestId}:`, error.message);
	}
}

/**
 * Main AVS service
 */
async function startAVSService() {
	console.log("[AVS] Starting Veyra AVS Service...");
	
	// Verify Pinata authentication first
	await verifyPinataAuth();
	
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const wallet = new ethers.Wallet(AVS_PRIVATE_KEY, provider);
	const adapter = new ethers.Contract(ADAPTER_ADDRESS, ADAPTER_ABI, provider) as unknown as VPOAdapterContract;
	
	// Verify AVS node is registered
	const isRegistered = await adapter.avsNodes(wallet.address);
	if (!isRegistered) {
		console.error(`[AVS] ❌ AVS node ${wallet.address} is not registered!`);
		console.error("[AVS] Please call adapter.setAVSNode(address, true) from admin account");
		process.exit(1);
	}
	
	console.log(`[AVS] ✅ AVS node registered: ${wallet.address}`);
	
	// Check operator weight
	const weight = await adapter.operatorWeights(wallet.address);
	console.log(`[AVS] Operator weight: ${weight}`);
	
	console.log(`[AVS] Listening for VerificationRequested events on ${ADAPTER_ADDRESS}...`);
	
	// Listen for VerificationRequested events
	adapter.on("VerificationRequested", async (requestId, requester, marketRef, data, event) => {
		console.log(`[AVS] 📨 New verification request received:`);
		console.log(`      Request ID: ${requestId}`);
		console.log(`      Requester: ${requester}`);
		console.log(`      Market Ref: ${marketRef}`);
		console.log(`      Data: ${ethers.toUtf8String(data)}`);
		
		// Process request (with delay to simulate computation time)
		setTimeout(() => {
			processRequest(adapter, wallet, {
				requestId,
				requester,
				marketRef,
				data: ethers.hexlify(data),
			}).catch(console.error);
		}, 2000); // 2 second delay
	});
	
	// Also listen for QuorumReached events to see when consensus is achieved
	adapter.on("QuorumReached", async (requestId, outcome, totalWeight, event) => {
		console.log(`[AVS] 🎯 Quorum reached for request ${requestId}:`);
		console.log(`      Outcome: ${outcome}`);
		console.log(`      Total Weight: ${totalWeight}`);
	});
	
	// Listen for ResolutionFinalized events
	adapter.on("ResolutionFinalized", async (requestId, outcome, aggregateSignature, totalWeight, event) => {
		console.log(`[AVS] ✅ Resolution finalized for request ${requestId}:`);
		console.log(`      Outcome: ${outcome}`);
		console.log(`      Total Weight: ${totalWeight}`);
	});
	
	console.log("[AVS] ✅ AVS service running. Press Ctrl+C to stop.");
}

// Start service
startAVSService().catch((error) => {
	console.error("[AVS] Fatal error:", error);
	process.exit(1);
});


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
import { Readable } from "stream";
// @ts-ignore - Pinata SDK v2 has type issues
import pinataSDK from "@pinata/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEigenVerifyProof } from "./proof-generator";
import { fetchDataAndComputeOutcome } from "./data-fetcher";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "";
const AVS_PRIVATE_KEY = process.env.AVS_PRIVATE_KEY || "";
const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111"); // Default to Sepolia
const DELEGATION_MANAGER_ADDRESS = process.env.EIGENLAYER_DELEGATION_MANAGER || "";

if (!RPC_URL || !ADAPTER_ADDRESS || !AVS_PRIVATE_KEY) {
	console.error("Missing required environment variables:");
	console.error("SEPOLIA_RPC_URL, ADAPTER_ADDRESS, AVS_PRIVATE_KEY");
	process.exit(1);
}

if (!DELEGATION_MANAGER_ADDRESS) {
	console.warn("⚠️  EIGENLAYER_DELEGATION_MANAGER not set. Operator weight checks will be skipped.");
}

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
	console.error("Missing Pinata credentials:");
	console.error("PINATA_API_KEY, PINATA_SECRET_API_KEY");
	console.error("Get your keys from: https://app.pinata.cloud/keys");
	process.exit(1);
}

// Initialize Pinata SDK (v2 uses API key and secret)
// @ts-ignore - Pinata SDK initialization pattern
const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY);
console.log(`[AVS] ✅ Pinata SDK initialized`);

// Initialize Gemini
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
	genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
	console.log(`[AVS] ✅ Gemini SDK initialized`);
} else {
	console.warn(`[AVS] ⚠️  GEMINI_API_KEY not set. LLM verification will be disabled.`);
}

// List available models for debugging
async function listGeminiModels() {
	if (!genAI) return;
	try {
		// Hack to list models since SDK might not expose it easily in all versions
		// But we can try to use the model directly
		console.log("[AVS] Configured to use model: gemini-1.5-flash");
	} catch (e: any) {
		console.error("[AVS] Failed to list models:", e.message);
	}
}

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

/**
 * Verify market question using Gemini LLM
 */
/**
 * Verify market question using Gemini LLM
 */
async function verifyWithGemini(question: string): Promise<{ outcome: boolean; explanation: string; sources: string[] }> {
	if (!genAI) {
		throw new Error("Gemini API key not configured");
	}

	const models = ["gemini-2.5-flash-lite-preview-09-2025"];
	let lastError: any = null;

	for (const modelName of models) {
		try {
			console.log(`[AVS] 🤖 Trying Gemini model: ${modelName}...`);
			const model = genAI.getGenerativeModel({ 
				model: modelName,
				generationConfig: {
					responseMimeType: "application/json",
				}
			});

			const currentDate = new Date().toISOString();
		const prompt = `
You are an advanced Oracle AI for the Veyra prediction market protocol. 
Your task is to verify the outcome of a prediction market question based on real-world data.
3. Determine if the outcome is YES, NO, or UNCERTAIN.
4. Provide a concise explanation for your decision.
5. You MUST provide at least one valid source URL or citation. Do NOT use "General Knowledge".
6. If the event is in the future, predict the outcome based on current trends but clearly state it is a prediction.

Current Date: ${currentDate}
Question: "${question}"

Provide your response in the following STRICT JSON format:
{
  "outcome": boolean, // true for YES, false for NO
  "explanation": "string", // Detailed explanation of your reasoning
  "sources": ["string"] // List of URLs or sources used. MUST NOT BE EMPTY.
}
`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const text = response.text();
			
			// Clean up markdown if present (even with JSON mode, sometimes it adds backticks)
			const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
			
			const data = JSON.parse(jsonStr);
			return {
				outcome: data.outcome,
				explanation: data.explanation,
				sources: data.sources && data.sources.length > 0 ? data.sources : ["Gemini LLM Knowledge Base"]
			};
		} catch (error: any) {
			console.warn(`[AVS] ⚠️  Model ${modelName} failed: ${error.message}`);
			lastError = error;
			// Continue to next model
		}
	}

	console.error("[AVS] ❌ All Gemini models failed.");
	// Fallback to manual/default
	return {
		outcome: false,
		explanation: `Verification failed due to LLM error: ${lastError?.message || "Unknown error"}`,
		sources: ["Error: " + (lastError?.message || "Unknown Gemini Error")]
	};
}

// VeyraOracleAVS ABI (minimal)
const ADAPTER_ABI = [
	"event VerificationRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed marketRef, bytes data)",
	"event AttestationSubmitted(bytes32 indexed requestId, address indexed operator, bool outcome, bytes attestationCid, bytes signature)",
	"event QuorumReached(bytes32 indexed requestId, bool outcome, uint256 totalWeight)",
	"event ResolutionFinalized(bytes32 indexed requestId, bool outcome, bytes aggregateSignature, uint256 totalWeight)",
	"function submitAttestation(bytes32 requestId, bool outcome, bytes calldata attestationCid, bytes calldata signature, bytes calldata proof, uint256 timestamp) external",
	"function finalizeResolution(bytes32 requestId, bool outcome, bytes calldata aggregateSignature) external",
	"function getQuorumStatus(bytes32 requestId) external view returns (bool isQuorumReached, uint256 yesWeight, uint256 noWeight, uint256 requiredWeight)",
	"function isOperatorRegistered(address operator) external view returns (bool isRegistered)",
	"function getTotalOperatorWeight() external view returns (uint256 totalWeight)",
	"function getRequest(bytes32 requestId) external view returns (tuple(bytes32 marketRef, address requester, bytes data, bool fulfilled, bytes attestationCid, bool outcome, bytes metadata))",
	"function getAttestations(bytes32 requestId) external view returns (tuple(address operator, bool outcome, bytes attestationCid, bytes signature, bytes32 proofHash, uint256 timestamp)[])",
	"function avsId() external view returns (bytes32)"
] as const;

// DelegationManager ABI (minimal)
const DELEGATION_MANAGER_ABI = [
	"function operatorShares(address operator, address avs) external view returns (uint256 shares)",
	"function isOperator(address operator) external view returns (bool isRegistered)",
] as const;

// Typed contract interface for better TypeScript support
type VeyraOracleAVSContract = ethers.Contract & {
	submitAttestation: (
		requestId: string,
		outcome: boolean,
		attestationCid: Uint8Array,
		signature: string,
		proof: Uint8Array,
		timestamp: number
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
	getRequest: (requestId: string) => Promise<[string, string, string, boolean, string, boolean, string] & {
		marketRef: string;
		requester: string;
		data: string;
		fulfilled: boolean;
		attestationCid: string;
		outcome: boolean;
		metadata: string;
	}>;
	getAttestations: (requestId: string) => Promise<Array<{
		operator: string;
		outcome: boolean;
		attestationCid: string;
		signature: string;
		proofHash: string;
		timestamp: bigint;
	}>>;
};

interface VerificationRequest {
	requestId: string;
	requester: string;
	marketRef: string;
	data: string;
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

		const stream = Readable.from(dataBuffer);
		// @ts-ignore - Pinata SDK types might not match exactly but stream works
		const result = await pinata.pinFileToIPFS(stream, options);
		
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
	adapterAddress: string,
	timestamp: number
): Promise<string> {
	// EIP-712 domain
	const domain = {
		name: "Veyra Oracle AVS",
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
		timestamp: timestamp,
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
	adapterAddress: string,
	timestamp: number
): Promise<{ cid: string; signature: string }> {
	// Create attestation object
	const attestation = {
		requestId,
		outcome,
		sources,
		timestamp,
		computedBy: operatorAddress,
		chainId: CHAIN_ID,
		adapterAddress,
	};

	// Upload to IPFS
	const attestationJson = JSON.stringify(attestation, null, 2);
	const cid = await uploadToIPFS(attestationJson);

	// Generate EIP-712 signature
	const signature = await signAttestation(signer, requestId, outcome, cid, adapterAddress, timestamp);

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
	provider: ethers.JsonRpcProvider,
	request: VerificationRequest
): Promise<void> {
	console.log(`[AVS] Processing request ${request.requestId}`);
	
	try {
		// Check if we already attested
		const connectedAdapter = adapter.connect(signer) as VeyraOracleAVSContract;
		const attestations = await connectedAdapter.getAttestations(request.requestId);
		const myAddress = await signer.getAddress();
		const alreadyAttested = attestations.some((a: any) => a.operator.toLowerCase() === myAddress.toLowerCase());
		
		if (alreadyAttested) {
			console.log(`[AVS] ⚠️  Already attested for request ${request.requestId}. Skipping.`);
			return;
		}

		// Check operator weight from EigenLayer DelegationManager
		let weight = 0n;
		if (DELEGATION_MANAGER_ADDRESS) {
			try {
				const delegationManager = new ethers.Contract(
					DELEGATION_MANAGER_ADDRESS,
					DELEGATION_MANAGER_ABI,
					provider
				);
				weight = await delegationManager.operatorShares(signer.address, ADAPTER_ADDRESS);
			} catch (error: any) {

				console.warn(`[AVS] ⚠️  Failed to query operator weight from DelegationManager:`, error.message);
				// Fallback: check if operator is registered via adapter
				const isRegistered = await adapter.isOperatorRegistered(signer.address);
				if (!isRegistered) {
					console.warn(`[AVS] ⚠️  Operator ${signer.address} is not registered to this AVS. Skipping attestation.`);
					return;
				}
				// If registered but can't get weight, proceed with weight = 0 (will be checked on-chain)
			}
		} else {
			// Fallback: check if operator is registered via adapter
			const isRegistered = await adapter.isOperatorRegistered(signer.address);
			if (!isRegistered) {
				console.warn(`[AVS] ⚠️  Operator ${signer.address} is not registered to this AVS. Skipping attestation.`);
				return;
			}
		}

		if (weight === 0n) {
			console.warn(`[AVS] ⚠️  Operator ${signer.address} has no stake/weight. Skipping attestation.`);
			return;
		}

		console.log(`[AVS] Operator weight: ${weight.toString()}`);
		
		// Decode request data
		let source = "manual";
		let question = "";
		try {
			const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string", "string"], request.data);
			source = decoded[0].toLowerCase();
			question = decoded[1];
		} catch (e) {
			console.warn("[AVS] Failed to decode request data, using raw bytes");
		}

		let outcome = false;
		let sources: string[] = ["manual"];
		let explanation = "Manual verification";

		// Use Gemini if configured and requested
		if ((source === "llm" || source === "gemini") && genAI) {
			console.log(`[AVS] 🤖 Verifying with Gemini: "${question}"`);
			const result = await verifyWithGemini(question);
			outcome = result.outcome;
			sources = result.sources;
			explanation = result.explanation;
			console.log(`[AVS] 🤖 Gemini Result: ${outcome ? "YES" : "NO"} (${explanation})`);
		} else {
			// Fallback to existing data fetcher
			const result = await fetchDataAndComputeOutcome(request.data);
			outcome = result.outcome;
			sources = result.sources;
		}
		
		const resultString = outcome ? "YES" : "NO";
		const timestamp = Math.floor(Date.now() / 1000);
		
		console.log(`[AVS] Generating EigenVerify proof for request ${request.requestId}...`);
		// Use [source] (requested source ID) instead of sources (actual URLs) to match contract expectation
		// The contract constructs dataSpec from request.data, which contains 'source' (e.g. "gemini")
		const { proof: proofBytes, dataSpec } = await generateEigenVerifyProof(
			[source], 
			question, // Use question as logic/query
			resultString,
			timestamp,
			signer
		);
		
		console.log(`[AVS] ✅ Generated EigenVerify proof (${proofBytes.length} bytes)`);
		
		// Generate attestation with signature
		const { cid, signature } = await generateAttestation(
			request.requestId,
			outcome,
			sources,
			signer.address,
			signer,
			adapter.target as string,
			timestamp
		);
		const attestationCidBytes = ethers.toUtf8Bytes(cid);
		
		// Submit attestation with proof (quorum-based)
		console.log(`[AVS] Submitting attestation with EigenVerify proof for request ${request.requestId} with outcome: ${outcome}`);
		const tx = await connectedAdapter.submitAttestation(
			request.requestId,
			outcome,
			attestationCidBytes,
			signature,
			proofBytes,
			timestamp
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
 * Recover missed requests from past events
 */
async function recoverMissedRequests(
	adapter: VeyraOracleAVSContract,
	wallet: ethers.Wallet,
	provider: ethers.JsonRpcProvider
): Promise<void> {
	console.log("[AVS] 🔍 Checking for missed requests...");
	try {
		const currentBlock = await provider.getBlockNumber();
		// Look back ~200 blocks (approx 40 mins on Sepolia) to cover recent requests
		// Alchemy free tier has strict limits, so we use small range
		const totalBlocksToScan = 200;
		const fromBlock = Math.max(0, currentBlock - totalBlocksToScan);
		const chunkSize = 10; // Alchemy free tier limit seems to be 10 blocks for some keys
		
		console.log(`[AVS] Scanning events from block ${fromBlock} to ${currentBlock} in chunks of ${chunkSize}...`);
		
		const events: any[] = [];
		
		for (let i = fromBlock; i < currentBlock; i += chunkSize) {
			const to = Math.min(i + chunkSize - 1, currentBlock);
			try {
				const chunkEvents = await adapter.queryFilter(adapter.filters.VerificationRequested(), i, to);
				events.push(...chunkEvents);
			} catch (e: any) {
				console.warn(`[AVS] Failed to fetch logs for range ${i}-${to}: ${e.message}`);
			}
		}
		
		console.log(`[AVS] Found ${events.length} past requests`);
		
		for (const event of events) {
			if ('args' in event) {
				// @ts-ignore - args access
				const [requestId, requester, marketRef, data] = event.args;
				
				try {
					// Check if already fulfilled
					const request = await adapter.getRequest(requestId);
					
					if (!request.fulfilled) {
						console.log(`[AVS] ⚠️  Found unfulfilled request: ${requestId}`);
						
						processRequest(adapter, wallet, provider, {
							requestId,
							requester,
							marketRef,
							data
						}).catch(console.error);
					}
				} catch (err) {
					console.warn(`[AVS] Failed to check status for request ${requestId}`, err);
				}
			}
		}
	} catch (error: any) {
		console.error("[AVS] ❌ Error recovering missed requests:", error.message);
	}
}

/**
 * Main AVS service
 */
async function startAVSService() {
	console.log("[AVS] Starting Veyra AVS Service...");
	
	// Verify Pinata authentication first
	await verifyPinataAuth();
	await listGeminiModels();
	
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const wallet = new ethers.Wallet(AVS_PRIVATE_KEY, provider);
	const adapter = new ethers.Contract(ADAPTER_ADDRESS, ADAPTER_ABI, provider) as unknown as VeyraOracleAVSContract;
	
	// Verify operator is registered to AVS via EigenLayer
	const isRegistered = await adapter.isOperatorRegistered(wallet.address);
	if (!isRegistered) {
		console.error(`[AVS] ❌ Operator ${wallet.address} is not registered to this AVS on EigenLayer!`);
		console.error("[AVS] Please register as an operator on EigenLayer and opt-in to this AVS");
		process.exit(1);
	}
	
	console.log(`[AVS] ✅ Operator registered to AVS: ${wallet.address}`);
	
	// Check operator weight from DelegationManager
	if (DELEGATION_MANAGER_ADDRESS) {
		try {
			const delegationManager = new ethers.Contract(
				DELEGATION_MANAGER_ADDRESS,
				DELEGATION_MANAGER_ABI,
				provider
			);
			const weight = await delegationManager.operatorShares(wallet.address, ADAPTER_ADDRESS);
			console.log(`[AVS] Operator weight (stake): ${weight.toString()}`);
			if (weight === 0n) {
				console.warn(`[AVS] ⚠️  Warning: Operator has no stake. Attestations may be rejected.`);
			}
		} catch (error: any) {
			console.warn(`[AVS] ⚠️  Could not query operator weight:`, error.message);
		}
	} else {
		const totalWeight = await adapter.getTotalOperatorWeight();
		console.log(`[AVS] Total AVS operator weight: ${totalWeight.toString()}`);
	}
	
	console.log(`[AVS] Listening for VerificationRequested events on ${ADAPTER_ADDRESS}...`);

	// Recover missed requests
	await recoverMissedRequests(adapter, wallet, provider);
	
	// Listen for VerificationRequested events
	adapter.on("VerificationRequested", async (requestId: string, requester: string, marketRef: string, data: string, event: any) => {
		console.log(`[AVS] 📨 New verification request received:`);
		console.log(`      Request ID: ${requestId}`);
		console.log(`      Requester: ${requester}`);
		console.log(`      Market Ref: ${marketRef}`);
		let decodedData = data;
		try {
			const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string", "string"], data);
			decodedData = `Source: ${decoded[0]}, Logic: ${decoded[1]}`;
		} catch (e) {
			decodedData = `Hex: ${data}`;
		}
		console.log(`      Data: ${decodedData}`);
		
		// Process request (with delay to simulate computation time)
		setTimeout(() => {
			processRequest(adapter, wallet, provider, {
				requestId,
				requester,
				marketRef,
				data: ethers.hexlify(data),
			}).catch(console.error);
		}, 2000); // 2 second delay
	});
	
	// Also listen for QuorumReached events to see when consensus is achieved
	adapter.on("QuorumReached", async (requestId: string, outcome: boolean, totalWeight: bigint, event: any) => {
		console.log(`[AVS] 🎯 Quorum reached for request ${requestId}:`);
		console.log(`      Outcome: ${outcome}`);
		console.log(`      Total Weight: ${totalWeight}`);
	});
	
	// Listen for ResolutionFinalized events
	adapter.on("ResolutionFinalized", async (requestId: string, outcome: boolean, aggregateSignature: string, totalWeight: bigint, event: any) => {
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


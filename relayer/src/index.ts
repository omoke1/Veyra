/**
 * Veyra Relayer Service
 * 
 * Listens for ResolveRequested events, fetches data, signs attestations,
 * uploads to IPFS, and submits to VPOOracleRelayer contract.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { createSignedAttestation } from "./attestation/signer.js";
import { createAttestationFromData, MockDataFetcher } from "./fetcher.js";
import { submitAttestation } from "./submitter.js";
import { IPFSClient } from "./ipfs/client.js";
import { createProofObject } from "./ipfs/index.js";
import type { Attestation } from "./attestation/types.js";

// Contract ABI (minimal for event listening and function calls)
const RELAYER_ABI = [
	"event ResolveRequested(bytes32 indexed marketId, address indexed requester, bytes extraData)",
	"event AttestationFulfilled(bytes32 indexed marketId, address indexed signer, uint8 outcome, string ipfsCid)",
	"function signers(address) view returns (bool)",
	"function fulfillAttestation((bytes32,bytes32,uint8,string,uint256,uint256),bytes,string)",
	"function isNonceUsed(uint256) view returns (bool)",
] as const;

dotenv.config();

const RPC_URL = process.env.RPC_URL || "";
const RELAYER_CONTRACT = process.env.RELAYER_CONTRACT || "";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "";
const CHAIN_ID = BigInt(process.env.CHAIN_ID || "11155111"); // Sepolia default

// IPFS configuration (optional)
const IPFS_API_URL = process.env.IPFS_API_URL || "";
const IPFS_API_KEY = process.env.IPFS_API_KEY || "";
const IPFS_API_SECRET = process.env.IPFS_API_SECRET || "";
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/";

async function main() {
	if (!RPC_URL || !RELAYER_CONTRACT || !RELAYER_PRIVATE_KEY) {
		console.error("Missing required environment variables:");
		console.error("- RPC_URL");
		console.error("- RELAYER_CONTRACT");
		console.error("- RELAYER_PRIVATE_KEY");
		process.exit(1);
	}

	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const signer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

	console.log("🔗 Connected to:", RPC_URL);
	console.log("📝 Relayer address:", signer.address);
	console.log("📄 Contract:", RELAYER_CONTRACT);

	const relayer = new ethers.Contract(RELAYER_CONTRACT, RELAYER_ABI, provider);

	// Check if signer is authorized
	const isAuthorized = await relayer.signers(signer.address);
	if (!isAuthorized) {
		console.error("❌ Relayer address is not authorized as a signer!");
		console.error("   Please call setSigner() on the contract to authorize this address.");
		process.exit(1);
	}

	console.log("✅ Relayer is authorized");

	// Initialize IPFS client (optional)
	let ipfsClient: IPFSClient | null = null;
	if (IPFS_API_URL) {
		ipfsClient = new IPFSClient({
			apiUrl: IPFS_API_URL,
			apiKey: IPFS_API_KEY || undefined,
			apiSecret: IPFS_API_SECRET || undefined,
			gateway: IPFS_GATEWAY,
		});
		console.log("📦 IPFS client initialized");
	} else {
		console.log("⚠️  IPFS not configured - proofs will not be uploaded");
	}

	// Listen for ResolveRequested events
	console.log("👂 Listening for ResolveRequested events...");

	const fetcher = new MockDataFetcher();
	let nonceCounter = 1n;

	relayer.on("ResolveRequested", async (marketId, requester, extraData, event) => {
		console.log("\n📨 ResolveRequested event received:");
		console.log("   Market ID:", marketId);
		console.log("   Requester:", requester);
		console.log("   Block:", event.log.blockNumber);

		try {
			// Fetch data (mock for now)
			const { outcome, data } = await fetcher.fetch(marketId, "");
			console.log("📊 Fetched outcome:", outcome);

			// Create attestation
			const questionHash = ethers.keccak256(ethers.toUtf8Bytes("")); // Would get from market
			const attestation: Attestation = {
				marketId,
				questionHash,
				outcome,
				sourceId: fetcher.id,
				expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour
				nonce: nonceCounter++,
			};

			// Upload proof to IPFS (if configured)
			let ipfsCid = "";
			if (ipfsClient) {
				try {
					console.log("📤 Uploading proof to IPFS...");
					const proof = createProofObject(
						marketId,
						"", // Would get from market contract
						outcome,
						fetcher.id,
						[fetcher.id],
						data
					);
					ipfsCid = await ipfsClient.uploadProof(proof);
					console.log("✅ Proof uploaded to IPFS:", ipfsCid);
					console.log("🔗 View at:", ipfsClient.getGatewayUrl(ipfsCid));
				} catch (error: any) {
					console.error("⚠️  Failed to upload to IPFS:", error.message);
					// Continue without IPFS CID
				}
			}

			// Sign attestation
			console.log("✍️  Signing attestation...");
			const signed = await createSignedAttestation(
				attestation,
				signer,
				CHAIN_ID,
				RELAYER_CONTRACT,
				ipfsCid
			);

			// Submit to contract
			console.log("📤 Submitting to contract...");
			const result = await submitAttestation(
				relayer.connect(signer),
				signed.attestation,
				signed.signature,
				signed.ipfsCid || ""
			);

			if (result.success) {
				console.log("✅ Attestation submitted successfully!");
				console.log("   TX Hash:", result.txHash);
			} else {
				console.error("❌ Failed to submit attestation:", result.error);
			}
		} catch (error: any) {
			console.error("❌ Error processing request:", error.message);
		}
	});

	console.log("🚀 Relayer service running...");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});

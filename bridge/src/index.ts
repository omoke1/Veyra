/**
 * Bridge Service - Real Data Integration
 * 
 * Monitors real UMA, Gnosis, and Polymarket events and bridges them with VPOAdapter
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { PolymarketClient } from "./polymarket/client";
import { PolymarketSubgraph } from "./polymarket/subgraph";

dotenv.config();

// Contract ABIs (minimal for event listening)
const UMA_ORACLE_ABI = [
	"event AssertionMade(bytes32 indexed assertionId, bytes claim, address indexed asserter, address callbackRecipient, address escalationManager, uint64 liveness, address currency, uint256 bond, bytes32 identifier)",
	"event AssertionSettled(bytes32 indexed assertionId, bool resolution)",
	"function getAssertion(bytes32 assertionId) external view returns (address asserter, bytes memory claim, address callbackRecipient, address escalationManager, uint64 liveness, address currency, uint256 bond, bytes32 identifier, bool settled, bool settlementResolution)"
];

const GNOSIS_CONDITIONAL_TOKENS_ABI = [
	"event ConditionPreparation(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount)",
	"event PayoutReported(bytes32 indexed conditionId, uint256[] payouts)",
	"function getConditionPayouts(bytes32 conditionId) external view returns (bool resolved, uint256[] memory payouts)"
];

const UMA_ADAPTER_ABI = [
	"function handleAssertion(bytes32 assertionId, bytes calldata claim, bytes calldata data) external returns (bytes32 requestId)",
	"function submitOutcomeToUMA(bytes32 requestId, bytes calldata claim, uint64 liveness, address currency, uint256 bond, bytes32 identifier) external returns (bytes32 assertionId)",
	"event AssertionHandled(bytes32 indexed assertionId, bytes32 indexed requestId, bytes claim)"
];

const GNOSIS_ADAPTER_ABI = [
	"function handleCondition(bytes32 conditionId, bytes32 questionId, uint256 outcomeSlotCount, bytes calldata data) external returns (bytes32 requestId)",
	"function resolveCondition(bytes32 requestId, uint256 outcomeSlotCount) external returns (bytes32 conditionId)",
	"event ConditionHandled(bytes32 indexed conditionId, bytes32 indexed requestId, bytes32 questionId, uint256 outcomeSlotCount)"
];

const VPO_ADAPTER_ABI = [
	"event VerificationRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed marketRef, bytes data)",
	"event VerificationFulfilled(bytes32 indexed requestId, bytes attestationCid, bool outcome, bytes metadata)",
	"function getFulfillment(bytes32 requestId) external view returns (bool exists, bytes memory attestationCid, bool outcome, bytes memory metadata)"
];

interface Config {
	rpcUrl: string;
	polygonRpcUrl?: string; // For Polymarket (Polygon mainnet)
	vpoAdapterAddress: string;
	umaAdapterAddress: string;
	gnosisAdapterAddress: string;
	umaOracleAddress: string;
	gnosisConditionalTokensAddress: string;
	bridgePrivateKey: string;
	// Polymarket (optional)
	polymarketApiKey?: string;
	polymarketSecret?: string;
	polymarketPassphrase?: string;
	polymarketAddress?: string;
}

class BridgeService {
	private provider: ethers.Provider;
	private polygonProvider?: ethers.Provider; // For Polymarket
	private signer: ethers.Wallet;
	private config: Config;

	// Contracts
	private umaOracle: ethers.Contract;
	private gnosisConditionalTokens: ethers.Contract;
	private umaAdapter: ethers.Contract;
	private gnosisAdapter: ethers.Contract;
	private vpoAdapter: ethers.Contract;

	// Polymarket clients
	private polymarketClient?: PolymarketClient;
	private polymarketSubgraph: PolymarketSubgraph;

	constructor(config: Config) {
		this.config = config;
		this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
		this.signer = new ethers.Wallet(config.bridgePrivateKey, this.provider);

		// Initialize Polygon provider if provided (for Polymarket)
		if (config.polygonRpcUrl) {
			this.polygonProvider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
		}

		// Initialize contracts
		this.umaOracle = new ethers.Contract(
			config.umaOracleAddress,
			UMA_ORACLE_ABI,
			this.provider
		);

		this.gnosisConditionalTokens = new ethers.Contract(
			config.gnosisConditionalTokensAddress,
			GNOSIS_CONDITIONAL_TOKENS_ABI,
			this.provider
		);

		this.umaAdapter = new ethers.Contract(
			config.umaAdapterAddress,
			UMA_ADAPTER_ABI,
			this.signer
		);

		this.gnosisAdapter = new ethers.Contract(
			config.gnosisAdapterAddress,
			GNOSIS_ADAPTER_ABI,
			this.signer
		);

		this.vpoAdapter = new ethers.Contract(
			config.vpoAdapterAddress,
			VPO_ADAPTER_ABI,
			this.provider
		);

		// Initialize Polymarket clients
		if (config.polymarketApiKey || process.env.POLYMARKET_API_KEY) {
			this.polymarketClient = new PolymarketClient({
				apiKey: config.polymarketApiKey,
				secret: config.polymarketSecret,
				passphrase: config.polymarketPassphrase,
				polygonAddress: config.polymarketAddress,
			});
		}
		this.polymarketSubgraph = new PolymarketSubgraph();
	}

	/**
	 * Start monitoring UMA events
	 */
	async startUMAMonitor() {
		console.log("🔍 Starting UMA Optimistic Oracle monitor...");
		console.log(`   Listening to: ${this.config.umaOracleAddress}`);

		// Listen to AssertionMade events
		this.umaOracle.on("AssertionMade", async (
			assertionId: string,
			claim: string,
			asserter: string,
			callbackRecipient: string,
			escalationManager: string,
			liveness: bigint,
			currency: string,
			bond: bigint,
			identifier: string,
			event: any
		) => {
			console.log(`\n📢 New UMA Assertion: ${assertionId}`);
			console.log(`   Claim: ${claim}`);
			console.log(`   Asserter: ${asserter}`);

			try {
				// Handle assertion via UMAAdapter
				// Encode data for VPOAdapter (data sources, timestamps, etc.)
				const data = ethers.AbiCoder.defaultAbiCoder().encode(
					["bytes32", "address", "uint64"],
					[identifier, currency, liveness]
				);

				const tx = await this.umaAdapter.handleAssertion(
					assertionId,
					claim,
					data
				);

				const receipt = await tx.wait();
				console.log(`   ✅ Handled via UMAAdapter: ${receipt.hash}`);

				// Find the requestId from the event
				const handledEvent = receipt.logs.find((log: any) => {
					try {
						const parsed = this.umaAdapter.interface.parseLog(log);
						return parsed && parsed.name === "AssertionHandled";
					} catch {
						return false;
					}
				});

				if (handledEvent) {
					const parsed = this.umaAdapter.interface.parseLog(handledEvent);
					const requestId = parsed?.args[1]; // requestId is second arg
					console.log(`   📋 VPOAdapter Request ID: ${requestId}`);

					// Monitor for fulfillment
					this.monitorVPOFulfillment(requestId, assertionId, "uma");
				}
			} catch (error: any) {
				console.error(`   ❌ Error handling assertion: ${error.message}`);
			}
		});
	}

	/**
	 * Start monitoring Gnosis events
	 */
	async startGnosisMonitor() {
		console.log("🔍 Starting Gnosis Conditional Tokens monitor...");
		console.log(`   Listening to: ${this.config.gnosisConditionalTokensAddress}`);

		// Listen to ConditionPreparation events
		this.gnosisConditionalTokens.on("ConditionPreparation", async (
			conditionId: string,
			oracle: string,
			questionId: string,
			outcomeSlotCount: bigint,
			event: any
		) => {
			console.log(`\n📢 New Gnosis Condition: ${conditionId}`);
			console.log(`   Question ID: ${questionId}`);
			console.log(`   Outcome Slots: ${outcomeSlotCount}`);

			try {
				// Handle condition via GnosisAdapter
				// Encode data for VPOAdapter
				const data = ethers.AbiCoder.defaultAbiCoder().encode(
					["bytes32", "address"],
					[questionId, oracle]
				);

				const tx = await this.gnosisAdapter.handleCondition(
					conditionId,
					questionId,
					outcomeSlotCount,
					data
				);

				const receipt = await tx.wait();
				console.log(`   ✅ Handled via GnosisAdapter: ${receipt.hash}`);

				// Find the requestId from the event
				const handledEvent = receipt.logs.find((log: any) => {
					try {
						const parsed = this.gnosisAdapter.interface.parseLog(log);
						return parsed && parsed.name === "ConditionHandled";
					} catch {
						return false;
					}
				});

				if (handledEvent) {
					const parsed = this.gnosisAdapter.interface.parseLog(handledEvent);
					const requestId = parsed?.args[1]; // requestId is second arg
					console.log(`   📋 VPOAdapter Request ID: ${requestId}`);

					// Monitor for fulfillment
					this.monitorVPOFulfillment(requestId, conditionId, "gnosis");
				}
			} catch (error: any) {
				console.error(`   ❌ Error handling condition: ${error.message}`);
			}
		});
	}

	/**
	 * Monitor VPOAdapter for fulfillment
	 */
	private async monitorVPOFulfillment(
		requestId: string,
		externalId: string,
		type: "uma" | "gnosis"
	) {
		console.log(`\n⏳ Monitoring VPOAdapter fulfillment for ${requestId}...`);

		// Poll for fulfillment (or listen to event)
		const checkInterval = setInterval(async () => {
			try {
				const [exists, , outcome, metadata] = await this.vpoAdapter.getFulfillment(requestId);

				if (exists) {
					clearInterval(checkInterval);
					console.log(`   ✅ VPOAdapter fulfilled!`);
					console.log(`   Outcome: ${outcome}`);

					// Submit outcome back to external platform
					if (type === "uma") {
						await this.submitUMAOutcome(requestId, externalId);
					} else {
						await this.submitGnosisOutcome(requestId, externalId);
					}
				}
			} catch (error: any) {
				console.error(`   ❌ Error checking fulfillment: ${error.message}`);
			}
		}, 5000); // Check every 5 seconds

		// Also listen to event
		this.vpoAdapter.once("VerificationFulfilled", async (
			fulfilledRequestId: string,
			attestationCid: string,
			outcome: boolean,
			metadata: string
		) => {
			if (fulfilledRequestId === requestId) {
				clearInterval(checkInterval);
				console.log(`   ✅ VPOAdapter fulfilled via event!`);

				if (type === "uma") {
					await this.submitUMAOutcome(requestId, externalId);
				} else {
					await this.submitGnosisOutcome(requestId, externalId);
				}
			}
		});
	}

	/**
	 * Submit outcome to UMA
	 */
	private async submitUMAOutcome(requestId: string, assertionId: string) {
		console.log(`\n📤 Submitting outcome to UMA for assertion ${assertionId}...`);

		try {
			// Get assertion details
			const assertion = await this.umaOracle.getAssertion(assertionId);
			const [asserter, claim, , , liveness, currency, bond, identifier] = assertion;

			// Submit outcome (using default values for now)
			const tx = await this.umaAdapter.submitOutcomeToUMA(
				requestId,
				claim,
				liveness,
				currency,
				bond,
				identifier
			);

			const receipt = await tx.wait();
			console.log(`   ✅ Outcome submitted to UMA: ${receipt.hash}`);
		} catch (error: any) {
			console.error(`   ❌ Error submitting to UMA: ${error.message}`);
		}
	}

	/**
	 * Submit outcome to Gnosis
	 */
	private async submitGnosisOutcome(requestId: string, conditionId: string) {
		console.log(`\n📤 Resolving Gnosis condition ${conditionId}...`);

		try {
			// Get condition details to determine outcomeSlotCount
			// For now, assume binary (2 slots)
			const outcomeSlotCount = 2n;

			const tx = await this.gnosisAdapter.resolveCondition(
				requestId,
				outcomeSlotCount
			);

			const receipt = await tx.wait();
			console.log(`   ✅ Condition resolved: ${receipt.hash}`);
		} catch (error: any) {
			console.error(`   ❌ Error resolving condition: ${error.message}`);
		}
	}

	/**
	 * Start Polymarket monitoring
	 */
	async startPolymarketMonitor() {
		console.log("🔍 Starting Polymarket monitor...");
		
		if (!this.polymarketClient) {
			console.log("   ⚠️  Polymarket API client not configured (optional)");
			console.log("   Using Subgraph only for market data\n");
		}

		// Poll for markets ready for resolution
		setInterval(async () => {
			try {
				const markets = await this.polymarketSubgraph.getMarketsReadyForResolution(10);
				
				if (markets.length > 0) {
					console.log(`\n📊 Found ${markets.length} Polymarket markets ready for resolution`);
					
					for (const market of markets) {
						console.log(`   Market: ${market.question}`);
						console.log(`   Condition ID: ${market.condition.id}`);
						
						// Check if already handled
						const conditionId = market.condition.id;
						
						// Try to handle via Gnosis adapter (Polymarket uses conditional tokens)
						try {
							const data = ethers.AbiCoder.defaultAbiCoder().encode(
								["bytes32", "address"],
								[market.id, market.condition.oracle]
							);

							const tx = await this.gnosisAdapter.handleCondition(
								conditionId,
								market.id, // Use market ID as question ID
								BigInt(market.condition.outcomeSlotCount),
								data
							);

							const receipt = await tx.wait();
							console.log(`   ✅ Handled via GnosisAdapter: ${receipt.hash}`);

							// Find the requestId from the event
							const handledEvent = receipt.logs.find((log: any) => {
								try {
									const parsed = this.gnosisAdapter.interface.parseLog(log);
									return parsed && parsed.name === "ConditionHandled";
								} catch {
									return false;
								}
							});

							if (handledEvent) {
								const parsed = this.gnosisAdapter.interface.parseLog(handledEvent);
								const requestId = parsed?.args[1];
								console.log(`   📋 VPOAdapter Request ID: ${requestId}`);

								// Monitor for fulfillment
								this.monitorVPOFulfillment(requestId, conditionId, "gnosis");
							}
						} catch (error: any) {
							if (error.message?.includes("AlreadyFulfilled")) {
								console.log(`   ℹ️  Already handled: ${conditionId}`);
							} else {
								console.error(`   ❌ Error handling condition: ${error.message}`);
							}
						}
					}
				}
			} catch (error: any) {
				console.error(`   ❌ Error checking Polymarket markets: ${error.message}`);
			}
		}, 60000); // Check every minute

		console.log("   ✅ Polymarket monitor started (checking every 60s)\n");
	}

	/**
	 * Start all monitors
	 */
	async start() {
		console.log("🚀 Starting Bridge Service...");
		console.log(`   Network: ${this.config.rpcUrl}`);
		if (this.config.polygonRpcUrl) {
			console.log(`   Polygon Network: ${this.config.polygonRpcUrl}`);
		}
		console.log(`   Bridge Address: ${this.signer.address}\n`);

		await this.startUMAMonitor();
		await this.startGnosisMonitor();
		await this.startPolymarketMonitor();

		console.log("\n✅ Bridge service running. Monitoring events...\n");
	}
}

// Main
async function main() {
	const config: Config = {
		rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.POLYGON_RPC_URL || "",
		polygonRpcUrl: process.env.POLYGON_RPC_URL, // For Polymarket
		vpoAdapterAddress: process.env.VPO_ADAPTER_ADDRESS || "",
		umaAdapterAddress: process.env.UMA_ADAPTER_ADDRESS || "",
		gnosisAdapterAddress: process.env.GNOSIS_ADAPTER_ADDRESS || "",
		umaOracleAddress: process.env.UMA_ORACLE_ADDRESS || "",
		gnosisConditionalTokensAddress: process.env.GNOSIS_CONDITIONAL_TOKENS || "",
		bridgePrivateKey: process.env.BRIDGE_PRIVATE_KEY || "",
		// Polymarket (optional)
		polymarketApiKey: process.env.POLYMARKET_API_KEY,
		polymarketSecret: process.env.POLYMARKET_SECRET,
		polymarketPassphrase: process.env.POLYMARKET_PASSPHRASE,
		polymarketAddress: process.env.POLYMARKET_ADDRESS,
	};

	// Validate config
	if (!config.rpcUrl) {
		throw new Error("SEPOLIA_RPC_URL or POLYGON_RPC_URL required");
	}
	if (!config.vpoAdapterAddress) {
		throw new Error("VPO_ADAPTER_ADDRESS required");
	}
	if (!config.umaAdapterAddress && !config.gnosisAdapterAddress) {
		throw new Error("At least one adapter address required (UMA or Gnosis)");
	}
	if (!config.bridgePrivateKey) {
		throw new Error("BRIDGE_PRIVATE_KEY required");
	}

	const service = new BridgeService(config);
	await service.start();

	// Keep process alive
	process.on("SIGINT", () => {
		console.log("\n👋 Shutting down bridge service...");
		process.exit(0);
	});
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});


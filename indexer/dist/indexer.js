import { ethers } from "ethers";
import { db, initSchema } from "./db.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();
const RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const FACTORY = process.env.FACTORY || "";
const ADAPTER = process.env.ADAPTER_ADDRESS || "";
const ORACLE = process.env.ORACLE_ADDRESS || "";
const UMA_ADAPTER = process.env.UMA_ADAPTER_ADDRESS || "";
const GNOSIS_ADAPTER = process.env.GNOSIS_ADAPTER_ADDRESS || "";
// Note: We don't exit here because the API server can run without the event listener
// The check happens in runIndexer() instead
// Load ABI from compiled artifacts (protocol build) to avoid hand-maintaining
function loadAbi(relPath) {
    const p = path.join(process.cwd(), "..", "protocol", "artifacts", relPath);
    if (!fs.existsSync(p)) {
        throw new Error(`ABI file not found: ${p}. Please compile contracts first (cd protocol && npm run build)`);
    }
    return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}
export async function runIndexer() {
    initSchema();
    if (!RPC_URL) {
        throw new Error("SEPOLIA_RPC_URL environment variable is required");
    }
    if (!FACTORY) {
        throw new Error("FACTORY environment variable is required");
    }
    try {
        // Load ABIs only when actually running the indexer (not when just serving API)
        const factoryAbi = loadAbi("contracts/market/MarketFactory.sol/MarketFactory.json");
        const marketAbi = loadAbi("contracts/market/Market.sol/Market.json");
        const adapterAbi = loadAbi("contracts/adapter/VPOAdapter.sol/VPOAdapter.json");
        const oracleAbi = loadAbi("contracts/oracle/VPOOracleChainlink.sol/VPOOracleChainlink.json");
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const factory = new ethers.Contract(FACTORY, factoryAbi, provider);
        // MarketDeployed: store market and vault
        factory.on("MarketDeployed", (marketId, market, vault, question, endTime, feeBps, flatFee, feeRecipient, ev) => {
            try {
                db.prepare(`INSERT OR REPLACE INTO markets(address, marketId, question, endTime, oracle, vault, createdAt) VALUES (?,?,?,?,?,?,?)`).run(market, ethers.hexlify(marketId), question, Number(endTime), "", vault, Date.now());
            }
            catch (err) {
                console.error("db markets err", err);
            }
            // subscribe to market events
            const m = new ethers.Contract(market, marketAbi, provider);
            m.on("Trade", (trader, isLong, collateralInOrOut, sharesDelta, fee, e2) => {
                try {
                    db.prepare(`INSERT INTO trades(market, trader, isLong, collateralInOrOut, sharesDelta, fee, blockNumber, txHash) VALUES (?,?,?,?,?,?,?,?)`).run(market, trader, isLong ? 1 : 0, collateralInOrOut.toString(), sharesDelta.toString(), fee.toString(), e2.blockNumber, e2.log.transactionHash);
                }
                catch (err) {
                    console.error("db trades err", err);
                }
            });
            m.on("Resolve", (marketId2, outcome, resultData, metadata, e3) => {
                try {
                    db.prepare(`INSERT OR REPLACE INTO resolutions(market, outcome, blockNumber, txHash) VALUES (?,?,?,?)`).run(market, Number(outcome), e3.blockNumber, e3.log.transactionHash);
                }
                catch (err) {
                    console.error("db resolutions err", err);
                }
            });
        });
        console.log("Indexer listening on factory:", FACTORY);
        // Listen to VPOAdapter events if address is provided
        if (ADAPTER) {
            const adapter = new ethers.Contract(ADAPTER, adapterAbi, provider);
            // VerificationRequested: Create a job entry
            adapter.on("VerificationRequested", (requestId, requester, marketRef, data, ev) => {
                const jobId = ethers.hexlify(requestId);
                const now = Date.now();
                try {
                    db.prepare(`INSERT OR REPLACE INTO jobs(id, requestId, marketRef, requester, status, stage, startedAt, updatedAt, txHash) VALUES (?,?,?,?,?,?,?,?,?)`).run(jobId, jobId, ethers.hexlify(marketRef), requester, "Queued", "Fetch", now, now, ev.log.transactionHash);
                }
                catch (err) {
                    console.error("db jobs err", err);
                }
            });
            // VerificationFulfilled: Mark job as completed and create attestation
            adapter.on("VerificationFulfilled", (requestId, attestationCid, outcome, metadata, ev) => {
                const jobId = ethers.hexlify(requestId);
                const now = Date.now();
                const cidStr = ethers.toUtf8String(attestationCid);
                // Update job status
                try {
                    db.prepare(`UPDATE jobs SET status=?, stage=?, updatedAt=?, fulfilledAt=? WHERE requestId=?`).run("Succeeded", "Publish", now, now, jobId);
                }
                catch (err) {
                    console.error("db jobs update err", err);
                }
                // Create attestation entry
                try {
                    db.prepare(`INSERT OR REPLACE INTO attestations(id, requestId, marketRef, attestationCid, outcome, fulfiller, blockNumber, txHash, createdAt) 
					 SELECT ?, requestId, marketRef, ?, ?, ?, ?, ?, ? FROM jobs WHERE requestId=?`).run(jobId, cidStr, outcome ? 1 : 0, ev.log.address, // Fulfiller is the contract (or we could track msg.sender from event)
                    ev.blockNumber, ev.log.transactionHash, now, jobId);
                }
                catch (err) {
                    console.error("db attestations err", err);
                }
            });
            // AVSNodeUpdated: Update operators table
            adapter.on("AVSNodeUpdated", (node, enabled, ev) => {
                const now = Date.now();
                try {
                    db.prepare(`INSERT OR REPLACE INTO operators(address, nodeId, enabled, lastHeartbeat, createdAt) VALUES (?,?,?,?,?)`).run(node, node.substring(0, 10), enabled ? 1 : 0, now, now);
                }
                catch (err) {
                    console.error("db operators err", err);
                }
            });
            console.log("Indexer listening on VPOAdapter:", ADAPTER);
        }
        // Listen to VPOOracleChainlink events if address is provided
        if (ORACLE) {
            const oracle = new ethers.Contract(ORACLE, oracleAbi, provider);
            // ResolveRequested: This could be used to track oracle requests
            oracle.on("ResolveRequested", (marketId, requester, extraData, ev) => {
                // We could track this as a separate job type, but for now we'll just log
                console.log("Oracle resolve requested:", ethers.hexlify(marketId), requester);
            });
            // ResolveFulfilled: Market was resolved via oracle
            oracle.on("ResolveFulfilled", (marketId, resultData, metadata, ev) => {
                // This should already be tracked via Market.Resolve events, but we can cross-reference
                console.log("Oracle resolve fulfilled:", ethers.hexlify(marketId));
            });
            console.log("Indexer listening on VPOOracleChainlink:", ORACLE);
        }
        // Listen to UMAAdapter events if address is provided
        if (UMA_ADAPTER) {
            try {
                const umaAdapterAbi = loadAbi("contracts/adapter/UMAAdapter.sol/UMAAdapter.json");
                const umaAdapter = new ethers.Contract(UMA_ADAPTER, umaAdapterAbi, provider);
                // AssertionHandled: Track when UMA assertion is handled
                umaAdapter.on("AssertionHandled", (assertionId, requestId, claim, ev) => {
                    const now = Date.now();
                    const assertionIdHex = ethers.hexlify(assertionId);
                    const requestIdHex = ethers.hexlify(requestId);
                    const claimStr = ethers.toUtf8String(claim);
                    // Create or update external market entry
                    try {
                        db.prepare(`INSERT OR REPLACE INTO external_markets(id, source, assertionId, question, status, createdAt, blockNumber, txHash) 
						 VALUES (?,?,?,?,?,?,?,?)`).run(assertionIdHex, "UMA", assertionIdHex, claimStr, "Pending", now, ev.blockNumber, ev.log.transactionHash);
                    }
                    catch (err) {
                        console.error("db external_markets err", err);
                    }
                    // Create adapter request entry
                    try {
                        db.prepare(`INSERT OR REPLACE INTO adapter_requests(requestId, adapterType, externalMarketId, adapterAddress, status, verificationStatus, createdAt, blockNumber, txHash)
						 VALUES (?,?,?,?,?,?,?,?,?)`).run(requestIdHex, "UMA", assertionIdHex, UMA_ADAPTER, "Requested", "Pending", now, ev.blockNumber, ev.log.transactionHash);
                    }
                    catch (err) {
                        console.error("db adapter_requests err", err);
                    }
                    console.log("UMA assertion handled:", assertionIdHex, "→ requestId:", requestIdHex);
                });
                // OutcomeSubmitted: Track when outcome is submitted back to UMA
                umaAdapter.on("OutcomeSubmitted", (assertionId, requestId, outcome, ev) => {
                    const now = Date.now();
                    const assertionIdHex = ethers.hexlify(assertionId);
                    const requestIdHex = ethers.hexlify(requestId);
                    // Update external market status
                    try {
                        db.prepare(`UPDATE external_markets SET status=?, outcome=?, resolvedAt=? WHERE id=?`).run("Resolved", outcome ? 1 : 0, now, assertionIdHex);
                    }
                    catch (err) {
                        console.error("db external_markets update err", err);
                    }
                    // Update adapter request status
                    try {
                        db.prepare(`UPDATE adapter_requests SET status=?, outcome=?, submittedAt=? WHERE requestId=?`).run("Submitted", outcome ? 1 : 0, now, requestIdHex);
                    }
                    catch (err) {
                        console.error("db adapter_requests update err", err);
                    }
                    console.log("UMA outcome submitted:", assertionIdHex, "outcome:", outcome);
                });
                console.log("Indexer listening on UMAAdapter:", UMA_ADAPTER);
            }
            catch (error) {
                console.error("Error setting up UMAAdapter listener:", error);
            }
        }
        // Listen to GnosisAdapter events if address is provided
        if (GNOSIS_ADAPTER) {
            try {
                const gnosisAdapterAbi = loadAbi("contracts/adapter/GnosisAdapter.sol/GnosisAdapter.json");
                const gnosisAdapter = new ethers.Contract(GNOSIS_ADAPTER, gnosisAdapterAbi, provider);
                // ConditionHandled: Track when Gnosis condition is handled
                gnosisAdapter.on("ConditionHandled", (conditionId, requestId, questionId, outcomeSlotCount, ev) => {
                    const now = Date.now();
                    const conditionIdHex = ethers.hexlify(conditionId);
                    const requestIdHex = ethers.hexlify(requestId);
                    const questionIdHex = ethers.hexlify(questionId);
                    // Create or update external market entry
                    try {
                        db.prepare(`INSERT OR REPLACE INTO external_markets(id, source, conditionId, questionId, outcomeSlotCount, status, createdAt, blockNumber, txHash)
						 VALUES (?,?,?,?,?,?,?,?,?)`).run(conditionIdHex, "Gnosis", conditionIdHex, questionIdHex, Number(outcomeSlotCount), "Pending", now, ev.blockNumber, ev.log.transactionHash);
                    }
                    catch (err) {
                        console.error("db external_markets err", err);
                    }
                    // Create adapter request entry
                    try {
                        db.prepare(`INSERT OR REPLACE INTO adapter_requests(requestId, adapterType, externalMarketId, adapterAddress, status, verificationStatus, createdAt, blockNumber, txHash)
						 VALUES (?,?,?,?,?,?,?,?,?)`).run(requestIdHex, "Gnosis", conditionIdHex, GNOSIS_ADAPTER, "Requested", "Pending", now, ev.blockNumber, ev.log.transactionHash);
                    }
                    catch (err) {
                        console.error("db adapter_requests err", err);
                    }
                    console.log("Gnosis condition handled:", conditionIdHex, "→ requestId:", requestIdHex);
                });
                // ConditionResolved: Track when condition is resolved
                gnosisAdapter.on("ConditionResolved", (conditionId, requestId, outcome, payouts, ev) => {
                    const now = Date.now();
                    const conditionIdHex = ethers.hexlify(conditionId);
                    const requestIdHex = ethers.hexlify(requestId);
                    // Update external market status
                    try {
                        db.prepare(`UPDATE external_markets SET status=?, outcome=?, resolvedAt=? WHERE id=?`).run("Resolved", outcome ? 1 : 0, now, conditionIdHex);
                    }
                    catch (err) {
                        console.error("db external_markets update err", err);
                    }
                    // Update adapter request status
                    try {
                        db.prepare(`UPDATE adapter_requests SET status=?, outcome=?, submittedAt=? WHERE requestId=?`).run("Resolved", outcome ? 1 : 0, now, requestIdHex);
                    }
                    catch (err) {
                        console.error("db adapter_requests update err", err);
                    }
                    console.log("Gnosis condition resolved:", conditionIdHex, "outcome:", outcome);
                });
                console.log("Indexer listening on GnosisAdapter:", GNOSIS_ADAPTER);
            }
            catch (error) {
                console.error("Error setting up GnosisAdapter listener:", error);
            }
        }
        // Also listen to VPOAdapter events to update adapter request verification status
        if (ADAPTER) {
            const adapter = new ethers.Contract(ADAPTER, adapterAbi, provider);
            // Update adapter request when verification is fulfilled
            adapter.on("VerificationFulfilled", (requestId, attestationCid, outcome, metadata, ev) => {
                const requestIdHex = ethers.hexlify(requestId);
                const now = Date.now();
                // Update adapter request verification status
                try {
                    db.prepare(`UPDATE adapter_requests SET verificationStatus=?, outcome=?, fulfilledAt=? WHERE requestId=?`).run("Fulfilled", outcome ? 1 : 0, now, requestIdHex);
                }
                catch (err) {
                    console.error("db adapter_requests fulfillment update err", err);
                }
            });
        }
    }
    catch (error) {
        console.error("Error setting up indexer event listeners:", error);
        throw error;
    }
}
if (process.env.RUN_INDEXER === "1") {
    runIndexer().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

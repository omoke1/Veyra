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

if (!RPC_URL || !FACTORY) {
	console.error("Missing SEPOLIA_RPC_URL or FACTORY env for indexer");
	process.exit(1);
}

// Load ABI from compiled artifacts (protocol build) to avoid hand-maintaining
function loadAbi(relPath: string) {
	const p = path.join(process.cwd(), "..", "protocol", "artifacts", relPath);
	return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}

const factoryAbi = loadAbi("contracts/market/MarketFactory.sol/MarketFactory.json");
const marketAbi = loadAbi("contracts/market/Market.sol/Market.json");
const adapterAbi = loadAbi("contracts/adapter/VPOAdapter.sol/VPOAdapter.json");
const oracleAbi = loadAbi("contracts/oracle/VPOOracleChainlink.sol/VPOOracleChainlink.json");

export async function runIndexer() {
	initSchema();
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const factory = new ethers.Contract(FACTORY, factoryAbi, provider);

	// MarketDeployed: store market and vault
	factory.on("MarketDeployed", (marketId, market, vault, question, endTime, feeBps, flatFee, feeRecipient, ev) => {
		db.run(
			`INSERT OR REPLACE INTO markets(address, marketId, question, endTime, oracle, vault, createdAt) VALUES (?,?,?,?,?,?,?)`,
			[market, ethers.hexlify(marketId), question, Number(endTime), "", vault, Date.now()],
			(err) => err && console.error("db markets err", err)
		);
		// subscribe to market events
		const m = new ethers.Contract(market, marketAbi, provider);
		m.on("Trade", (trader, isLong, collateralInOrOut, sharesDelta, fee, e2) => {
			db.run(
				`INSERT INTO trades(market, trader, isLong, collateralInOrOut, sharesDelta, fee, blockNumber, txHash) VALUES (?,?,?,?,?,?,?,?)`,
				[
					market,
					trader,
					isLong ? 1 : 0,
					collateralInOrOut.toString(),
					sharesDelta.toString(),
					fee.toString(),
					e2.blockNumber,
					e2.log.transactionHash,
				],
				(err) => err && console.error("db trades err", err)
			);
		});
		m.on("Resolve", (marketId2, outcome, resultData, metadata, e3) => {
			db.run(
				`INSERT OR REPLACE INTO resolutions(market, outcome, blockNumber, txHash) VALUES (?,?,?,?)`,
				[market, Number(outcome), e3.blockNumber, e3.log.transactionHash],
				(err) => err && console.error("db resolutions err", err)
			);
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
			db.run(
				`INSERT OR REPLACE INTO jobs(id, requestId, marketRef, requester, status, stage, startedAt, updatedAt, txHash) VALUES (?,?,?,?,?,?,?,?,?)`,
				[
					jobId,
					jobId,
					ethers.hexlify(marketRef),
					requester,
					"Queued",
					"Fetch",
					now,
					now,
					ev.log.transactionHash,
				],
				(err) => err && console.error("db jobs err", err)
			);
		});

		// VerificationFulfilled: Mark job as completed and create attestation
		adapter.on("VerificationFulfilled", (requestId, attestationCid, outcome, metadata, ev) => {
			const jobId = ethers.hexlify(requestId);
			const now = Date.now();
			const cidStr = ethers.toUtf8String(attestationCid);
			
			// Update job status
			db.run(
				`UPDATE jobs SET status=?, stage=?, updatedAt=?, fulfilledAt=? WHERE requestId=?`,
				["Succeeded", "Publish", now, now, jobId],
				(err) => err && console.error("db jobs update err", err)
			);

			// Create attestation entry
			db.run(
				`INSERT OR REPLACE INTO attestations(id, requestId, marketRef, attestationCid, outcome, fulfiller, blockNumber, txHash, createdAt) 
				 SELECT ?, requestId, marketRef, ?, ?, ?, ?, ?, ? FROM jobs WHERE requestId=?`,
				[
					jobId,
					cidStr,
					outcome ? 1 : 0,
					ev.log.address, // Fulfiller is the contract (or we could track msg.sender from event)
					ev.blockNumber,
					ev.log.transactionHash,
					now,
					jobId,
				],
				(err) => err && console.error("db attestations err", err)
			);
		});

		// AVSNodeUpdated: Update operators table
		adapter.on("AVSNodeUpdated", (node, enabled, ev) => {
			const now = Date.now();
			db.run(
				`INSERT OR REPLACE INTO operators(address, nodeId, enabled, lastHeartbeat, createdAt) VALUES (?,?,?,?,?)`,
				[node, node.substring(0, 10), enabled ? 1 : 0, now, now],
				(err) => err && console.error("db operators err", err)
			);
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
}

if (process.env.RUN_INDEXER === "1") {
	runIndexer().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}



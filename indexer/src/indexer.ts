import { ethers } from "ethers";
import { db, initSchema } from "./db.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const FACTORY = process.env.FACTORY || "";

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
}

if (process.env.RUN_INDEXER === "1") {
	runIndexer().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}


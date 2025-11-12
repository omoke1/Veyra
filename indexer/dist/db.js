import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "vyro.db");
export const db = new sqlite3.Database(dbPath);
export function initSchema() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS markets (
				address TEXT PRIMARY KEY,
				marketId TEXT,
				question TEXT,
				endTime INTEGER,
				oracle TEXT,
				vault TEXT,
				createdAt INTEGER
			)`);
        db.run(`CREATE TABLE IF NOT EXISTS trades (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				market TEXT,
				trader TEXT,
				isLong INTEGER,
				collateralInOrOut TEXT,
				sharesDelta TEXT,
				fee TEXT,
				blockNumber INTEGER,
				txHash TEXT
			)`);
        db.run(`CREATE TABLE IF NOT EXISTS resolutions (
				market TEXT PRIMARY KEY,
				outcome INTEGER,
				blockNumber INTEGER,
				txHash TEXT
			)`);
        db.run(`CREATE TABLE IF NOT EXISTS jobs (
				id TEXT PRIMARY KEY,
				requestId TEXT,
				marketRef TEXT,
				requester TEXT,
				status TEXT,
				stage TEXT,
				startedAt INTEGER,
				updatedAt INTEGER,
				fulfilledAt INTEGER,
				txHash TEXT
			)`);
        db.run(`CREATE TABLE IF NOT EXISTS attestations (
				id TEXT PRIMARY KEY,
				requestId TEXT,
				marketRef TEXT,
				attestationCid TEXT,
				outcome INTEGER,
				fulfiller TEXT,
				blockNumber INTEGER,
				txHash TEXT,
				createdAt INTEGER
			)`);
        db.run(`CREATE TABLE IF NOT EXISTS operators (
				address TEXT PRIMARY KEY,
				nodeId TEXT,
				enabled INTEGER,
				staked TEXT,
				jobsCompleted INTEGER DEFAULT 0,
				lastHeartbeat INTEGER,
				totalRewards TEXT DEFAULT "0",
				createdAt INTEGER
			)`);
        // External markets table (UMA, Gnosis, Polymarket)
        db.run(`CREATE TABLE IF NOT EXISTS external_markets (
				id TEXT PRIMARY KEY,
				source TEXT,
				marketId TEXT,
				question TEXT,
				questionId TEXT,
				conditionId TEXT,
				assertionId TEXT,
				status TEXT,
				outcome INTEGER,
				outcomeSlotCount INTEGER,
				createdAt INTEGER,
				resolvedAt INTEGER,
				blockNumber INTEGER,
				txHash TEXT
			)`);
        // Adapter requests table (tracks VPOAdapter requests from adapters)
        db.run(`CREATE TABLE IF NOT EXISTS adapter_requests (
				requestId TEXT PRIMARY KEY,
				adapterType TEXT,
				externalMarketId TEXT,
				adapterAddress TEXT,
				status TEXT,
				verificationStatus TEXT,
				outcome INTEGER,
				createdAt INTEGER,
				fulfilledAt INTEGER,
				submittedAt INTEGER,
				blockNumber INTEGER,
				txHash TEXT
			)`);
    });
}

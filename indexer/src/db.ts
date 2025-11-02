import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "vyro.db");
export const db = new sqlite3.Database(dbPath);

export function initSchema() {
	db.serialize(() => {
		db.run(
			`CREATE TABLE IF NOT EXISTS markets (
				address TEXT PRIMARY KEY,
				marketId TEXT,
				question TEXT,
				endTime INTEGER,
				oracle TEXT,
				vault TEXT,
				createdAt INTEGER
			)`
		);
		db.run(
			`CREATE TABLE IF NOT EXISTS trades (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				market TEXT,
				trader TEXT,
				isLong INTEGER,
				collateralInOrOut TEXT,
				sharesDelta TEXT,
				fee TEXT,
				blockNumber INTEGER,
				txHash TEXT
			)`
		);
		db.run(
			`CREATE TABLE IF NOT EXISTS resolutions (
				market TEXT PRIMARY KEY,
				outcome INTEGER,
				blockNumber INTEGER,
				txHash TEXT
			)`
		);
	});
}



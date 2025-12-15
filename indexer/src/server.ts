import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db, initSchema } from "./db.js";
import { runIndexer } from "./indexer.js";

dotenv.config();

// Initialize database schema when server starts (needed for API endpoints)
initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// Prevent crashes from unhandled RPC errors
process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
	// Keep running
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	// Keep running
});

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/markets", (_req: Request, res: Response) => {
	try {
		const rows = db.prepare(`SELECT address, marketId, question, endTime, oracle, vault, status, outcome, createdAt FROM markets ORDER BY createdAt DESC`).all();
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/markets/:address", (req: Request, res: Response) => {
	try {
		const addr = req.params.address.toLowerCase();
		const row = db.prepare(`SELECT * FROM markets WHERE lower(address)=?`).get(addr);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/positions/:trader", (req: Request, res: Response) => {
	try {
		const trader = req.params.trader.toLowerCase();
		const rows = db.prepare(`SELECT * FROM trades WHERE lower(trader)=? ORDER BY id DESC LIMIT 200`).all(trader);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/resolutions/:market", (req: Request, res: Response) => {
	try {
		const market = req.params.market.toLowerCase();
		const row = db.prepare(`SELECT * FROM resolutions WHERE lower(market)=?`).get(market);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/kpis", (_req: Request, res: Response) => {
	try {
		const now = Math.floor(Date.now() / 1000);
		const rows = db.prepare(`
			SELECT 
				(SELECT COUNT(*) FROM markets) as totalMarkets,
				(SELECT COUNT(*) FROM markets WHERE endTime > ?) as activeMarkets,
				(SELECT COUNT(*) FROM resolutions) as resolvedMarkets,
				(SELECT COUNT(*) FROM trades) as totalTrades
		`).all(now);
		if (!rows || rows.length === 0) {
			return res.json({ totalMarkets: 0, activeMarkets: 0, resolvedMarkets: 0, totalTrades: 0 });
		}
		res.json(rows[0]);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/trades/:market", (req: Request, res: Response) => {
	try {
		const market = req.params.market.toLowerCase();
		const rows = db.prepare(`SELECT * FROM trades WHERE lower(market)=? ORDER BY id DESC LIMIT 100`).all(market);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

// Jobs endpoints
app.get("/jobs", (_req: Request, res: Response) => {
	try {
		const rows = db.prepare(`SELECT * FROM jobs ORDER BY startedAt DESC LIMIT 100`).all();
		res.json(rows || []);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/jobs/:requestId", (req: Request, res: Response) => {
	try {
		const requestId = req.params.requestId.toLowerCase();
		const row = db.prepare(`SELECT * FROM jobs WHERE lower(requestId)=?`).get(requestId);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

// Attestations endpoints
app.get("/attestations", (_req: Request, res: Response) => {
	try {
		const rows = db.prepare(`SELECT * FROM attestations ORDER BY createdAt DESC LIMIT 100`).all();
		res.json(rows || []);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/attestations/:requestId", (req: Request, res: Response) => {
	try {
		const requestId = req.params.requestId.toLowerCase();
		const row = db.prepare(`SELECT * FROM attestations WHERE lower(requestId)=?`).get(requestId);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

// Operators endpoints
app.get("/operators", (_req: Request, res: Response) => {
	try {
		const rows = db.prepare(`SELECT * FROM operators WHERE enabled=1 ORDER BY jobsCompleted DESC`).all();
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/operators/:address", (req: Request, res: Response) => {
	try {
		const address = req.params.address.toLowerCase();
		const row = db.prepare(`SELECT * FROM operators WHERE lower(address)=?`).get(address);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

// External markets endpoints
app.get("/external-markets", (req: Request, res: Response) => {
	try {
		const source = req.query.source as string | undefined;
		const status = req.query.status as string | undefined;
		
		let query = `SELECT * FROM external_markets WHERE 1=1`;
		const params: any[] = [];
		
		if (source) {
			query += ` AND source=?`;
			params.push(source);
		}
		if (status) {
			query += ` AND status=?`;
			params.push(status);
		}
		
		query += ` ORDER BY createdAt DESC LIMIT 100`;
		
		const rows = db.prepare(query).all(...params);
		res.json(rows || []);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/external-markets/:id", (req: Request, res: Response) => {
	try {
		const id = req.params.id.toLowerCase();
		const row = db.prepare(`SELECT * FROM external_markets WHERE lower(id)=?`).get(id);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

// Adapter requests endpoints
app.get("/adapter-requests", (req: Request, res: Response) => {
	try {
		const adapterType = req.query.adapterType as string | undefined;
		const status = req.query.status as string | undefined;
		
		let query = `SELECT * FROM adapter_requests WHERE 1=1`;
		const params: any[] = [];
		
		if (adapterType) {
			query += ` AND adapterType=?`;
			params.push(adapterType);
		}
		if (status) {
			query += ` AND status=?`;
			params.push(status);
		}
		
		query += ` ORDER BY createdAt DESC LIMIT 100`;
		
		const rows = db.prepare(query).all(...params);
		res.json(rows || []);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

app.get("/adapter-requests/:requestId", (req: Request, res: Response) => {
	try {
		const requestId = req.params.requestId.toLowerCase();
		const row = db.prepare(`SELECT * FROM adapter_requests WHERE lower(requestId)=?`).get(requestId);
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	} catch (err) {
		res.status(500).json({ error: String(err) });
	}
});

const PORT = Number(process.env.PORT || 4001);

app.listen(PORT, async () => {
	console.log(`Indexer API listening on :${PORT}`);
	console.log(`Database schema initialized`);
	
	// Only run event listener if explicitly enabled and env vars are set
	if (process.env.RUN_INDEXER === "1") {
		try {
			await runIndexer();
		} catch (error) {
			console.error("Failed to start indexer event listener:", error);
			console.error("Indexer API server still running - endpoints will work with empty database");
		}
	} else {
		console.log("Indexer event listener disabled (RUN_INDEXER != 1)");
		console.log("API endpoints available but will return empty arrays until contracts are deployed");
	}
});

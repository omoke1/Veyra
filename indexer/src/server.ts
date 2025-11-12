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

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/markets", (_req: Request, res: Response) => {
	db.all(`SELECT address, marketId, question, endTime, oracle, vault, createdAt FROM markets ORDER BY createdAt DESC`, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows);
	});
});

app.get("/markets/:address", (req: Request, res: Response) => {
	const addr = req.params.address.toLowerCase();
	db.get(`SELECT * FROM markets WHERE lower(address)=?`, [addr], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

app.get("/positions/:trader", (req: Request, res: Response) => {
	const trader = req.params.trader.toLowerCase();
	db.all(`SELECT * FROM trades WHERE lower(trader)=? ORDER BY id DESC LIMIT 200`, [trader], (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows);
	});
});

app.get("/resolutions/:market", (req: Request, res: Response) => {
	const market = req.params.market.toLowerCase();
	db.get(`SELECT * FROM resolutions WHERE lower(market)=?`, [market], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

app.get("/kpis", (_req: Request, res: Response) => {
	// Aggregate KPIs from database
	db.all(`
		SELECT 
			(SELECT COUNT(*) FROM markets) as totalMarkets,
			(SELECT COUNT(*) FROM markets WHERE endTime > ?) as activeMarkets,
			(SELECT COUNT(*) FROM resolutions) as resolvedMarkets,
			(SELECT COUNT(*) FROM trades) as totalTrades
	`, [Math.floor(Date.now() / 1000)], (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!rows || rows.length === 0) {
			return res.json({ totalMarkets: 0, activeMarkets: 0, resolvedMarkets: 0, totalTrades: 0 });
		}
		res.json(rows[0]);
	});
});

app.get("/trades/:market", (req: Request, res: Response) => {
	const market = req.params.market.toLowerCase();
	db.all(`SELECT * FROM trades WHERE lower(market)=? ORDER BY id DESC LIMIT 100`, [market], (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows);
	});
});

// Jobs endpoints
app.get("/jobs", (_req: Request, res: Response) => {
	db.all(`SELECT * FROM jobs ORDER BY startedAt DESC LIMIT 100`, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows || []);
	});
});

app.get("/jobs/:requestId", (req: Request, res: Response) => {
	const requestId = req.params.requestId.toLowerCase();
	db.get(`SELECT * FROM jobs WHERE lower(requestId)=?`, [requestId], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

// Attestations endpoints
app.get("/attestations", (_req: Request, res: Response) => {
	db.all(`SELECT * FROM attestations ORDER BY createdAt DESC LIMIT 100`, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows || []);
	});
});

app.get("/attestations/:requestId", (req: Request, res: Response) => {
	const requestId = req.params.requestId.toLowerCase();
	db.get(`SELECT * FROM attestations WHERE lower(requestId)=?`, [requestId], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

// Operators endpoints
app.get("/operators", (_req: Request, res: Response) => {
	db.all(`SELECT * FROM operators WHERE enabled=1 ORDER BY jobsCompleted DESC`, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows || []);
	});
});

app.get("/operators/:address", (req: Request, res: Response) => {
	const address = req.params.address.toLowerCase();
	db.get(`SELECT * FROM operators WHERE lower(address)=?`, [address], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

// External markets endpoints
app.get("/external-markets", (req: Request, res: Response) => {
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
	
	db.all(query, params, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows || []);
	});
});

app.get("/external-markets/:id", (req: Request, res: Response) => {
	const id = req.params.id.toLowerCase();
	db.get(`SELECT * FROM external_markets WHERE lower(id)=?`, [id], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

// Adapter requests endpoints
app.get("/adapter-requests", (req: Request, res: Response) => {
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
	
	db.all(query, params, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows || []);
	});
});

app.get("/adapter-requests/:requestId", (req: Request, res: Response) => {
	const requestId = req.params.requestId.toLowerCase();
	db.get(`SELECT * FROM adapter_requests WHERE lower(requestId)=?`, [requestId], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
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

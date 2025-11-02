import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db.js";
import { runIndexer } from "./indexer.js";

dotenv.config();

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

const PORT = Number(process.env.PORT || 4001);

app.listen(PORT, async () => {
	console.log(`Indexer API listening on :${PORT}`);
	if (process.env.RUN_INDEXER === "1") {
		await runIndexer();
	}
});

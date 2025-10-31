import express from "express";
import dotenv from "dotenv";
import { db } from "./db.js";
import { runIndexer } from "./indexer.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/markets", (_req, res) => {
	db.all(`SELECT address, marketId, question, endTime, oracle, vault, createdAt FROM markets ORDER BY createdAt DESC`, (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows);
	});
});

app.get("/markets/:address", (req, res) => {
	const addr = req.params.address.toLowerCase();
	db.get(`SELECT * FROM markets WHERE lower(address)=?`, [addr], (err, row) => {
		if (err) return res.status(500).json({ error: String(err) });
		if (!row) return res.status(404).json({ error: "not found" });
		res.json(row);
	});
});

app.get("/positions/:trader", (req, res) => {
	const trader = req.params.trader.toLowerCase();
	db.all(`SELECT * FROM trades WHERE lower(trader)=? ORDER BY id DESC LIMIT 200`, [trader], (err, rows) => {
		if (err) return res.status(500).json({ error: String(err) });
		res.json(rows);
	});
});

const PORT = Number(process.env.PORT || 4001);

app.listen(PORT, async () => {
	console.log(`Indexer API listening on :${PORT}`);
	if (process.env.RUN_INDEXER === "1") {
		await runIndexer();
	}
});

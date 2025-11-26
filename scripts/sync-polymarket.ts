/**
 * Polymarket Sync Script
 * 
 * Fetches active markets from Polymarket and stores them in the indexer database
 * Run this to populate the UI with real prediction markets
 */

import { PolymarketClient } from "../bridge/src/polymarket/client.js";
import { db, initSchema } from "../indexer/src/db.js";

async function syncPolymarketMarkets() {
	console.log("🔄 Syncing Polymarket markets...\n");
	
	// Initialize database schema
	initSchema();
	
	// Create Polymarket client (no API key needed for public data)
	const client = new PolymarketClient();
	
	try {
		// Fetch active markets from Polymarket
		console.log("📥 Fetching markets from Polymarket Gamma API...");
		const markets = await client.getMarkets({
			active: true,
			limit: 50  // Fetch top 50 active markets
		});
		
		console.log(`✅ Found ${markets.length} active markets\n`);
		
		// Store each market in the database
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO external_markets (
				id, source, marketId, question, status, createdAt
			) VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		let inserted = 0;
		for (const market of markets) {
			try {
				const marketId = market.id || market.condition_id || market.market_slug;
				const question = market.question || market.description || "Unknown";
				const status = market.active ? "active" : market.closed ? "closed" : "pending";
				const createdAt = market.created_at ? new Date(market.created_at).getTime() / 1000 : Date.now() / 1000;
				
				stmt.run(
					`poly-${marketId}`,  // Prefix with 'poly-' to identify source
					"Polymarket",
					marketId,
					question,
					status,
					Math.floor(createdAt)
				);
				
				console.log(`  ✓ Synced: ${question.substring(0, 80)}...`);
				inserted++;
			} catch (error) {
				console.error(`  ❌ Error syncing market:`, error.message);
			}
		}
		
		console.log(`\n🎉 Successfully synced ${inserted}/${markets.length} markets!`);
		console.log(`\n📊 View them at: http://localhost:3000/markets`);
		console.log(`📡 API endpoint: http://localhost:4001/external-markets?source=Polymarket`);
		
	} catch (error) {
		console.error("❌ Error syncing Polymarket markets:", error.message);
		throw error;
	}
}

// Run the sync
syncPolymarketMarkets()
	.then(() => {
		console.log("\n✅ Sync complete!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\n❌ Sync failed:", error);
		process.exit(1);
	});

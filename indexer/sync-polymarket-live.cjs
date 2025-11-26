/**
 * Polymarket Sync - LIVE 2025 Markets Only
 * Fetches only current, active markets from 2025
 */

const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../indexer/vyro.db');
const db = new Database(dbPath);

// Fetch markets with pagination to find recent ones
function fetchPolymarketMarkets(offset = 0, limit = 100) {
	return new Promise((resolve, reject) => {
		const url = `https://gamma-api.polymarket.com/markets?limit=${limit}&offset=${offset}`;
		
		https.get(url, (res) => {
			let data = '';
			
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				try {
					const markets = JSON.parse(data);
					resolve(markets);
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

// Filter for 2025 markets only
function is2025Market(market) {
	const now = new Date();
	const currentYear = now.getFullYear(); // 2025
	
	// Parse end date
	if (market.endDate) {
		const endDate = new Date(market.endDate);
		// Market must end after current date (still active)
		if (endDate < now) return false;
		// Market must be from 2024 onwards
		if (endDate.getFullYear() < 2024) return false;
	}
	
	// Check if market was created recently (last 12 months)
	if (market.createdAt) {
		const createdDate = new Date(market.createdAt);
		const yearAgo = new Date();
		yearAgo.setFullYear(yearAgo.getFullYear() - 1);
		if (createdDate < yearAgo) return false;
	}
	
	// Must not be closed
	if (market.closed === true) return false;
	
	// Should have some recent activity
	if (market.volume24hr !== undefined && market.volume24hr > 0) return true;
	if (market.volume1wk !== undefined && market.volume1wk > 0) return true;
	
	// If it passes date checks and isn't closed, include it
	return true;
}

async function syncMarkets() {
	console.log('🔄 Syncing LIVE 2025 Polymarket markets...\n');
	
	try {
		let allMarkets = [];
		let offset = 0;
		const batchSize = 100;
		const maxBatches = 20; // Fetch up to 2000 markets to scan
		
		console.log('📥 Fetching markets from Polymarket (scanning for 2025 markets)...');
		
		// Fetch multiple batches to find recent markets
		for (let batch = 0; batch < maxBatches; batch++) {
			const markets = await fetchPolymarketMarkets(offset, batchSize);
			if (!markets || markets.length === 0) break;
			
			// Filter for 2025 markets only
			const recentMarkets = markets.filter(is2025Market);
			allMarkets.push(...recentMarkets);
			
			console.log(`  Batch ${batch + 1}: Found ${recentMarkets.length}/${markets.length} current markets`);
			
			// If we found enough good markets, stop
			if (allMarkets.length >= 50) break;
			
			offset += batchSize;
			
			// Small delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		console.log(`\n✅ Found ${allMarkets.length} live 2025 markets\n`);
		
		if (allMarkets.length === 0) {
			console.log('⚠️  No live 2025 markets found. This might mean:');
			console.log('  - Polymarket API has changed');
			console.log('  - All markets are historical');
			console.log('  - API is returning unexpected data');
			console.log('\nTry visiting https://polymarket.com to see if there are active markets.');
			process.exit(0);
		}
		
		// Clear old markets from database
		console.log('🗑️  Clearing old Polymarket markets from database...');
		db.prepare(`DELETE FROM external_markets WHERE source = 'Polymarket'`).run();
		
		// Prepare SQL statement
		const stmt = db.prepare(`
			INSERT INTO external_markets (
				id, source, marketId, question, status, createdAt
			) VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		let inserted = 0;
		for (const market of allMarkets) {
			try {
				const marketId = market.id || market.conditionId || '';
				const question = market.question || 'Unknown';
				const status = market.closed ? 'closed' : 'active';
				const createdAt = market.createdAt ? Math.floor(new Date(market.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
				
				stmt.run(
					`poly-${marketId}`,
					'Polymarket',
					marketId,
					question,
					status,
					createdAt
				);
				
				const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString() : 'N/A';
				console.log(`  ✓ ${question.substring(0, 60)}... (Ends: ${endDate})`);
				inserted++;
			} catch (error) {
				console.error(`  ❌ Error:`, error.message);
			}
		}
		
		console.log(`\n🎉 Successfully synced ${inserted} live 2025 markets!`);
		console.log(`\n📊 View them at: http://localhost:3000/dashboard/external-markets`);
		console.log(`📡 API: http://localhost:4001/external-markets?source=Polymarket`);
		console.log(`\n💡 To refresh data, run this script again`);
		
	} catch (error) {
		console.error('❌ Error:', error.message);
		throw error;
	} finally {
		db.close();
	}
}

// Run sync
syncMarkets()
	.then(() => {
		console.log('\n✅ Sync complete!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Sync failed:', error);
		process.exit(1);
	});

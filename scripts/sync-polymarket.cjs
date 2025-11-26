/**
 * Simple Polymarket Sync - Direct Database Insert
 * Fetches Polymarket markets and inserts them directly into the indexer database
 */

const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../indexer/vyro.db');
const db = new Database(dbPath);

// Function to fetch Polymarket markets
function fetchPolymarketMarkets() {
	return new Promise((resolve, reject) => {
		const url = 'https://gamma-api.polymarket.com/markets?active=true&limit=20';
		
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

async function syncMarkets() {
	console.log('🔄 Syncing Polymarket markets...\n');
	
	try {
		// Fetch markets from Polymarket
		console.log('📥 Fetching markets from Polymarket Gamma API...');
		const markets = await fetchPolymarketMarkets();
		
		console.log(`✅ Found ${markets.length} markets\n`);
		
		// Prepare SQL statement
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO external_markets (
				id, source, marketId, question, status, createdAt
			) VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		let inserted = 0;
		for (const market of markets) {
			try {
				const marketId = market.id || market.conditionId || '';
				const question = market.question || 'Unknown';
				const status = market.active ? 'active' : (market.closed ? 'closed' : 'pending');
				const createdAt = market.createdAt ? Math.floor(new Date(market.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
				
				stmt.run(
					`poly-${marketId}`,
					'Polymarket',
					marketId,
					question,
					status,
					createdAt
				);
				
				console.log(`  ✓ ${question.substring(0, 70)}...`);
				inserted++;
			} catch (error) {
				console.error(`  ❌ Error:`, error.message);
			}
		}
		
		console.log(`\n🎉 Successfully synced ${inserted}/${markets.length} markets!`);
		console.log(`\n📊 View them at: http://localhost:3000`);
		console.log(`📡 API: http://localhost:4001/external-markets?source=Polymarket`);
		
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

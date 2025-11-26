/**
 * Polymarket Sync - LIVE 2025 Markets with Volume
 * Fetches currently trading markets with recent activity
 */

const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../indexer/vyro.db');
const db = new Database(dbPath);

// Fetch markets that are not closed and not archived
function fetchLiveMarkets(limit = 100) {
	return new Promise((resolve, reject) => {
		// Fetch markets that are NOT closed and NOT archived
		const url = `https://gamma-api.polymarket.com/markets?limit=${limit}&closed=false&archived=false`;
		
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

// Filter for truly active markets (2025, not expired, has volume)
function isLiveMarket(market) {
	const now = new Date();
	
	// Must have an end date in the future
	if (market.endDate) {
		const endDate = new Date(market.endDate);
		if (endDate < now) {
			return false; // Already expired
		}
		
		// Must end in 2025 or later
		if (endDate.getFullYear() < 2025) {
			return false;
		}
	}
	
	// Prefer markets with trading volume
	const volume = market.volume24hr || market.volume1wk || 0;
	
	return volume >= 0; // Include all non-expired 2025+ markets
}

async function syncMarkets() {
	console.log('🔄 Syncing LIVE 2025 Polymarket markets...\n');
	
	try {
		console.log('📥 Fetching active markets from Polymarket...');
		const allMarkets = await fetchLiveMarkets(200); // Fetch more to filter
		
		console.log(`✅ Received ${allMarkets.length} markets from API\n`);
		
		// Filter for truly live 2025 markets
		const liveMarkets = allMarkets.filter(isLiveMarket);
		
		// Sort by 24h volume (most active first)
		liveMarkets.sort((a, b) => {
			const volA = a.volume24hr || 0;
			const volB = b.volume24hr || 0;
			return volB - volA;
		});
		
		// Take top 50 most active markets
		const topMarkets = liveMarkets.slice(0, 50);
		
		console.log(`🎯 Filtered to ${topMarkets.length} live 2025 markets\n`);
		
		if (topMarkets.length === 0) {
			console.log('⚠️  No live 2025 markets found.');
			console.log('   This might mean Polymarket has no active 2025 markets currently.');
			process.exit(0);
		}
		
		// Clear old Polymarket markets
		console.log('🗑️  Clearing old Polymarket data...');
		db.prepare(`DELETE FROM external_markets WHERE source = 'Polymarket'`).run();
		
		// Insert new markets
		const stmt = db.prepare(`
			INSERT INTO external_markets (
				id, source, marketId, question, status, createdAt
			) VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		let inserted = 0;
		console.log('\n📊 Syncing markets:\n');
		
		for (const market of topMarkets) {
			try {
				const marketId = market.id || market.conditionId || '';
				const question = market.question || 'Unknown';
				const status = 'active';
				const createdAt = market.createdAt 
					? Math.floor(new Date(market.createdAt).getTime() / 1000) 
					: Math.floor(Date.now() / 1000);
				
				stmt.run(
					`poly-${marketId}`,
					'Polymarket',
					marketId,
					question,
					status,
					createdAt
				);
				
				const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString() : 'N/A';
				const volume = market.volume24hr ? `$${Math.round(market.volume24hr).toLocaleString()}` : '$0';
				console.log(`  ✓ ${question.substring(0, 70)}...`);
				console.log(`    Ends: ${endDate} | 24h Vol: ${volume}\n`);
				inserted++;
			} catch (error) {
				console.error(`  ❌ Error:`, error.message);
			}
		}
		
		console.log(`🎉 Successfully synced ${inserted} live 2025 markets!`);
		console.log(`\n📊 View at: http://localhost:3000/dashboard/external-markets`);
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

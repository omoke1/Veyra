/**
 * Test script to verify all API endpoints and integrations
 * Tests: Polymarket, UMA, Gnosis, Indexer, Web API
 */

import { PolymarketClient } from "./bridge/src/polymarket/client";
import { PolymarketSubgraph } from "./bridge/src/polymarket/subgraph";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:4001";
const WEB_API_URL = process.env.WEB_API_URL || "http://localhost:3000";

async function testIndexerAPI() {
	console.log("\n📡 Testing Indexer API...");
	
	try {
		// Health check
		const health = await fetch(`${INDEXER_URL}/health`);
		if (health.ok) {
			const data = await health.json();
			console.log("   ✅ Health:", data);
		} else {
			console.log("   ❌ Health check failed:", health.status);
			return false;
		}

		// Markets
		const markets = await fetch(`${INDEXER_URL}/markets`);
		if (markets.ok) {
			const data = await markets.json();
			console.log(`   ✅ Markets: ${Array.isArray(data) ? data.length : 0} found`);
		} else {
			console.log("   ⚠️  Markets endpoint failed:", markets.status);
		}

		// External markets
		const externalMarkets = await fetch(`${INDEXER_URL}/external-markets`);
		if (externalMarkets.ok) {
			const data = await externalMarkets.json();
			console.log(`   ✅ External Markets: ${Array.isArray(data) ? data.length : 0} found`);
			if (Array.isArray(data) && data.length > 0) {
				console.log(`   📊 Sample sources:`, [...new Set(data.map((m: any) => m.source))].join(", "));
			}
		} else {
			console.log("   ⚠️  External markets endpoint failed:", externalMarkets.status);
		}

		// Adapter requests
		const adapterRequests = await fetch(`${INDEXER_URL}/adapter-requests`);
		if (adapterRequests.ok) {
			const data = await adapterRequests.json();
			console.log(`   ✅ Adapter Requests: ${Array.isArray(data) ? data.length : 0} found`);
		} else {
			console.log("   ⚠️  Adapter requests endpoint failed:", adapterRequests.status);
		}

		// KPIs
		const kpis = await fetch(`${INDEXER_URL}/kpis`);
		if (kpis.ok) {
			const data = await kpis.json();
			console.log("   ✅ KPIs:", data);
		} else {
			console.log("   ⚠️  KPIs endpoint failed:", kpis.status);
		}

		return true;
	} catch (error: any) {
		console.log("   ❌ Indexer API error:", error.message);
		return false;
	}
}

async function testWebAPI() {
	console.log("\n🌐 Testing Web API...");
	
	try {
		// Health check
		const health = await fetch(`${WEB_API_URL}/api/health`);
		if (health.ok) {
			const data = await health.json();
			console.log("   ✅ Health:", data);
		} else {
			console.log("   ❌ Health check failed:", health.status);
			return false;
		}

		// Markets
		const markets = await fetch(`${WEB_API_URL}/api/markets`);
		if (markets.ok) {
			const data = await markets.json();
			console.log(`   ✅ Markets: ${Array.isArray(data) ? data.length : 0} found`);
		} else {
			console.log("   ⚠️  Markets endpoint failed:", markets.status);
		}

		// External markets
		const externalMarkets = await fetch(`${WEB_API_URL}/api/external-markets`);
		if (externalMarkets.ok) {
			const data = await externalMarkets.json();
			console.log(`   ✅ External Markets: ${Array.isArray(data) ? data.length : 0} found`);
		} else {
			console.log("   ⚠️  External markets endpoint failed:", externalMarkets.status);
		}

		// External markets by source
		const polymarketMarkets = await fetch(`${WEB_API_URL}/api/external-markets?source=Polymarket`);
		if (polymarketMarkets.ok) {
			const data = await polymarketMarkets.json();
			console.log(`   ✅ Polymarket Markets: ${Array.isArray(data) ? data.length : 0} found`);
		}

		const umaMarkets = await fetch(`${WEB_API_URL}/api/external-markets?source=UMA`);
		if (umaMarkets.ok) {
			const data = await umaMarkets.json();
			console.log(`   ✅ UMA Markets: ${Array.isArray(data) ? data.length : 0} found`);
		}

		const gnosisMarkets = await fetch(`${WEB_API_URL}/api/external-markets?source=Gnosis`);
		if (gnosisMarkets.ok) {
			const data = await gnosisMarkets.json();
			console.log(`   ✅ Gnosis Markets: ${Array.isArray(data) ? data.length : 0} found`);
		}

		return true;
	} catch (error: any) {
		console.log("   ❌ Web API error:", error.message);
		return false;
	}
}

async function testPolymarketAPI() {
	console.log("\n📊 Testing Polymarket API...");
	
	try {
		const client = new PolymarketClient();
		
		// Test Gamma API (public endpoint)
		try {
			const markets = await client.getMarkets({ limit: 5, active: true });
			console.log(`   ✅ Polymarket Gamma API: ${markets.length} markets fetched`);
			if (markets.length > 0) {
				console.log(`   📋 Sample market: ${markets[0].question || markets[0].id}`);
			}
		} catch (error: any) {
			console.log(`   ⚠️  Polymarket Gamma API error: ${error.message}`);
		}

		// Test Subgraph
		try {
			const subgraph = new PolymarketSubgraph();
			const unresolvedMarkets = await subgraph.getUnresolvedMarkets(5);
			console.log(`   ✅ Polymarket Subgraph: ${unresolvedMarkets.length} unresolved markets`);
			if (unresolvedMarkets.length > 0) {
				console.log(`   📋 Sample market: ${unresolvedMarkets[0].question || unresolvedMarkets[0].id}`);
			}
		} catch (error: any) {
			console.log(`   ⚠️  Polymarket Subgraph error: ${error.message}`);
		}

		return true;
	} catch (error: any) {
		console.log("   ❌ Polymarket API error:", error.message);
		return false;
	}
}

async function testUMAIntegration() {
	console.log("\n🔗 Testing UMA Integration...");
	
	try {
		// Check if UMA adapter is configured
		const umaAdapter = process.env.UMA_ADAPTER_ADDRESS;
		if (!umaAdapter) {
			console.log("   ⚠️  UMA_ADAPTER_ADDRESS not configured");
			return false;
		}
		console.log(`   ✅ UMA Adapter configured: ${umaAdapter}`);

		// Check indexer for UMA markets
		const umaMarkets = await fetch(`${INDEXER_URL}/external-markets?source=UMA`);
		if (umaMarkets.ok) {
			const data = await umaMarkets.json();
			console.log(`   ✅ UMA Markets in indexer: ${Array.isArray(data) ? data.length : 0}`);
		}

		// Check adapter requests
		const umaRequests = await fetch(`${INDEXER_URL}/adapter-requests?adapterType=UMA`);
		if (umaRequests.ok) {
			const data = await umaRequests.json();
			console.log(`   ✅ UMA Adapter Requests: ${Array.isArray(data) ? data.length : 0}`);
		}

		return true;
	} catch (error: any) {
		console.log("   ❌ UMA Integration error:", error.message);
		return false;
	}
}

async function testGnosisIntegration() {
	console.log("\n🔗 Testing Gnosis Integration...");
	
	try {
		// Check if Gnosis adapter is configured
		const gnosisAdapter = process.env.GNOSIS_ADAPTER_ADDRESS;
		if (!gnosisAdapter) {
			console.log("   ⚠️  GNOSIS_ADAPTER_ADDRESS not configured");
			return false;
		}
		console.log(`   ✅ Gnosis Adapter configured: ${gnosisAdapter}`);

		// Check indexer for Gnosis markets
		const gnosisMarkets = await fetch(`${INDEXER_URL}/external-markets?source=Gnosis`);
		if (gnosisMarkets.ok) {
			const data = await gnosisMarkets.json();
			console.log(`   ✅ Gnosis Markets in indexer: ${Array.isArray(data) ? data.length : 0}`);
		}

		// Check adapter requests
		const gnosisRequests = await fetch(`${INDEXER_URL}/adapter-requests?adapterType=Gnosis`);
		if (gnosisRequests.ok) {
			const data = await gnosisRequests.json();
			console.log(`   ✅ Gnosis Adapter Requests: ${Array.isArray(data) ? data.length : 0}`);
		}

		return true;
	} catch (error: any) {
		console.log("   ❌ Gnosis Integration error:", error.message);
		return false;
	}
}

async function main() {
	console.log("🧪 API Functionality Test Suite");
	console.log("=" .repeat(50));

	const results = {
		indexer: await testIndexerAPI(),
		web: await testWebAPI(),
		polymarket: await testPolymarketAPI(),
		uma: await testUMAIntegration(),
		gnosis: await testGnosisIntegration(),
	};

	console.log("\n" + "=".repeat(50));
	console.log("📊 Test Results Summary:");
	console.log(`   Indexer API: ${results.indexer ? "✅" : "❌"}`);
	console.log(`   Web API: ${results.web ? "✅" : "❌"}`);
	console.log(`   Polymarket API: ${results.polymarket ? "✅" : "❌"}`);
	console.log(`   UMA Integration: ${results.uma ? "✅" : "⚠️"}`);
	console.log(`   Gnosis Integration: ${results.gnosis ? "✅" : "⚠️"}`);

	const allPassed = Object.values(results).every(r => r);
	console.log(`\n${allPassed ? "✅" : "⚠️"} Overall: ${allPassed ? "All tests passed" : "Some tests failed or services not running"}`);
}

main().catch(console.error);



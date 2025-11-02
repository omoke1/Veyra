import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET() {
	try {
		const res = await fetch(`${INDEXER_URL}/kpis`, {
			cache: "no-store",
		});

		if (!res.ok) {
			// Return default KPIs if indexer is not available
			return NextResponse.json({
				totalMarkets: 0,
				activeMarkets: 0,
				resolvedMarkets: 0,
				totalTrades: 0,
			});
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching KPIs:", error);
		// Return default KPIs on error
		return NextResponse.json({
			totalMarkets: 0,
			activeMarkets: 0,
			resolvedMarkets: 0,
			totalTrades: 0,
		});
	}
}


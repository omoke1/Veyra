import { NextResponse } from "next/server";

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET() {
	try {
		const res = await fetch(`${INDEXER_URL}/jobs`, {
			cache: "no-store",
		});
		if (!res.ok) {
			// If indexer is down or returns error, return empty array instead of error
			if (res.status === 500 || !res.ok) {
				return NextResponse.json([]);
			}
			return NextResponse.json({ error: "Failed to fetch jobs" }, { status: res.status });
		}
		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		// If indexer is not running, return empty array
		console.error("Error fetching jobs (indexer may be down):", error);
		return NextResponse.json([]);
	}
}

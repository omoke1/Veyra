import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET() {
	try {
		const res = await fetch(`${INDEXER_URL}/markets`, {
			cache: "no-store", // Always fetch fresh data
		});

		if (!res.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch markets from indexer" },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching markets:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}


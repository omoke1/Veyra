import { NextResponse } from "next/server";

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET() {
	try {
		const res = await fetch(`${INDEXER_URL}/attestations`, {
			cache: "no-store",
		});
		if (!res.ok) {
			return NextResponse.json({ error: "Failed to fetch attestations" }, { status: res.status });
		}
		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching attestations:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

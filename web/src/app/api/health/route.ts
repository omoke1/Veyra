import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET() {
	try {
		const res = await fetch(`${INDEXER_URL}/health`, {
			cache: "no-store",
		});

		if (!res.ok) {
			return NextResponse.json(
				{ ok: false, indexer: "offline" },
				{ status: 503 }
			);
		}

		const data = await res.json();
		return NextResponse.json({ ok: true, indexer: "online", ...data });
	} catch (error) {
		console.error("Error checking health:", error);
		return NextResponse.json(
			{ ok: false, indexer: "offline", error: "Connection failed" },
			{ status: 503 }
		);
	}
}


import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ address: string }> }
) {
	try {
		const { address } = await params;
		if (!address) {
			return NextResponse.json(
				{ error: "Trader address is required" },
				{ status: 400 }
			);
		}

		const res = await fetch(`${INDEXER_URL}/positions/${address}`, {
			cache: "no-store",
		});

		if (!res.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch positions" },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching positions:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}


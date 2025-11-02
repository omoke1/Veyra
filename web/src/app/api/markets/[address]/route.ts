import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET(
	_request: Request,
	{ params }: { params: { address: string } }
) {
	try {
		const address = params.address;
		if (!address) {
			return NextResponse.json(
				{ error: "Market address is required" },
				{ status: 400 }
			);
		}

		const res = await fetch(`${INDEXER_URL}/markets/${address}`, {
			cache: "no-store",
		});

		if (!res.ok) {
			return NextResponse.json(
				{ error: "Market not found" },
				{ status: res.status === 404 ? 404 : 500 }
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching market:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}


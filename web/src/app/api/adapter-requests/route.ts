import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const queryString = searchParams.toString();
		const url = `${INDEXER_URL}/adapter-requests${queryString ? `?${queryString}` : ""}`;

		const res = await fetch(url, {
			cache: "no-store",
		});

		if (!res.ok) {
			if (res.status === 500 || !res.ok) {
				return NextResponse.json([]);
			}
			return NextResponse.json(
				{ error: "Failed to fetch adapter requests" },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching adapter requests:", error);
		return NextResponse.json([]);
	}
}

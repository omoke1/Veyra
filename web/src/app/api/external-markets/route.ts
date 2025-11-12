import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:4001";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const source = searchParams.get("source");
		const status = searchParams.get("status");

		let url = `${INDEXER_URL}/external-markets`;
		const params = new URLSearchParams();
		if (source) params.append("source", source);
		if (status) params.append("status", status);
		if (params.toString()) {
			url += `?${params.toString()}`;
		}

		const res = await fetch(url, {
			cache: "no-store",
		});

		if (!res.ok) {
			return NextResponse.json([], { status: 200 });
		}

		const data = await res.json();
		return NextResponse.json(data || []);
	} catch (error) {
		console.error("Error fetching external markets:", error);
		return NextResponse.json([], { status: 200 });
	}
}


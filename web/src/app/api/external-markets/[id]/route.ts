import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:4001";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const res = await fetch(`${INDEXER_URL}/external-markets/${id}`, {
			cache: "no-store",
		});

		if (!res.ok) {
			return NextResponse.json({ error: "not found" }, { status: 404 });
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching external market:", error);
		return NextResponse.json({ error: "not found" }, { status: 404 });
	}
}


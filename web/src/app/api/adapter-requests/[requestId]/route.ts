import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const res = await fetch(`${INDEXER_URL}/adapter-requests/${requestId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Adapter request not found" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching adapter request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

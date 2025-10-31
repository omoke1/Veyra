const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";

export interface Market {
  address: string;
  marketId: string;
  question: string;
  endTime: number;
  oracle: string;
  vault: string;
  createdAt: number;
}

export async function fetchMarket(address: string): Promise<Market | null> {
  try {
    const res = await fetch(`${INDEXER_URL}/markets/${address}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMarkets(): Promise<Market[]> {
  try {
    const res = await fetch(`${INDEXER_URL}/markets`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
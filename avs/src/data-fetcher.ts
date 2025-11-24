/**
 * Data Fetcher and Parser
 * 
 * Parses dataSpec and fetches data from multiple sources for market resolution.
 */

import { ethers } from "ethers";

/**
 * Parsed data specification
 */
export interface ParsedDataSpec {
	dataSourceId: string;
	queryLogic: string;
	timestamp: number;
	expectedResult: string;
}

/**
 * Data fetching result
 */
export interface DataFetchResult {
	outcome: boolean;
	sources: string[];
	rawData: Record<string, unknown>;
}

/**
 * Parse dataSpec bytes into structured data
 * Format: 32 bytes (dataSourceId as bytes32) + 32 bytes (timestamp as uint256) + 32 bytes (queryLogic length) + queryLogic bytes + result string
 */
/**
 * Parse request data (abi.encode(string source, string logic))
 */
export function parseRequestData(dataBytes: string): ParsedDataSpec {
	try {
		const abiCoder = new ethers.AbiCoder();
		const [source, logic] = abiCoder.decode(["string", "string"], dataBytes);
		
		return {
			dataSourceId: source || "default",
			queryLogic: logic || "",
			timestamp: Math.floor(Date.now() / 1000), // Current time for fetching
			expectedResult: "", // Not known yet
		};
	} catch (error) {
		console.warn("Failed to decode request data as (string, string), falling back to raw string");
		// Fallback: treat as raw string logic
		return {
			dataSourceId: "default",
			queryLogic: ethers.toUtf8String(dataBytes),
			timestamp: Math.floor(Date.now() / 1000),
			expectedResult: "",
		};
	}
}

/**
 * Fetch data from multiple sources based on dataSourceId
 */
async function fetchFromSources(dataSourceId: string): Promise<Record<string, unknown>> {
	const sources = dataSourceId.split(",").map(s => s.trim()).filter(s => s.length > 0);
	const results: Record<string, unknown> = {};

	// For MVP: implement basic data fetching
	// In production, this would fetch from actual APIs (Binance, Coinbase, etc.)
	for (const source of sources) {
		try {
			// Mock data fetching - in production, replace with actual API calls
			if (source.toLowerCase().includes("mock") || source.toLowerCase().includes("test")) {
				results[source] = { price: 50000, timestamp: Date.now() };
			} else {
				// For real sources, would make HTTP requests here
				// Example: await fetch(`https://api.${source}.com/v1/ticker`)
				results[source] = { error: "Source not implemented", source };
			}
		} catch (error) {
			console.warn(`[DataFetcher] Failed to fetch from ${source}:`, error);
			results[source] = { error: error instanceof Error ? error.message : String(error) };
		}
	}

	return results;
}

/**
 * Compute outcome based on queryLogic and fetched data
 */
function computeOutcome(queryLogic: string, rawData: Record<string, unknown>): boolean {
	// For MVP: simple evaluation
	// In production, this would parse queryLogic (e.g., "price > 50000") and evaluate it
	
	if (!queryLogic || queryLogic.length === 0) {
		// Default: check if any data source returned valid data
		return Object.values(rawData).some(data => 
			data && typeof data === "object" && !("error" in data)
		);
	}

	// Simple heuristic for MVP
	const logicLower = queryLogic.toLowerCase();
	
	// Check for boolean keywords
	if (logicLower.includes("true") || logicLower.includes("yes")) {
		return true;
	}
	if (logicLower.includes("false") || logicLower.includes("no")) {
		return false;
	}

	// Check for numeric comparisons
	const priceMatch = logicLower.match(/price\s*[><=]+\s*(\d+)/);
	if (priceMatch) {
		const threshold = parseInt(priceMatch[1], 10);
		const operator = logicLower.includes(">") ? ">" : logicLower.includes("<") ? "<" : "=";
		
		// Find price in data
		for (const data of Object.values(rawData)) {
			if (data && typeof data === "object" && "price" in data) {
				const price = Number((data as { price: number }).price);
				if (operator === ">" && price > threshold) return true;
				if (operator === "<" && price < threshold) return true;
				if (operator === "=" && price === threshold) return true;
			}
		}
	}

	// Default: return true if we have valid data
	return Object.values(rawData).some(data => 
		data && typeof data === "object" && !("error" in data)
	);
}

/**
 * Fetch data and compute outcome from dataSpec
 */
export async function fetchDataAndComputeOutcome(dataBytes: string): Promise<DataFetchResult> {
	// Parse request data
	const parsed = parseRequestData(dataBytes);

	console.log(`[DataFetcher] Parsed dataSpec:`, {
		dataSourceId: parsed.dataSourceId,
		queryLogic: parsed.queryLogic.substring(0, 50) + (parsed.queryLogic.length > 50 ? "..." : ""),
		timestamp: parsed.timestamp,
		expectedResult: parsed.expectedResult,
	});

	// Fetch from sources
	const rawData = await fetchFromSources(parsed.dataSourceId);

	// Compute outcome
	const outcome = computeOutcome(parsed.queryLogic, rawData);

	// Get source list
	const sources = Object.keys(rawData);

	console.log(`[DataFetcher] Computed outcome: ${outcome} from ${sources.length} sources`);

	return {
		outcome,
		sources,
		rawData,
	};
}

/**
 * Fallback parser for string data (backward compatibility)
 */
export function parseDataSpecString(data: string): ParsedDataSpec {
	// Try to parse as JSON first
	try {
		const parsed = JSON.parse(data);
		return {
			dataSourceId: parsed.dataSourceId || parsed.source || "default",
			queryLogic: parsed.queryLogic || parsed.logic || parsed.query || "",
			timestamp: parsed.timestamp || Math.floor(Date.now() / 1000),
			expectedResult: parsed.expectedResult || parsed.result || "",
		};
	} catch {
		// Not JSON, use simple parsing
		return {
			dataSourceId: "default",
			queryLogic: data,
			timestamp: Math.floor(Date.now() / 1000),
			expectedResult: "",
		};
	}
}


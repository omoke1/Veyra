"use strict";
/**
 * Polymarket API Client
 * Based on: https://docs.polymarket.com/quickstart/introduction/main
 *
 * Uses:
 * - Gamma API for market data
 * - Data-API for core data
 * - Subgraph for on-chain queries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketClient = void 0;
class PolymarketClient {
    constructor(config) {
        this.apiKey = config?.apiKey || process.env.POLYMARKET_API_KEY;
        this.secret = config?.secret || process.env.POLYMARKET_SECRET;
        this.passphrase = config?.passphrase || process.env.POLYMARKET_PASSPHRASE;
        this.polygonAddress = config?.polygonAddress || process.env.POLYMARKET_ADDRESS;
        this.baseUrl = config?.baseUrl || "https://gamma-api.polymarket.com";
    }
    /**
     * Get authentication headers
     * Based on: https://docs.polymarket.com/developers/CLOB/authentication
     */
    getAuthHeaders(method, path, body) {
        if (!this.apiKey || !this.secret || !this.passphrase) {
            return {}; // Public endpoints don't need auth
        }
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const message = timestamp + method + path + (body || "");
        // Create HMAC signature (simplified - use crypto library in production)
        // const signature = createHmac('sha256', this.secret).update(message).digest('hex');
        return {
            "POLY_API_KEY": this.apiKey,
            "POLY_PASSPHRASE": this.passphrase,
            "POLY_TIMESTAMP": timestamp,
            "POLY_ADDRESS": this.polygonAddress || "",
            // "POLY_SIGNATURE": signature, // Implement proper signing
        };
    }
    /**
     * Fetch markets using Gamma API
     * Endpoint: GET /markets
     * Docs: https://docs.polymarket.com/developers/gamma-endpoints/markets
     */
    async getMarkets(params) {
        const queryParams = new URLSearchParams();
        if (params?.active !== undefined)
            queryParams.append("active", params.active.toString());
        if (params?.resolved !== undefined)
            queryParams.append("resolved", params.resolved.toString());
        if (params?.limit)
            queryParams.append("limit", params.limit.toString());
        if (params?.offset)
            queryParams.append("offset", params.offset.toString());
        const url = `${this.baseUrl}/markets?${queryParams.toString()}`;
        const response = await fetch(url, {
            headers: this.getAuthHeaders("GET", "/markets"),
        });
        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get market by ID
     * Endpoint: GET /markets/{marketId}
     */
    async getMarket(marketId) {
        const url = `${this.baseUrl}/markets/${marketId}`;
        const response = await fetch(url, {
            headers: this.getAuthHeaders("GET", `/markets/${marketId}`),
        });
        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Fetch events using Gamma API
     * Endpoint: GET /events
     * Docs: https://docs.polymarket.com/developers/gamma-endpoints/events
     */
    async getEvents(params) {
        const queryParams = new URLSearchParams();
        if (params?.limit)
            queryParams.append("limit", params.limit.toString());
        if (params?.offset)
            queryParams.append("offset", params.offset.toString());
        const url = `${this.baseUrl}/events?${queryParams.toString()}`;
        const response = await fetch(url, {
            headers: this.getAuthHeaders("GET", "/events"),
        });
        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get resolution data for a market
     * Endpoint: GET /resolution/{marketId}
     * Docs: https://docs.polymarket.com/developers/resolution/resolution
     */
    async getResolution(marketId) {
        try {
            const url = `${this.baseUrl}/resolution/${marketId}`;
            const response = await fetch(url, {
                headers: this.getAuthHeaders("GET", `/resolution/${marketId}`),
            });
            if (response.status === 404) {
                return null; // Not resolved yet
            }
            if (!response.ok) {
                throw new Error(`Polymarket API error: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            console.error(`Error fetching resolution for ${marketId}:`, error);
            return null;
        }
    }
    /**
     * Search markets
     * Endpoint: GET /search
     * Docs: https://docs.polymarket.com/developers/gamma-endpoints/search
     */
    async searchMarkets(query, limit = 10) {
        const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
        const response = await fetch(url, {
            headers: this.getAuthHeaders("GET", `/search?q=${encodeURIComponent(query)}`),
        });
        if (!response.ok) {
            throw new Error(`Polymarket API error: ${response.statusText}`);
        }
        return response.json();
    }
}
exports.PolymarketClient = PolymarketClient;

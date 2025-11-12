/**
 * IPFS client for proof storage
 * Supports Pinata, Infura IPFS, and other IPFS HTTP APIs
 */

export interface IPFSConfig {
	gateway?: string;
	apiUrl?: string;
	apiKey?: string;
	apiSecret?: string;
}

export class IPFSClient {
	private apiUrl: string | null = null;
	private apiKey: string | null = null;
	private apiSecret: string | null = null;
	private gateway: string;

	constructor(config: IPFSConfig = {}) {
		this.gateway = config.gateway || "https://ipfs.io/ipfs/";
		this.apiUrl = config.apiUrl || null;
		this.apiKey = config.apiKey || null;
		this.apiSecret = config.apiSecret || null;
	}

	/**
	 * Upload proof data to IPFS
	 * Supports Pinata, Infura, or any IPFS HTTP API
	 */
	async uploadProof(proof: {
		marketId: string;
		question: string;
		outcome: number;
		sourceId: string;
		sources: string[];
		timestamp: number;
		data: any;
	}): Promise<string> {
		if (!this.apiUrl) {
			throw new Error("IPFS API URL not configured. Provide IPFS_API_URL in config.");
		}

		try {
			// Pinata has a special endpoint for JSON
			if (this.apiUrl.includes("pinata")) {
				if (!this.apiKey || !this.apiSecret) {
					throw new Error("Pinata requires API key and secret");
				}

				const response = await fetch(`${this.apiUrl}/pinning/pinJSONToIPFS`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"pinata_api_key": this.apiKey,
						"pinata_secret_api_key": this.apiSecret,
					},
					body: JSON.stringify({
						pinataContent: proof,
						pinataMetadata: {
							name: `proof-${proof.marketId.slice(0, 10)}.json`,
						},
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
				}

				const result = await response.json();
				return result.IpfsHash;
			}

			// For other IPFS services (Infura, public nodes, etc.)
			// Use standard /add endpoint with multipart form data
			const jsonData = JSON.stringify(proof, null, 2);
			const boundary = `----WebKitFormBoundary${Date.now()}`;
			const formData = `--${boundary}\r\n` +
				`Content-Disposition: form-data; name="file"; filename="proof.json"\r\n` +
				`Content-Type: application/json\r\n\r\n` +
				`${jsonData}\r\n` +
				`--${boundary}--\r\n`;

			const headers: Record<string, string> = {
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
			};

			if (this.apiKey && this.apiSecret) {
				headers["Authorization"] = `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64")}`;
			}

			const response = await fetch(`${this.apiUrl}/add`, {
				method: "POST",
				headers,
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`IPFS upload failed: ${response.status} ${errorText}`);
			}

			const result = await response.json();
			
			// Extract CID from response (format varies by provider)
			const cid = result.Hash || result.IpfsHash || result.cid?.["/"] || result.cid;
			if (!cid) {
				throw new Error("Could not extract CID from IPFS response");
			}

			return cid;
		} catch (error: any) {
			throw new Error(`Failed to upload to IPFS: ${error.message}`);
		}
	}

	/**
	 * Get IPFS gateway URL for a CID
	 */
	getGatewayUrl(cid: string): string {
		return `${this.gateway}${cid}`;
	}

	/**
	 * Fetch proof data from IPFS
	 */
	async fetchProof(cid: string): Promise<any> {
		const url = this.getGatewayUrl(cid);
		
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
			}

			const data = await response.json();
			return data;
		} catch (error: any) {
			throw new Error(`Failed to fetch proof from IPFS: ${error.message}`);
		}
	}

	/**
	 * Validate CID format
	 */
	static isValidCID(cid: string): boolean {
		// Basic CID validation (starts with Qm for v0 or bafy for v1)
		return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]+)$/.test(cid);
	}
}


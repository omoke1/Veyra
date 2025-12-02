
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";

const ABI = [
    "function decodeRequestData(bytes memory data) external pure returns (string memory source, string memory logic)"
];

async function main() {
    console.log(`Checking decoding on ${ADAPTER_ADDRESS}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adapter = new ethers.Contract(ADAPTER_ADDRESS, ABI, provider);

    const source = "gemini";
    const question = "is magnus carlsen best player 2025?";
    
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string"],
        [source, question]
    );
    
    console.log(`Encoded Data: ${data}`);

    try {
        const result = await adapter.decodeRequestData(data);
        console.log("✅ Decoding successful!");
        console.log(`Source: ${result.source}`);
        console.log(`Logic: ${result.logic}`);
    } catch (error: any) {
        console.error("❌ Decoding failed:", error.message);
    }
}

main().catch(console.error);

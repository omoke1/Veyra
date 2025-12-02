
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
const MARKET_ID = "0x98e05d7f1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c48ccfec8"; // Partial from screenshot, need full ID if possible, but I'll list all events

const ABI = [
    "event VerificationRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed marketRef, bytes data)",
    "function marketToRequestId(bytes32 marketId) external view returns (bytes32)",
    "function getRequest(bytes32 requestId) external view returns (tuple(bytes32 marketRef, address requester, bytes data, bool fulfilled, bytes attestationCid, bool outcome, bytes metadata))"
];

async function main() {
    console.log(`Checking AVS state on ${ADAPTER_ADDRESS} via ${RPC_URL}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adapter = new ethers.Contract(ADAPTER_ADDRESS, ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Check events in last 1000 blocks
    const fromBlock = currentBlock - 1000;
    console.log(`Scanning events from ${fromBlock} to ${currentBlock}...`);

    const filter = adapter.filters.VerificationRequested();
    // Fetch in chunks of 10
    for (let i = fromBlock; i < currentBlock; i += 10) {
        const to = Math.min(i + 9, currentBlock);
        try {
            const events = await adapter.queryFilter(filter, i, to);
            console.log(`Block ${i}-${to}: Found ${events.length} events`);
            for (const event of events) {
                if ('args' in event) {
                    // @ts-ignore
                    console.log(`Event found: RequestID=${event.args[0]}, MarketRef=${event.args[2]}`);
                }
            }
        } catch (e: any) {
            console.error(`Error fetching ${i}-${to}:`, e.message);
        }
    }
}

main().catch(console.error);

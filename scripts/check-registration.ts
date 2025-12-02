
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const AVS_ABI = [
    "function allocationManager() external view returns (address)",
    "function avsId() external view returns (bytes32)"
];

const ALLOCATION_MANAGER_ABI = [
    "function isOperatorRegisteredToAVS(address operator, bytes32 avsId) external view returns (bool)"
];

async function main() {
    console.log(`Checking Registration on ${ADAPTER_ADDRESS}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const avs = new ethers.Contract(ADAPTER_ADDRESS, AVS_ABI, provider);

    const allocationManagerAddr = await avs.allocationManager();
    console.log(`Allocation Manager: ${allocationManagerAddr}`);
    
    const avsId = await avs.avsId();
    console.log(`AVS ID: ${avsId}`);

    const allocationManager = new ethers.Contract(allocationManagerAddr, ALLOCATION_MANAGER_ABI, provider);
    
    const isRegistered = await allocationManager.isOperatorRegisteredToAVS(wallet.address, avsId);
    console.log(`Is Operator (${wallet.address}) Registered? ${isRegistered}`);
}

main().catch(console.error);

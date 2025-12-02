
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";

const ABI = [
    "function getTotalOperatorWeight() external view returns (uint256)",
    "function quorumThreshold() external view returns (uint256)",
    "function allocationManager() external view returns (address)",
    "function avsId() external view returns (bytes32)"
];

const ALLOCATION_MANAGER_ABI = [
    "function getAVSOperators(bytes32 avsId) external view returns (address[])"
];

const DELEGATION_MANAGER_ABI = [
    "function operatorShares(address operator, address avs) external view returns (uint256)"
];

const DELEGATION_MANAGER_ADDRESS = process.env.EIGENLAYER_DELEGATION_MANAGER || "";

async function main() {
    console.log(`Checking AVS Quorum on ${ADAPTER_ADDRESS}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adapter = new ethers.Contract(ADAPTER_ADDRESS, ABI, provider);

    const totalWeight = await adapter.getTotalOperatorWeight();
    console.log(`Total Operator Weight: ${totalWeight.toString()} (${ethers.formatEther(totalWeight)} ETH)`);

    const threshold = await adapter.quorumThreshold();
    console.log(`Quorum Threshold: ${threshold.toString()}%`);

    const required = (totalWeight * threshold) / 100n;
    console.log(`Required Weight: ${required.toString()} (${ethers.formatEther(required)} ETH)`);

    const avsId = await adapter.avsId();
    console.log(`AVS ID: ${avsId}`);

    const allocationManagerAddr = await adapter.allocationManager();
    console.log(`Allocation Manager: ${allocationManagerAddr}`);

    const allocationManager = new ethers.Contract(allocationManagerAddr, ALLOCATION_MANAGER_ABI, provider);
    const operators = await allocationManager.getAVSOperators(avsId);
    console.log(`Registered Operators (${operators.length}):`);

    const delegationManager = new ethers.Contract(DELEGATION_MANAGER_ADDRESS, DELEGATION_MANAGER_ABI, provider);

    for (const op of operators) {
        const weight = await delegationManager.operatorShares(op, ADAPTER_ADDRESS);
        console.log(`- ${op}: ${ethers.formatEther(weight)} ETH`);
    }
}

main().catch(console.error);

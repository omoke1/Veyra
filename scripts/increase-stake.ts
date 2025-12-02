
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
const DELEGATION_MANAGER_ADDRESS = process.env.EIGENLAYER_DELEGATION_MANAGER || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const MOCK_DELEGATION_MANAGER_ABI = [
    "function setOperatorShares(address operator, address avs, uint256 shares) external",
    "function operatorShares(address operator, address avs) external view returns (uint256)"
];

async function main() {
    console.log(`Increasing Stake on ${DELEGATION_MANAGER_ADDRESS}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const delegationManager = new ethers.Contract(DELEGATION_MANAGER_ADDRESS, MOCK_DELEGATION_MANAGER_ABI, wallet);

    const currentShares = await delegationManager.operatorShares(wallet.address, ADAPTER_ADDRESS);
    console.log(`Current Shares: ${ethers.formatEther(currentShares)} ETH`);

    const newShares = ethers.parseEther("2000"); // Increase to 2000 ETH
    console.log(`Setting Shares to: ${ethers.formatEther(newShares)} ETH...`);

    try {
        const tx = await delegationManager.setOperatorShares(wallet.address, ADAPTER_ADDRESS, newShares);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Stake updated successfully!");
        
        const updatedShares = await delegationManager.operatorShares(wallet.address, ADAPTER_ADDRESS);
        console.log(`Updated Shares: ${ethers.formatEther(updatedShares)} ETH`);
    } catch (error: any) {
        console.error("❌ Failed to update stake. The contract might not be a MockDelegationManager.");
        console.error(error.message);
    }
}

main().catch(console.error);

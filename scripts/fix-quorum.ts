
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const ABI = [
    "function admin() external view returns (address)",
    "function setQuorumThreshold(uint256 threshold) external"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const adapter = new ethers.Contract(ADAPTER_ADDRESS, ABI, wallet);

    const admin = await adapter.admin();
    console.log(`Contract Admin: ${admin}`);
    console.log(`My Address:     ${wallet.address}`);

    if (admin.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("✅ I am the admin. Updating quorum threshold to 50%...");
        const tx = await adapter.setQuorumThreshold(50);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Quorum threshold updated to 50%");
    } else {
        console.log("❌ I am NOT the admin. Cannot update quorum.");
    }
}

main().catch(console.error);

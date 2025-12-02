
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const AVS_ABI = [
    "function eigenVerify() external view returns (address)"
];

const EIGEN_VERIFY_ABI = [
    "function authorizedVerifiers(address verifier) external view returns (bool)",
    "function admin() external view returns (address)",
    "function setAuthorizedVerifier(address verifier, bool enabled) external"
];

async function main() {
    console.log(`Checking EigenVerify on AVS: ${ADAPTER_ADDRESS}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const avs = new ethers.Contract(ADAPTER_ADDRESS, AVS_ABI, provider);

    const eigenVerifyAddress = await avs.eigenVerify();
    console.log(`EigenVerify Address: ${eigenVerifyAddress}`);

    if (eigenVerifyAddress === ethers.ZeroAddress) {
        console.log("EigenVerify is NOT configured (address(0)). Verification should be skipped.");
        return;
    }

    const eigenVerify = new ethers.Contract(eigenVerifyAddress, EIGEN_VERIFY_ABI, wallet);
    const isAuthorized = await eigenVerify.authorizedVerifiers(wallet.address);
    console.log(`Is my address (${wallet.address}) authorized? ${isAuthorized}`);

    const admin = await eigenVerify.admin();
    console.log(`EigenVerify Admin: ${admin}`);

    if (!isAuthorized) {
        if (admin.toLowerCase() === wallet.address.toLowerCase()) {
            console.log("✅ I am the admin. Authorizing myself...");
            const tx = await eigenVerify.setAuthorizedVerifier(wallet.address, true);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log("✅ Authorized successfully!");
        } else {
            console.log("❌ I am NOT the admin. Cannot authorize.");
        }
    }
}

main().catch(console.error);

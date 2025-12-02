
import { ethers } from "hardhat";

async function main() {
    const marketAddr = process.env.MARKET_ADDRESS;
    if (!marketAddr) throw new Error("Missing MARKET_ADDRESS");

    console.log(`Checking Market: ${marketAddr}`);
    const [signer] = await ethers.getSigners();
    const Market = await ethers.getContractAt("Market", marketAddr, signer);

    const endTime = await Market.endTime();
    const status = await Market.status();
    const oracle = await Market.oracle();
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock?.timestamp || 0;

    console.log(`Oracle: ${oracle}`);

    console.log(`EndTime: ${endTime}`);
    console.log(`Current Block Time: ${now}`);
    console.log(`Time Remaining: ${Number(endTime) - now}s`);
    console.log(`Status: ${status} (0=Trading, 1=PendingResolve, 2=Resolved)`);

    if (now < endTime) {
        console.log("⚠️  Trading is still OPEN.");
    } else {
        console.log("✅ Trading is CLOSED.");
    }
}

main().catch(console.error);

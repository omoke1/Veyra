
import { ethers } from "hardhat";

async function main() {
    const marketAddr = process.env.MARKET_ADDRESS;
    const question = process.env.QUESTION;
    
    if (!marketAddr || !question) {
        throw new Error("Missing MARKET_ADDRESS or QUESTION");
    }

    console.log(`Triggering resolution for ${marketAddr}`);
    console.log(`Question: ${question}`);

    const [signer] = await ethers.getSigners();
    const Market = await ethers.getContractAt("Market", marketAddr, signer);

    const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string"],
        ["gemini", question]
    );

    console.log(`Encoded Data: ${extraData}`);

    // Check status
    const status = await Market.status();
    console.log("Market Status:", status);

    if (status === 0n) { // Trading
        console.log("Closing trading...");
        const txClose = await Market.closeTrading({
            gasLimit: 500000,
            maxFeePerGas: ethers.parseUnits("20", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });
        console.log("closeTrading tx:", txClose.hash);
        await txClose.wait();
        console.log("Trading closed.");
    }

    console.log("Requesting resolution...");
    const tx = await Market.requestResolve(extraData, {
        gasLimit: 1000000,
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
    });
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Resolution requested!");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

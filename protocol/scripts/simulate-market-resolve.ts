
import { ethers } from "hardhat";

async function main() {
    const marketAddr = process.env.MARKET_ADDRESS;
    const question = process.env.QUESTION || "test";
    
    // Encode extraData as per frontend: "gemini", question
    const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string"],
        ["gemini", question]
    );

    if (!marketAddr) throw new Error("Missing MARKET_ADDRESS");

    console.log(`Simulating requestResolve on Market: ${marketAddr}`);
    const [signer] = await ethers.getSigners();
    const Market = await ethers.getContractAt("Market", marketAddr, signer);

    try {
        await Market.requestResolve.staticCall(extraData);
        console.log("✅ Simulation SUCCESS");
    } catch (error: any) {
        console.error("❌ Simulation FAILED");
        if (error.data) {
            console.log("Revert Data:", error.data);
            try {
                // Try decoding with Market errors
                const decoded = Market.interface.parseError(error.data);
                console.log("Decoded Error (Market):", decoded?.name, decoded?.args);
            } catch (e) {
                try {
                    // Try decoding with AVS errors
                    const avsAddr = await Market.oracle();
                    const AVS = await ethers.getContractAt("VeyraOracleAVS", avsAddr, signer);
                    const decodedAVS = AVS.interface.parseError(error.data);
                    console.log("Decoded Error (AVS):", decodedAVS?.name, decodedAVS?.args);
                } catch (e2) {
                    console.log("Could not decode error.");
                }
            }
        } else {
            console.log(error.message);
        }
    }
}

main().catch(console.error);

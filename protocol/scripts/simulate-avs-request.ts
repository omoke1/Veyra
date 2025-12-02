
import { ethers } from "hardhat";

async function main() {
    const avsAddr = process.env.ADAPTER_ADDRESS;
    const marketId = ethers.hexlify(ethers.randomBytes(32));
    const extraData = ethers.hexlify(ethers.toUtf8Bytes("test-data"));

    if (!avsAddr) throw new Error("Missing ADAPTER_ADDRESS");

    console.log(`Simulating requestResolve on AVS: ${avsAddr}`);
    const [signer] = await ethers.getSigners();
    const AVS = await ethers.getContractAt("VeyraOracleAVS", avsAddr, signer);

    try {
        await AVS.requestResolve.staticCall(marketId, extraData);
        console.log("✅ Simulation SUCCESS");
    } catch (error: any) {
        console.error("❌ Simulation FAILED");
        if (error.data) {
            console.log("Revert Data:", error.data);
            try {
                const decoded = AVS.interface.parseError(error.data);
                console.log("Decoded Error:", decoded?.name, decoded?.args);
            } catch (e) {
                console.log("Could not decode error.");
            }
        } else {
            console.log(error.message);
        }
    }
}

main().catch(console.error);

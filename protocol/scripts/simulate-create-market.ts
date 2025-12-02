
import { ethers } from "hardhat";

async function main() {
    const factoryAddr = process.env.FACTORY;
    const collateral = process.env.COLLATERAL;
    const question = "Simulation Test";
    const endTime = Math.floor(Date.now() / 1000) + 60;
    const feeBps = 0;

    if (!factoryAddr || !collateral) throw new Error("Missing env");

    const [signer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MarketFactory");
    const factory = Factory.attach(factoryAddr).connect(signer);

    console.log("Simulating createMarket...");
    
    try {
        await factory.createMarket.staticCall(collateral, question, endTime, feeBps);
        console.log("✅ Simulation SUCCESS");
    } catch (error: any) {
        console.error("❌ Simulation FAILED");
        if (error.data) {
            console.log("Revert Data:", error.data);
            // Try to decode
            try {
                const decoded = factory.interface.parseError(error.data);
                console.log("Decoded Error:", decoded?.name, decoded?.args);
            } catch (e) {
                console.log("Could not decode error with Factory interface.");
            }
        } else {
            console.log(error.message);
        }
    }
}

main().catch(console.error);

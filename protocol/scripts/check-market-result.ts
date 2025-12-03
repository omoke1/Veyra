
import { ethers } from "hardhat";

async function main() {
    const marketAddress = "0x1BeB7E284edf9C34D4c7A5B4E113DE3D56A2E434"; // The market we resolved
    const market = await ethers.getContractAt("Market", marketAddress);
    
    const marketId = await market.marketId();
    console.log("Market ID:", marketId);
    
    const oracleAddress = await market.oracle();
    console.log("Oracle Address:", oracleAddress);
    
    const oracle = await ethers.getContractAt("VeyraOracleAVS", oracleAddress);
    
    try {
        const result = await oracle.getResult(marketId);
        console.log("Oracle Result:", result);
    } catch (e: any) {
        console.log("Error getting result:", e.message);
    }
    
    const status = await market.status();
    console.log("Market Status:", status);
}

main().catch(console.error);

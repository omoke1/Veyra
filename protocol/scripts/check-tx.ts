
import { ethers } from "hardhat";

async function main() {
    const txHash = process.env.TX_HASH;
    if (!txHash) throw new Error("Missing TX_HASH");

    console.log(`Checking TX: ${txHash}`);
    const provider = ethers.provider;
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
        console.log("TX not found in mempool or chain.");
        return;
    }
    
    console.log("TX found. Waiting for receipt...");
    const receipt = await tx.wait();
    console.log(`Confirmed in block ${receipt?.blockNumber}`);
    
    // Find MarketDeployed event
    const Factory = await ethers.getContractFactory("MarketFactory");
    const marketEvt = receipt?.logs
        .map((l) => {
            try {
                return Factory.interface.parseLog({ topics: l.topics as string[], data: l.data as string });
            } catch (_) {
                return null;
            }
        })
        .find((e) => e && e.name === "MarketDeployed");

    if (marketEvt) {
        const { market, vault, marketId } = marketEvt.args as any;
        console.log("Market:", market);
        console.log("Vault:", vault);
        console.log("MarketId:", marketId);
    }
}

main().catch(console.error);

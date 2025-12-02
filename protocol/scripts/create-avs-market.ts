
import { ethers } from "hardhat";

async function main() {
    const factoryAddr = process.env.FACTORY;
    const collateral = process.env.COLLATERAL;
    const oracle = process.env.ADAPTER_ADDRESS; // Use AVS as Oracle
    const question = "Will AVS Oracle work?";
    const endTime = Math.floor(Date.now() / 1000) + 60;
    const feeBps = 0;

    if (!factoryAddr || !collateral || !oracle) {
        throw new Error("Missing env: FACTORY, COLLATERAL, ADAPTER_ADDRESS");
    }

    console.log(`Creating market with Oracle: ${oracle}`);

    const [signer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MarketFactory");
    const factory = Factory.attach(factoryAddr).connect(signer);

    const tx = await factory.createMarketWithOracle(collateral, question, endTime, feeBps, oracle, {
        gasLimit: 3000000,
        maxFeePerGas: ethers.parseUnits("10", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
    });

    console.log("createMarketWithOracle tx:", tx.hash);
    const rcpt = await tx.wait();
    console.log("confirmed in block", rcpt?.blockNumber);

    // Find MarketDeployed event
    const marketEvt = rcpt?.logs
        .map((l) => {
            try {
                return factory.interface.parseLog({ topics: l.topics as string[], data: l.data as string });
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

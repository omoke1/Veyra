
import { ethers } from "hardhat";

async function main() {
    const factoryAddr = process.env.FACTORY;
    const avsAddr = process.env.ADAPTER_ADDRESS;

    if (!factoryAddr || !avsAddr) {
        throw new Error("Missing env: FACTORY, ADAPTER_ADDRESS");
    }

    console.log(`Updating Factory Oracle to: ${avsAddr}`);

    // Admin private key from protocol/contracts/.env
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");
    const wallet = new ethers.Wallet(PRIVATE_KEY, ethers.provider);
    console.log("Using wallet:", wallet.address);
    const Factory = await ethers.getContractFactory("MarketFactory");
    const factory = Factory.attach(factoryAddr).connect(wallet);

    const tx = await factory.setOracle(avsAddr, {
        gasLimit: 500000,
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
    });

    console.log("setOracle tx:", tx.hash);
    await tx.wait();
    console.log("✅ Oracle updated!");
}

main().catch(console.error);

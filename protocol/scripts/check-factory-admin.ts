
import { ethers } from "hardhat";

async function main() {
    const factoryAddr = process.env.FACTORY;
    if (!factoryAddr) throw new Error("Missing FACTORY");

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    const Factory = await ethers.getContractFactory("MarketFactory");
    const factory = Factory.attach(factoryAddr).connect(signer);

    const admin = await factory.admin();
    console.log("Factory Admin:", admin);

    if (admin.toLowerCase() === signer.address.toLowerCase()) {
        console.log("✅ Signer IS Admin");
    } else {
        console.log("❌ Signer is NOT Admin");
    }
}

main().catch(console.error);

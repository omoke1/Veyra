import { ethers } from "hardhat";

async function main() {
	const [signer] = await ethers.getSigners();
	const factoryAddr = process.env.FACTORY as string;
	const collateral = process.env.COLLATERAL as string; // e.g., USDC on Sepolia
	const question = process.env.QUESTION as string;
	const endTimeStr = process.env.ENDTIME as string; // unix seconds
	const feeBpsStr = process.env.FEE_BPS as string | undefined; // default 0

	if (!factoryAddr || !collateral || !question || !endTimeStr) {
		throw new Error("Missing env: FACTORY, COLLATERAL, QUESTION, ENDTIME [FEE_BPS optional]");
	}
	const endTime = BigInt(endTimeStr);
	const feeBps = feeBpsStr ? Number(feeBpsStr) : 0;

	const Factory = await ethers.getContractFactory("MarketFactory");
	const factory = Factory.attach(factoryAddr).connect(signer);

	const tx = await factory.createMarket(collateral, question, Number(endTime), feeBps);
	console.log("createMarket tx:", tx.hash);
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
	} else {
		console.warn("MarketDeployed event not found; check tx logs.");
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

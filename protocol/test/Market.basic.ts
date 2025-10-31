import { expect } from "chai";
import { ethers } from "hardhat";

describe("Market core flows", function () {
	it("deploys, creates market, trades, resolves, and redeems", async function () {
		const [deployer, traderA, traderB] = await ethers.getSigners();

		// Deploy ERC20Mock as collateral (6 decimals)
		const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
		const collateral = await ERC20Mock.deploy("MockUSD", "mUSD", 6);
		await collateral.waitForDeployment();

		// Mint funds to traders
		const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
		await (await collateral.mint(traderA.address, toUnits(1000))).wait();
		await (await collateral.mint(traderB.address, toUnits(1000))).wait();

		// Deploy oracle and factory
		const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
		const oracle = await Oracle.deploy(deployer.address);
		await oracle.waitForDeployment();
		const Factory = await ethers.getContractFactory("MarketFactory");
		const flatFee = 500000n; // $0.50 in 6 decimals
		const factory = await Factory.deploy(deployer.address, await oracle.getAddress(), deployer.address, flatFee);
		await factory.waitForDeployment();

		// Create market
		const now = Math.floor(Date.now() / 1000);
		const endTime = now + 3600; // 1h from now
		const q = "Will it be sunny today?";
		const txCreate = await factory.createMarket(await collateral.getAddress(), q, endTime, 0);
		const rcpt = await txCreate.wait();
		const ev = rcpt!.logs.map(l => { try { return factory.interface.parseLog({ topics: l.topics as string[], data: l.data as string }); } catch { return null; } }).find(e => e && e.name === "MarketDeployed");
		expect(ev).to.not.be.undefined;
		const marketAddr = (ev as any).args.market as string;
		const vaultAddr = (ev as any).args.vault as string;

		const market = await (await ethers.getContractFactory("Market")).attach(marketAddr);

		// Approvals: approve the Vault (spender) since it calls transferFrom
		await (await collateral.connect(traderA).approve(vaultAddr, toUnits(100))).wait();
		await (await collateral.connect(traderB).approve(vaultAddr, toUnits(100))).wait();

		// Trader A buys long: 10.00, pays 0.50 fee => 9.50 shares
		await (await market.connect(traderA).buy(true, toUnits(10))).wait();
		expect(await market.longOf(traderA.address)).to.equal(9_500_000n);

		// Trader B buys short: 6.00, pays 0.50 fee => 5.50 shares
		await (await market.connect(traderB).buy(false, toUnits(6))).wait();
		expect(await market.shortOf(traderB.address)).to.equal(5_500_000n);

		// Close trading (advance time)
		await ethers.provider.send("evm_increaseTime", [4000]);
		await ethers.provider.send("evm_mine", []);
		await (await market.closeTrading()).wait();

		// Resolve via oracle admin: outcome = 1 (long wins)
		await (await oracle.fulfillResult(await market.marketId(), ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]), "0x")).wait();
		await (await market.settleFromOracle()).wait();

		// Redeem
		const beforeA = await collateral.balanceOf(traderA.address);
		await (await market.connect(traderA).redeem()).wait();
		const afterA = await collateral.balanceOf(traderA.address);
		expect(afterA - beforeA).to.equal(9_500_000n); // equals shares
	});
});

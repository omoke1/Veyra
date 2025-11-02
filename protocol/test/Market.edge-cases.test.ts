import { expect } from "chai";
import { ethers } from "hardhat";

describe("Market Edge Cases & Security", function () {
	let collateral: any;
	let oracle: any;
	let factory: any;
	let market: any;
	let deployer: string;
	let traderA: string;
	let traderB: string;
	let feeRecipient: string;

	beforeEach(async function () {
		[deployer, traderA, traderB, feeRecipient] = await ethers.getSigners();

		// Deploy ERC20Mock
		const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
		collateral = await ERC20Mock.deploy("MockUSD", "mUSD", 6);
		await collateral.waitForDeployment();

		// Mint funds
		const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
		await collateral.mint(traderA.address, toUnits(1000));
		await collateral.mint(traderB.address, toUnits(1000));

		// Deploy oracle and factory
		const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
		oracle = await Oracle.deploy(deployer.address);
		await oracle.waitForDeployment();

		const flatFee = 500000n; // $0.50
		const Factory = await ethers.getContractFactory("MarketFactory");
		factory = await Factory.deploy(
			deployer.address,
			await oracle.getAddress(),
			feeRecipient.address,
			flatFee
		);
		await factory.waitForDeployment();

		// Create market
		const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
		const endTime = blockTimestamp + 3600;
		const tx = await factory.createMarket(
			await collateral.getAddress(),
			"Test Question?",
			endTime,
			0
		);
		const rcpt = await tx.wait();
		const ev = rcpt!.logs
			.map((l) => {
				try {
					return factory.interface.parseLog({ topics: l.topics as string[], data: l.data as string });
				} catch {
					return null;
				}
			})
			.find((e: any) => e && e.name === "MarketDeployed");
		const marketAddr = (ev as any).args.market;
		market = await (await ethers.getContractFactory("Market")).attach(marketAddr);

		// Approve vault
		await collateral.connect(traderA).approve((ev as any).args.vault, toUnits(100));
		await collateral.connect(traderB).approve((ev as any).args.vault, toUnits(100));
	});

	describe("Trading Edge Cases", function () {
		it("should revert buy if collateralIn <= flatFee", async function () {
			const flatFee = await market.flatFee();
			await expect(
				market.connect(traderA).buy(true, flatFee)
			).to.be.revertedWithCustomError(market, "InvalidParameter");
		});

		it("should revert sell if shares <= flatFee", async function () {
			const flatFee = await market.flatFee();
			// First buy some shares
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await market.connect(traderA).buy(true, toUnits(10));

			// Try to sell amount <= flatFee
			await expect(
				market.connect(traderA).sell(true, flatFee)
			).to.be.revertedWithCustomError(market, "InvalidParameter");
		});

		it("should revert sell if insufficient balance", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await expect(
				market.connect(traderA).sell(true, toUnits(100))
			).to.be.revertedWithCustomError(market, "InsufficientBalance");
		});

		it("should revert trade after endTime", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);

			await expect(
				market.connect(traderA).buy(true, toUnits(10))
			).to.be.revertedWithCustomError(market, "TradingClosed");
		});

		it("should revert trade if market is not in Trading status", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);
			await market.closeTrading();

			await expect(
				market.connect(traderA).buy(true, toUnits(10))
			).to.be.revertedWithCustomError(market, "TradingClosed");
		});
	});

	describe("Resolution Edge Cases", function () {
		it("should revert closeTrading if endTime not reached", async function () {
			await expect(market.closeTrading())
				.to.be.revertedWithCustomError(market, "TradingOpen");
		});

		it("should revert closeTrading if already closed", async function () {
			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);
			await market.closeTrading();

			await expect(market.closeTrading())
				.to.be.revertedWithCustomError(market, "InvalidParameter");
		});

		it("should revert requestResolve if not PendingResolve", async function () {
			await expect(market.requestResolve("0x"))
				.to.be.revertedWithCustomError(market, "InvalidParameter");
		});

		it("should revert settleFromOracle if not resolved", async function () {
			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);
			await market.closeTrading();
			await market.requestResolve("0x");

			await expect(market.settleFromOracle())
				.to.be.revertedWithCustomError(market, "MarketNotResolved");
		});

		it("should revert settleFromOracle if outcome > 1", async function () {
			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);
			await market.closeTrading();

			// Fulfill with invalid outcome (2)
			const invalidData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [2]);
			await oracle.fulfillResult(await market.marketId(), invalidData, "0x");

			await expect(market.settleFromOracle())
				.to.be.revertedWithCustomError(market, "InvalidParameter");
		});
	});

	describe("Redemption Edge Cases", function () {
		it("should revert redeem if market not resolved", async function () {
			await expect(market.connect(traderA).redeem())
				.to.be.revertedWithCustomError(market, "MarketNotResolved");
		});

		it("should revert redeem if user has no winning shares", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await market.connect(traderA).buy(false, toUnits(10)); // Buy short

			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);
			await market.closeTrading();

			// Resolve as long wins
			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);
			await oracle.fulfillResult(await market.marketId(), resultData, "0x");
			await market.settleFromOracle();

			// Trader A has short shares, but long won - should revert
			await expect(market.connect(traderA).redeem())
				.to.be.revertedWithCustomError(market, "InvalidParameter");
		});

		it("should allow partial redemption (user can redeem multiple times if they have shares)", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await market.connect(traderA).buy(true, toUnits(20)); // Buy 20 long

			await ethers.provider.send("evm_increaseTime", [4000]);
			await ethers.provider.send("evm_mine", []);
			await market.closeTrading();

			// Resolve as long wins
			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);
			await oracle.fulfillResult(await market.marketId(), resultData, "0x");
			await market.settleFromOracle();

			// First redemption should work
			await expect(market.connect(traderA).redeem()).to.not.be.reverted;

			// Second redemption should fail (shares are zeroed)
			await expect(market.connect(traderA).redeem())
				.to.be.revertedWithCustomError(market, "InvalidParameter");
		});
	});

	describe("Fee Collection", function () {
		it("should collect fee on buy", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			const flatFee = await market.flatFee();
			const beforeBalance = await collateral.balanceOf(feeRecipient.address);

			await market.connect(traderA).buy(true, toUnits(10));

			const afterBalance = await collateral.balanceOf(feeRecipient.address);
			expect(afterBalance - beforeBalance).to.equal(flatFee);
		});

		it("should collect fee on sell", async function () {
			const toUnits = (n: number) => BigInt(Math.floor(n * 1_000_000));
			await market.connect(traderA).buy(true, toUnits(20));
			const flatFee = await market.flatFee();
			const beforeBalance = await collateral.balanceOf(feeRecipient.address);

			const sharesToSell = toUnits(10);
			await market.connect(traderA).sell(true, sharesToSell);

			const afterBalance = await collateral.balanceOf(feeRecipient.address);
			expect(afterBalance - beforeBalance).to.equal(flatFee);
		});
	});

	describe("Factory-only functions", function () {
		it("should allow factory to update flatFee", async function () {
			const factoryAddress = await factory.getAddress();
			// Impersonate the factory contract
			await ethers.provider.send("hardhat_impersonateAccount", [factoryAddress]);
			await ethers.provider.send("hardhat_setBalance", [factoryAddress, "0x1000000000000000000"]); // 1 ETH
			const factorySigner = await ethers.getSigner(factoryAddress);
			
			const newFee = 1000000n;
			await expect(market.connect(factorySigner).updateFlatFee(newFee))
				.to.not.be.reverted;
			expect(await market.flatFee()).to.equal(newFee);
			
			// Stop impersonating
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [factoryAddress]);
		});

		it("should revert if non-factory tries to update flatFee", async function () {
			await expect(market.connect(traderA).updateFlatFee(1000000n))
				.to.be.revertedWithCustomError(market, "OnlyFactory");
		});

		it("should revert if setting zero address for feeRecipient", async function () {
			const factoryAddress = await factory.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [factoryAddress]);
			await ethers.provider.send("hardhat_setBalance", [factoryAddress, "0x1000000000000000000"]);
			const factorySigner = await ethers.getSigner(factoryAddress);
			
			await expect(
				market.connect(factorySigner).updateFeeRecipient(ethers.ZeroAddress)
			).to.be.revertedWithCustomError(market, "ZeroAddress");
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [factoryAddress]);
		});
	});
});


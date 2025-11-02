import { expect } from "chai";
import { ethers } from "hardhat";

describe("MarketFactory", function () {
	let factory: any;
	let oracle: any;
	let admin: string;
	let feeRecipient: string;
	let collateral: any;
	let flatFee: bigint;

	beforeEach(async function () {
		[admin, feeRecipient] = await ethers.getSigners();
		
		// Deploy oracle
		const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
		oracle = await Oracle.deploy(admin.address);
		await oracle.waitForDeployment();

		// Deploy collateral
		const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
		collateral = await ERC20Mock.deploy("MockUSD", "mUSD", 6);
		await collateral.waitForDeployment();

		flatFee = 500000n; // $0.50 in 6 decimals
		
		// Deploy factory
		const Factory = await ethers.getContractFactory("MarketFactory");
		factory = await Factory.deploy(
			admin.address,
			await oracle.getAddress(),
			feeRecipient.address,
			flatFee
		);
		await factory.waitForDeployment();
	});

	describe("Deployment", function () {
		it("should set admin, oracle, feeRecipient, and flatFee", async function () {
			expect(await factory.admin()).to.equal(admin.address);
			expect(await factory.oracle()).to.equal(await oracle.getAddress());
			expect(await factory.feeRecipient()).to.equal(feeRecipient.address);
			expect(await factory.flatFee()).to.equal(flatFee);
		});

		it("should revert if zero addresses provided", async function () {
			const Factory = await ethers.getContractFactory("MarketFactory");
			await expect(
				Factory.deploy(ethers.ZeroAddress, await oracle.getAddress(), feeRecipient.address, flatFee)
			).to.be.revertedWithCustomError(factory, "ZeroAddress");
		});
	});

	describe("createMarket", function () {
		it("should create a new market and emit MarketDeployed event", async function () {
			const question = "Will BTC reach $100k?";
			const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
			const endTime = blockTimestamp + 3600;
			const feeBps = 0;

			const tx = await factory.createMarket(
				await collateral.getAddress(),
				question,
				endTime,
				feeBps
			);
			const rcpt = await tx.wait();

			// Check event
			const ev = rcpt!.logs
				.map((l) => {
					try {
						return factory.interface.parseLog({ topics: l.topics as string[], data: l.data as string });
					} catch {
						return null;
					}
				})
				.find((e: any) => e && e.name === "MarketDeployed");

			expect(ev).to.not.be.undefined;
			const { market, vault, marketId } = (ev as any).args;
			expect(market).to.not.equal(ethers.ZeroAddress);
			expect(vault).to.not.equal(ethers.ZeroAddress);
			expect(marketId).to.equal(
				await factory.computeMarketId(admin.address, question, endTime)
			);
		});

		it("should revert if collateral is zero address", async function () {
			const question = "Test?";
			const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
			const endTime = blockTimestamp + 3600;
			await expect(
				factory.createMarket(ethers.ZeroAddress, question, endTime, 0)
			).to.be.revertedWithCustomError(factory, "ZeroAddress");
		});

		it("should revert if question is empty", async function () {
			const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
			const endTime = blockTimestamp + 3600;
			await expect(
				factory.createMarket(await collateral.getAddress(), "", endTime, 0)
			).to.be.revertedWithCustomError(factory, "InvalidParameter");
		});

		it("should revert if endTime is in the past", async function () {
			const question = "Test?";
			const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
			const pastTime = blockTimestamp - 100;
			await expect(
				factory.createMarket(await collateral.getAddress(), question, pastTime, 0)
			).to.be.revertedWithCustomError(factory, "InvalidTime");
		});

		it("should revert if feeBps > 10000", async function () {
			const question = "Test?";
			const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
			const endTime = blockTimestamp + 3600;
			await expect(
				factory.createMarket(await collateral.getAddress(), question, endTime, 10001)
			).to.be.revertedWithCustomError(factory, "InvalidFee");
		});
	});

	describe("computeMarketId", function () {
		it("should compute deterministic market ID", async function () {
			const question = "Will ETH hit $5000?";
			const endTime = 1735689600;
			const marketId1 = await factory.computeMarketId(admin.address, question, endTime);
			const marketId2 = await factory.computeMarketId(admin.address, question, endTime);
			expect(marketId1).to.equal(marketId2);
		});

		it("should produce different IDs for different creators", async function () {
			const [, otherCreator] = await ethers.getSigners();
			const question = "Test?";
			const endTime = 1735689600;
			const id1 = await factory.computeMarketId(admin.address, question, endTime);
			const id2 = await factory.computeMarketId(otherCreator.address, question, endTime);
			expect(id1).to.not.equal(id2);
		});
	});

	describe("Admin functions", function () {
		it("should allow admin to update oracle", async function () {
			const [, newOracleAdmin] = await ethers.getSigners();
			const NewOracle = await ethers.getContractFactory("VPOOracleChainlink");
			const newOracle = await NewOracle.deploy(newOracleAdmin.address);
			await newOracle.waitForDeployment();

			await expect(factory.connect(admin).setOracle(await newOracle.getAddress()))
				.to.emit(factory, "OracleUpdated")
				.withArgs(await newOracle.getAddress());
			expect(await factory.oracle()).to.equal(await newOracle.getAddress());
		});

		it("should allow admin to update admin", async function () {
			const [, newAdmin] = await ethers.getSigners();
			await expect(factory.connect(admin).setAdmin(newAdmin.address))
				.to.emit(factory, "AdminUpdated")
				.withArgs(newAdmin.address);
			expect(await factory.admin()).to.equal(newAdmin.address);
		});

		it("should allow admin to update fee recipient", async function () {
			const [, newRecipient] = await ethers.getSigners();
			await expect(factory.connect(admin).setFeeRecipient(newRecipient.address))
				.to.emit(factory, "FeeRecipientUpdated")
				.withArgs(newRecipient.address);
			expect(await factory.feeRecipient()).to.equal(newRecipient.address);
		});

		it("should allow admin to update flat fee", async function () {
			const newFee = 1000000n;
			await expect(factory.connect(admin).setFlatFee(newFee))
				.to.emit(factory, "FlatFeeUpdated")
				.withArgs(newFee);
			expect(await factory.flatFee()).to.equal(newFee);
		});

		it("should revert if non-admin tries to update", async function () {
			const [, attacker] = await ethers.getSigners();
			await expect(
				factory.connect(attacker).setOracle(await oracle.getAddress())
			).to.be.revertedWithCustomError(factory, "OnlyAdmin");
		});

		it("should revert if setting zero address for oracle", async function () {
			await expect(
				factory.connect(admin).setOracle(ethers.ZeroAddress)
			).to.be.revertedWithCustomError(factory, "ZeroAddress");
		});
	});
});


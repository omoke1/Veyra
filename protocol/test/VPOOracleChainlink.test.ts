import { expect } from "chai";
import { ethers } from "hardhat";

describe("VPOOracleChainlink", function () {
	let oracle: any;
	let admin: string;
	let user: string;

	beforeEach(async function () {
		[admin, user] = await ethers.getSigners();

		const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
		oracle = await Oracle.deploy(admin.address);
		await oracle.waitForDeployment();
	});

	describe("Deployment", function () {
		it("should set admin", async function () {
			expect(await oracle.admin()).to.equal(admin.address);
		});

		it("should revert if admin is zero address", async function () {
			const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
			await expect(
				Oracle.deploy(ethers.ZeroAddress)
			).to.be.revertedWithCustomError(oracle, "ZeroAddress");
		});
	});

	describe("requestResolve", function () {
		it("should emit ResolveRequested event", async function () {
			const marketId = ethers.id("test-market");
			const extraData = "0x1234";

			await expect(oracle.requestResolve(marketId, extraData))
				.to.emit(oracle, "ResolveRequested")
				.withArgs(marketId, admin.address, extraData);
		});

		it("should allow anyone to request resolution", async function () {
			const marketId = ethers.id("test-market");
			await expect(oracle.connect(user).requestResolve(marketId, "0x"))
				.to.emit(oracle, "ResolveRequested")
				.withArgs(marketId, user.address, "0x");
		});
	});

	describe("fulfillResult", function () {
		it("should store result and emit ResolveFulfilled", async function () {
			const marketId = ethers.id("test-market");
			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);
			const metadata = "0xabcd";

			await expect(oracle.connect(admin).fulfillResult(marketId, resultData, metadata))
				.to.emit(oracle, "ResolveFulfilled")
				.withArgs(marketId, resultData, metadata);

			const [resolved, storedData, storedMetadata] = await oracle.getResult(marketId);
			expect(resolved).to.be.true;
			expect(storedData).to.equal(resultData);
			expect(storedMetadata).to.equal(metadata);
		});

		it("should revert if not called by admin", async function () {
			const marketId = ethers.id("test-market");
			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);

			await expect(
				oracle.connect(user).fulfillResult(marketId, resultData, "0x")
			).to.be.revertedWithCustomError(oracle, "OnlyAdmin");
		});

		it("should allow overwriting result", async function () {
			const marketId = ethers.id("test-market");
			const resultData1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);
			const resultData2 = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [0]);

			await oracle.connect(admin).fulfillResult(marketId, resultData1, "0x");
			await oracle.connect(admin).fulfillResult(marketId, resultData2, "0x");

			const [, storedData] = await oracle.getResult(marketId);
			expect(storedData).to.equal(resultData2);
		});
	});

	describe("getResult", function () {
		it("should return false for unresolved markets", async function () {
			const marketId = ethers.id("unresolved-market");
			const [resolved, resultData, metadata] = await oracle.getResult(marketId);
			expect(resolved).to.be.false;
			expect(resultData).to.equal("0x");
			expect(metadata).to.equal("0x");
		});

		it("should return stored result for resolved markets", async function () {
			const marketId = ethers.id("resolved-market");
			const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]);
			const metadata = "0x123456";

			await oracle.connect(admin).fulfillResult(marketId, resultData, metadata);

			const [resolved, storedData, storedMetadata] = await oracle.getResult(marketId);
			expect(resolved).to.be.true;
			expect(storedData).to.equal(resultData);
			expect(storedMetadata).to.equal(metadata);
		});
	});
});


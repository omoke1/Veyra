import { expect } from "chai";
import { ethers } from "hardhat";
import { VPOAdapter } from "../typechain-types";
import { Errors } from "../typechain-types/contracts/security/Errors";

describe("VPOAdapter", function () {
	let adapter: VPOAdapter;
	let admin: any;
	let avsNode: any;
	let externalMarket: any;
	let otherUser: any;

	beforeEach(async function () {
		[admin, avsNode, externalMarket, otherUser] = await ethers.getSigners();

		const VPOAdapterFactory = await ethers.getContractFactory("VPOAdapter");
		adapter = await VPOAdapterFactory.deploy(admin.address);
		await adapter.waitForDeployment();

		// Add AVS node
		await adapter.connect(admin).setAVSNode(avsNode.address, true);
	});

	describe("Deployment", function () {
		it("Should set admin correctly", async function () {
			expect(await adapter.admin()).to.equal(admin.address);
		});

		it("Should reject zero address admin", async function () {
			const VPOAdapterFactory = await ethers.getContractFactory("VPOAdapter");
			await expect(
				VPOAdapterFactory.deploy(ethers.ZeroAddress)
			).to.be.revertedWithCustomError(adapter, "ZeroAddress");
		});
	});

	describe("AVS Node Management", function () {
		it("Should allow admin to add AVS node", async function () {
			const newAVS = (await ethers.getSigners())[4];
			await expect(adapter.connect(admin).setAVSNode(newAVS.address, true))
				.to.emit(adapter, "AVSNodeUpdated")
				.withArgs(newAVS.address, true);

			expect(await adapter.avsNodes(newAVS.address)).to.be.true;
		});

		it("Should allow admin to remove AVS node", async function () {
			await expect(adapter.connect(admin).setAVSNode(avsNode.address, false))
				.to.emit(adapter, "AVSNodeUpdated")
				.withArgs(avsNode.address, false);

			expect(await adapter.avsNodes(avsNode.address)).to.be.false;
		});

		it("Should reject non-admin from managing AVS nodes", async function () {
			await expect(
				adapter.connect(otherUser).setAVSNode(avsNode.address, false)
			).to.be.revertedWithCustomError(adapter, "OnlyAdmin");
		});

		it("Should reject zero address AVS node", async function () {
			await expect(
				adapter.connect(admin).setAVSNode(ethers.ZeroAddress, true)
			).to.be.revertedWithCustomError(adapter, "ZeroAddress");
		});
	});

	describe("requestVerification", function () {
		it("Should create verification request", async function () {
			const marketRef = ethers.id("test-market-123");
			const data = ethers.toUtf8Bytes("BTC > 100k by Dec 31");

			const tx = await adapter.connect(externalMarket).requestVerification(marketRef, data);
			const receipt = await tx.wait();

			const event = receipt?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			expect(event).to.not.be.undefined;

			if (event) {
				const parsed = adapter.interface.parseLog(event as any);
				expect(parsed?.args[1]).to.equal(externalMarket.address);
				expect(parsed?.args[2]).to.equal(marketRef);
			}
		});

		it("Should generate unique request IDs", async function () {
			const marketRef = ethers.id("test-market");
			const data = ethers.toUtf8Bytes("test data");

			const tx1 = await adapter.connect(externalMarket).requestVerification(marketRef, data);
			const receipt1 = await tx1.wait();

			// Wait a bit to ensure different block.timestamp
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const tx2 = await adapter.connect(externalMarket).requestVerification(marketRef, data);
			const receipt2 = await tx2.wait();

			const event1 = receipt1?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			const event2 = receipt2?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);

			if (event1 && event2) {
				const parsed1 = adapter.interface.parseLog(event1 as any);
				const parsed2 = adapter.interface.parseLog(event2 as any);
				expect(parsed1?.args[0]).to.not.equal(parsed2?.args[0]);
			}
		});
	});

	describe("fulfillVerification", function () {
		let requestId: string;
		const marketRef = ethers.id("fulfill-test");

		beforeEach(async function () {
			const data = ethers.toUtf8Bytes("test query");
			const tx = await adapter.connect(externalMarket).requestVerification(marketRef, data);
			const receipt = await tx.wait();

			const event = receipt?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			if (event) {
				const parsed = adapter.interface.parseLog(event as any);
				requestId = parsed?.args[0] as string;
			}
		});

		it("Should allow AVS node to fulfill request", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const metadata = ethers.toUtf8Bytes('{"timestamp": 1234567890, "source": "test"}');

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(requestId, attestationCid, outcome, metadata)
			)
				.to.emit(adapter, "VerificationFulfilled")
				.withArgs(requestId, attestationCid, outcome, metadata);

			const [exists, cid, result, meta] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.true;
			expect(ethers.toUtf8String(cid)).to.equal(ethers.toUtf8String(attestationCid));
			expect(result).to.equal(outcome);
			expect(ethers.toUtf8String(meta)).to.equal(ethers.toUtf8String(metadata));
		});

		it("Should reject non-AVS node from fulfilling", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const metadata = ethers.toUtf8Bytes("{}");

			await expect(
				adapter
					.connect(otherUser)
					.fulfillVerification(requestId, attestationCid, true, metadata)
			).to.be.revertedWithCustomError(adapter, "Unauthorized");
		});

		it("Should reject fulfillment of non-existent request", async function () {
			const fakeRequestId = ethers.id("fake-request");
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const metadata = ethers.toUtf8Bytes("{}");

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(fakeRequestId, attestationCid, true, metadata)
			).to.be.revertedWithCustomError(adapter, "NotFound");
		});

		it("Should reject double fulfillment", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const metadata = ethers.toUtf8Bytes("{}");

			await adapter
				.connect(avsNode)
				.fulfillVerification(requestId, attestationCid, true, metadata);

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(requestId, attestationCid, false, metadata)
			).to.be.revertedWithCustomError(adapter, "AlreadyFulfilled");
		});
	});

	describe("getFulfillment", function () {
		it("Should return false for non-existent request", async function () {
			const fakeRequestId = ethers.id("non-existent");
			const [exists] = await adapter.getFulfillment(fakeRequestId);
			expect(exists).to.be.false;
		});

		it("Should return false for unfulfilled request", async function () {
			const marketRef = ethers.id("unfulfilled");
			const data = ethers.toUtf8Bytes("test");
			const tx = await adapter.connect(externalMarket).requestVerification(marketRef, data);
			const receipt = await tx.wait();

			const event = receipt?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			if (event) {
				const parsed = adapter.interface.parseLog(event as any);
				const requestId = parsed?.args[0] as string;

				const [exists] = await adapter.getFulfillment(requestId);
				expect(exists).to.be.false;
			}
		});
	});
});


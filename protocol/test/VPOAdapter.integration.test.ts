import { expect } from "chai";
import { ethers } from "hardhat";
import { VPOAdapter } from "../typechain-types";

/**
 * Integration test simulating external prediction market using VPOAdapter
 */
describe("VPOAdapter Integration", function () {
	let adapter: VPOAdapter;
	let admin: any;
	let avsNode: any;
	let externalMarket: any;

	beforeEach(async function () {
		[admin, avsNode, externalMarket] = await ethers.getSigners();

		const VPOAdapterFactory = await ethers.getContractFactory("VPOAdapter");
		adapter = await VPOAdapterFactory.deploy(admin.address);
		await adapter.waitForDeployment();

		// Register AVS node
		await adapter.connect(admin).setAVSNode(avsNode.address, true);
	});

	describe("End-to-End Flow", function () {
		it("Should handle full verification flow: request → AVS fulfills → read result", async function () {
			// Step 1: External market requests verification
			const marketRef = ethers.id("uma-dispute-12345");
			const queryData = ethers.toUtf8Bytes(JSON.stringify({
				question: "Will BTC reach $100k by Dec 31, 2024?",
				sources: ["binance", "coinbase"],
				timestamp: Math.floor(Date.now() / 1000),
			}));

			const tx = await adapter.connect(externalMarket).requestVerification(marketRef, queryData);
			const receipt = await tx.wait();

			// Extract request ID from event
			const event = receipt?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			expect(event).to.not.be.undefined;

			const parsed = adapter.interface.parseLog(event as any);
			const requestId = parsed?.args[0] as string;

			// Verify request was created
			const request = await adapter.getRequest(requestId);
			expect(request.requester).to.equal(externalMarket.address);
			expect(request.marketRef).to.equal(marketRef);

			// Step 2: AVS node processes and fulfills
			const ipfsCid = "QmTestAttestation123456789";
			const attestationCidBytes = ethers.toUtf8Bytes(ipfsCid);
			const outcome = true; // YES
			const metadata = ethers.toUtf8Bytes(JSON.stringify({
				timestamp: Math.floor(Date.now() / 1000),
				sources: ["Binance", "Coinbase", "Kraken"],
				computedBy: "Veyra AVS Node",
			}));

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(requestId, attestationCidBytes, outcome, metadata)
			)
				.to.emit(adapter, "VerificationFulfilled")
				.withArgs(requestId, attestationCidBytes, outcome, metadata);

			// Step 3: External market reads result
			const [exists, cid, result, meta] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.true;
			expect(ethers.toUtf8String(cid)).to.equal(ipfsCid);
			expect(result).to.equal(outcome);
			
			const metaObj = JSON.parse(ethers.toUtf8String(meta));
			expect(metaObj.sources).to.include("Binance");
		});

		it("Should handle multiple concurrent requests", async function () {
			const requests: string[] = [];

			// Create 3 requests
			for (let i = 0; i < 3; i++) {
				const marketRef = ethers.id(`market-${i}`);
				const data = ethers.toUtf8Bytes(`query-${i}`);
				const tx = await adapter.connect(externalMarket).requestVerification(marketRef, data);
				const receipt = await tx.wait();

				const event = receipt?.logs.find(
					(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
				);
				if (event) {
					const parsed = adapter.interface.parseLog(event as any);
					requests.push(parsed?.args[0] as string);
				}
			}

			expect(requests.length).to.equal(3);

			// Fulfill all requests
			for (let i = 0; i < requests.length; i++) {
				const requestId = requests[i];
				const cid = ethers.toUtf8Bytes(`QmTest${i}`);
				const metadata = ethers.toUtf8Bytes("{}");

				await adapter
					.connect(avsNode)
					.fulfillVerification(requestId, cid, i % 2 === 0, metadata);

				const [exists] = await adapter.getFulfillment(requestId);
				expect(exists).to.be.true;
			}
		});
	});

	describe("Mock External Market Contract", function () {
		// Simulate an external market contract that uses the adapter
		it("Should allow external contract to use adapter", async function () {
			const marketRef = ethers.id("gnosis-question-67890");
			const data = ethers.toUtf8Bytes("external market query");

			// Request verification
			const tx = await adapter.connect(externalMarket).requestVerification(marketRef, data);
			const receipt = await tx.wait();

			const event = receipt?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			const parsed = adapter.interface.parseLog(event as any);
			const requestId = parsed?.args[0] as string;

			// Simulate external market checking for result periodically
			let [exists] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.false;

			// AVS fulfills
			const cid = ethers.toUtf8Bytes("QmResult");
			await adapter
				.connect(avsNode)
				.fulfillVerification(requestId, cid, true, ethers.toUtf8Bytes("{}"));

			// External market reads result
			[exists] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.true;
		});
	});
});


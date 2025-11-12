import { expect } from "chai";
import { ethers } from "hardhat";
import { UMAAdapter } from "../typechain-types";
import { MockUMAOptimisticOracle } from "../typechain-types";
import { VPOAdapter } from "../typechain-types";

describe("UMAAdapter", function () {
	let umaAdapter: UMAAdapter;
	let umaOracle: MockUMAOptimisticOracle;
	let vpoAdapter: VPOAdapter;
	let admin: any;
	let user: any;
	let avsNode: any;

	beforeEach(async function () {
		[admin, user, avsNode] = await ethers.getSigners();

		// Deploy VPOAdapter
		const VPOAdapterFactory = await ethers.getContractFactory("VPOAdapter");
		vpoAdapter = await VPOAdapterFactory.deploy(admin.address);
		await vpoAdapter.waitForDeployment();
		const vpoAdapterAddress = await vpoAdapter.getAddress();

		// Add AVS node
		await vpoAdapter.connect(admin).setAVSNode(avsNode.address, true);

		// Deploy Mock UMA Oracle
		const MockUMAFactory = await ethers.getContractFactory("MockUMAOptimisticOracle");
		umaOracle = await MockUMAFactory.deploy();
		await umaOracle.waitForDeployment();
		const umaOracleAddress = await umaOracle.getAddress();

		// Deploy UMAAdapter
		const UMAAdapterFactory = await ethers.getContractFactory("UMAAdapter");
		umaAdapter = await UMAAdapterFactory.deploy(
			vpoAdapterAddress,
			umaOracleAddress,
			admin.address
		);
		await umaAdapter.waitForDeployment();
	});

	describe("Deployment", function () {
		it("should set admin correctly", async function () {
			expect(await umaAdapter.admin()).to.equal(admin.address);
		});

		it("should set VPOAdapter correctly", async function () {
			const vpoAdapterAddress = await vpoAdapter.getAddress();
			expect(await umaAdapter.vpoAdapter()).to.equal(vpoAdapterAddress);
		});

		it("should set UMA Oracle correctly", async function () {
			const umaOracleAddress = await umaOracle.getAddress();
			expect(await umaAdapter.umaOracle()).to.equal(umaOracleAddress);
		});

		it("should reject zero address VPOAdapter", async function () {
			const umaOracleAddress = await umaOracle.getAddress();
			const UMAAdapterFactory = await ethers.getContractFactory("UMAAdapter");
			await expect(
				UMAAdapterFactory.deploy(ethers.ZeroAddress, umaOracleAddress, admin.address)
			).to.be.reverted;
		});

		it("should reject zero address UMA Oracle", async function () {
			const vpoAdapterAddress = await vpoAdapter.getAddress();
			const UMAAdapterFactory = await ethers.getContractFactory("UMAAdapter");
			await expect(
				UMAAdapterFactory.deploy(vpoAdapterAddress, ethers.ZeroAddress, admin.address)
			).to.be.reverted;
		});
	});

	describe("Handle Assertion", function () {
		it("should handle new UMA assertion and create VPOAdapter request", async function () {
			// Create assertion in UMA Oracle
			const claim = ethers.toUtf8Bytes("Will BTC reach $100k?");
			const identifier = ethers.id("YES_NO");
			const currency = ethers.ZeroAddress;
			const bond = 0n;
			const liveness = 3600n; // 1 hour

			const tx = await umaOracle.assertTruth(
				claim,
				user.address,
				ethers.ZeroAddress,
				ethers.ZeroAddress,
				liveness,
				currency,
				bond,
				identifier
			);

			const receipt = await tx.wait();
			const assertionMadeEvent = receipt?.logs.find((log: any) => {
				try {
					return umaOracle.interface.parseLog(log)?.name === "AssertionMade";
				} catch {
					return false;
				}
			});

			expect(assertionMadeEvent).to.not.be.undefined;
			const parsed = umaOracle.interface.parseLog(assertionMadeEvent!);
			const assertionId = parsed?.args[0];

			// Handle assertion via UMAAdapter
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint64"],
				[identifier, currency, liveness]
			);

			const handleTx = await umaAdapter.handleAssertion(assertionId, claim, data);
			const handleReceipt = await handleTx.wait();

			// Check event
			await expect(handleTx)
				.to.emit(umaAdapter, "AssertionHandled")
				.withArgs(assertionId, (value: any) => value !== null, claim);

			// Get request ID
			const requestId = await umaAdapter.getRequestId(assertionId);
			expect(requestId).to.not.equal(ethers.ZeroHash);

			// Verify VPOAdapter request was created
			const [exists] = await vpoAdapter.getFulfillment(requestId);
			expect(exists).to.be.false; // Not fulfilled yet, but request exists
		});

		it("should reject handling already handled assertion", async function () {
			const claim = ethers.toUtf8Bytes("Test claim");
			const identifier = ethers.id("TEST");
			const currency = ethers.ZeroAddress;
			const bond = 0n;
			const liveness = 3600n;

			// Create assertion
			const tx = await umaOracle.assertTruth(
				claim,
				user.address,
				ethers.ZeroAddress,
				ethers.ZeroAddress,
				liveness,
				currency,
				bond,
				identifier
			);
			const receipt = await tx.wait();
			const assertionMadeEvent = receipt?.logs.find((log: any) => {
				try {
					return umaOracle.interface.parseLog(log)?.name === "AssertionMade";
				} catch {
					return false;
				}
			});
			const parsed = umaOracle.interface.parseLog(assertionMadeEvent!);
			const assertionId = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint64"],
				[identifier, currency, liveness]
			);

			// Handle first time
			await umaAdapter.handleAssertion(assertionId, claim, data);

			// Try to handle again
			await expect(umaAdapter.handleAssertion(assertionId, claim, data)).to.be.revertedWithCustomError(
				umaAdapter,
				"AlreadyFulfilled"
			);
		});

		it("should reject handling settled assertion", async function () {
			const claim = ethers.toUtf8Bytes("Test claim");
			const identifier = ethers.id("TEST");
			const currency = ethers.ZeroAddress;
			const bond = 0n;
			const liveness = 3600n;

			// Create and settle assertion
			const tx = await umaOracle.assertTruth(
				claim,
				user.address,
				ethers.ZeroAddress,
				ethers.ZeroAddress,
				liveness,
				currency,
				bond,
				identifier
			);
			const receipt = await tx.wait();
			const assertionMadeEvent = receipt?.logs.find((log: any) => {
				try {
					return umaOracle.interface.parseLog(log)?.name === "AssertionMade";
				} catch {
					return false;
				}
			});
			const parsed = umaOracle.interface.parseLog(assertionMadeEvent!);
			const assertionId = parsed?.args[0];

			// Settle assertion
			await umaOracle.settleAssertion(assertionId, true);

			// Try to handle
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint64"],
				[identifier, currency, liveness]
			);

			await expect(umaAdapter.handleAssertion(assertionId, claim, data)).to.be.revertedWithCustomError(
				umaAdapter,
				"AlreadyFulfilled"
			);
		});
	});

	describe("Submit Outcome to UMA", function () {
		let assertionId: string;
		let requestId: string;
		let claim: Uint8Array;
		let identifier: string;
		let currency: string;
		let bond: bigint;
		let liveness: bigint;

		beforeEach(async function () {
			// Create and handle assertion
			claim = ethers.toUtf8Bytes("Will BTC reach $100k?");
			identifier = ethers.id("YES_NO");
			currency = ethers.ZeroAddress;
			bond = 0n;
			liveness = 3600n;

			const tx = await umaOracle.assertTruth(
				claim,
				user.address,
				ethers.ZeroAddress,
				ethers.ZeroAddress,
				liveness,
				currency,
				bond,
				identifier
			);
			const receipt = await tx.wait();
			const assertionMadeEvent = receipt?.logs.find((log: any) => {
				try {
					return umaOracle.interface.parseLog(log)?.name === "AssertionMade";
				} catch {
					return false;
				}
			});
			const parsed = umaOracle.interface.parseLog(assertionMadeEvent!);
			assertionId = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint64"],
				[identifier, currency, liveness]
			);

			const handleTx = await umaAdapter.handleAssertion(assertionId, claim, data);
			requestId = await umaAdapter.getRequestId(assertionId);
		});

		it("should reject submitting outcome for unfulfilled request", async function () {
			await expect(
				umaAdapter.connect(admin).submitOutcomeToUMA(
					requestId,
					claim,
					liveness,
					currency,
					bond,
					identifier
				)
			).to.be.revertedWithCustomError(umaAdapter, "NotFound");
		});

		it("should submit outcome after VPOAdapter fulfillment", async function () {
			// Fulfill VPOAdapter request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const metadata = ethers.toUtf8Bytes("metadata");

			await vpoAdapter.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata
			);

			// Submit outcome to UMA
			const submitTx = await umaAdapter.connect(admin).submitOutcomeToUMA(
				requestId,
				claim,
				liveness,
				currency,
				bond,
				identifier
			);

			await expect(submitTx)
				.to.emit(umaAdapter, "OutcomeSubmitted")
				.withArgs(assertionId, requestId, outcome);

			// Check that new assertion was created in UMA
			const newAssertionId = await umaAdapter.getAssertionId(requestId);
			expect(newAssertionId).to.not.equal(ethers.ZeroHash);
		});

		it("should reject submitting outcome twice", async function () {
			// Fulfill VPOAdapter request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const metadata = ethers.toUtf8Bytes("metadata");

			await vpoAdapter.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata
			);

			// Submit first time
			await umaAdapter.connect(admin).submitOutcomeToUMA(
				requestId,
				claim,
				liveness,
				currency,
				bond,
				identifier
			);

			// Try to submit again
			await expect(
				umaAdapter.connect(admin).submitOutcomeToUMA(
					requestId,
					claim,
					liveness,
					currency,
					bond,
					identifier
				)
			).to.be.revertedWithCustomError(umaAdapter, "AlreadyFulfilled");
		});

		it("should reject non-admin from submitting outcome", async function () {
			// Fulfill VPOAdapter request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const metadata = ethers.toUtf8Bytes("metadata");

			await vpoAdapter.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata
			);

			// Try to submit as non-admin
			await expect(
				umaAdapter.connect(user).submitOutcomeToUMA(
					requestId,
					claim,
					liveness,
					currency,
					bond,
					identifier
				)
			).to.be.revertedWithCustomError(umaAdapter, "OnlyAdmin");
		});

		it("should handle already settled assertion", async function () {
			// Settle assertion in UMA
			await umaOracle.settleAssertion(assertionId, true);

			// Fulfill VPOAdapter request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const metadata = ethers.toUtf8Bytes("metadata");

			await vpoAdapter.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata
			);

			// Submit outcome (should succeed even though already settled)
			const submitTx = await umaAdapter.connect(admin).submitOutcomeToUMA(
				requestId,
				claim,
				liveness,
				currency,
				bond,
				identifier
			);

			await expect(submitTx)
				.to.emit(umaAdapter, "OutcomeSubmitted")
				.withArgs(assertionId, requestId, true); // Uses settlement resolution
		});
	});

	describe("Mappings", function () {
		it("should correctly map assertion to request", async function () {
			const claim = ethers.toUtf8Bytes("Test");
			const identifier = ethers.id("TEST");
			const currency = ethers.ZeroAddress;
			const bond = 0n;
			const liveness = 3600n;

			// Create assertion
			const tx = await umaOracle.assertTruth(
				claim,
				user.address,
				ethers.ZeroAddress,
				ethers.ZeroAddress,
				liveness,
				currency,
				bond,
				identifier
			);
			const receipt = await tx.wait();
			const assertionMadeEvent = receipt?.logs.find((log: any) => {
				try {
					return umaOracle.interface.parseLog(log)?.name === "AssertionMade";
				} catch {
					return false;
				}
			});
			const parsed = umaOracle.interface.parseLog(assertionMadeEvent!);
			const assertionId = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint64"],
				[identifier, currency, liveness]
			);

			await umaAdapter.handleAssertion(assertionId, claim, data);

			// Check mappings
			const requestId = await umaAdapter.getRequestId(assertionId);
			expect(requestId).to.not.equal(ethers.ZeroHash);

			const mappedAssertionId = await umaAdapter.getAssertionId(requestId);
			expect(mappedAssertionId).to.equal(assertionId);
		});
	});
});


import { expect } from "chai";
import { ethers } from "hardhat";
import { GnosisAdapter } from "../typechain-types";
import { MockGnosisConditionalTokens } from "../typechain-types";
import { VeyraOracleAVS, EigenVerify, Slashing } from "../typechain-types";
import { generateValidProof } from "./helpers/proof";

describe("GnosisAdapter", function () {
	let gnosisAdapter: GnosisAdapter;
	let conditionalTokens: MockGnosisConditionalTokens;
	let veyraOracleAVS: VeyraOracleAVS;
	let eigenVerify: EigenVerify;
	let slashing: Slashing;
	let admin: any;
	let user: any;
	let avsNode: any;
	let oracle: any;

	beforeEach(async function () {
		[admin, user, avsNode, oracle] = await ethers.getSigners();

		// Deploy EigenVerify
		const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
		eigenVerify = await EigenVerifyFactory.deploy(admin.address);
		await eigenVerify.waitForDeployment();

		// Deploy Slashing
		const SlashingFactory = await ethers.getContractFactory("Slashing");
		slashing = await SlashingFactory.deploy(ethers.ZeroAddress);
		await slashing.waitForDeployment();

		// Deploy VeyraOracleAVS
		const VeyraOracleAVSFactory = await ethers.getContractFactory("VeyraOracleAVS");
		veyraOracleAVS = await VeyraOracleAVSFactory.deploy(
			admin.address,
			await eigenVerify.getAddress(),
			await slashing.getAddress()
		);
		await veyraOracleAVS.waitForDeployment();
		const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();

		// Update Slashing
		await slashing.setAVS(veyraOracleAVSAddress);

		// Add AVS node
		await veyraOracleAVS.connect(admin).setAVSNode(avsNode.address, true);
		// Authorize in EigenVerify
		await eigenVerify.connect(admin).setAuthorizedVerifier(avsNode.address, true);
		// Set operator weight
		await veyraOracleAVS.connect(admin).setOperatorWeight(avsNode.address, ethers.parseEther("100"));
		// Add stake
		await slashing.addStake(avsNode.address, ethers.parseEther("1000"));

		// Deploy Mock Gnosis Conditional Tokens
		const MockGnosisFactory = await ethers.getContractFactory("MockGnosisConditionalTokens");
		conditionalTokens = await MockGnosisFactory.deploy();
		await conditionalTokens.waitForDeployment();
		const conditionalTokensAddress = await conditionalTokens.getAddress();

		// Deploy GnosisAdapter
		const GnosisAdapterFactory = await ethers.getContractFactory("GnosisAdapter");
		gnosisAdapter = await GnosisAdapterFactory.deploy(
			veyraOracleAVSAddress,
			conditionalTokensAddress,
			admin.address
		);
		await gnosisAdapter.waitForDeployment();
	});

	describe("Deployment", function () {
		it("should set admin correctly", async function () {
			expect(await gnosisAdapter.admin()).to.equal(admin.address);
		});

		it("should set VeyraOracleAVS correctly", async function () {
			const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();
			expect(await gnosisAdapter.veyraOracleAVS()).to.equal(veyraOracleAVSAddress);
		});

		it("should set ConditionalTokens correctly", async function () {
			const conditionalTokensAddress = await conditionalTokens.getAddress();
			expect(await gnosisAdapter.conditionalTokens()).to.equal(conditionalTokensAddress);
		});

		it("should reject zero address VeyraOracleAVS", async function () {
			const conditionalTokensAddress = await conditionalTokens.getAddress();
			const GnosisAdapterFactory = await ethers.getContractFactory("GnosisAdapter");
			await expect(
				GnosisAdapterFactory.deploy(ethers.ZeroAddress, conditionalTokensAddress, admin.address)
			).to.be.reverted;
		});

		it("should reject zero address ConditionalTokens", async function () {
			const veyraOracleAVSAddress = await veyraOracleAVS.getAddress();
			const GnosisAdapterFactory = await ethers.getContractFactory("GnosisAdapter");
			await expect(
				GnosisAdapterFactory.deploy(veyraOracleAVSAddress, ethers.ZeroAddress, admin.address)
			).to.be.reverted;
		});
	});

	describe("Handle Condition", function () {
		it("should handle new condition and create VeyraOracleAVS request", async function () {
			const questionId = ethers.id("Will BTC reach $100k?");
			const outcomeSlotCount = 2n;

			// Prepare condition in Gnosis
			const tx = await conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount);
			const receipt = await tx.wait();
			const conditionPrepEvent = receipt?.logs.find((log: any) => {
				try {
					return conditionalTokens.interface.parseLog(log)?.name === "ConditionPreparation";
				} catch {
					return false;
				}
			});

			expect(conditionPrepEvent).to.not.be.undefined;
			const parsed = conditionalTokens.interface.parseLog(conditionPrepEvent!);
			const conditionId = parsed?.args[0];

			// Handle condition via GnosisAdapter
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address"],
				[questionId, oracle.address]
			);

			const handleTx = await gnosisAdapter.handleCondition(
				conditionId,
				questionId,
				outcomeSlotCount,
				data
			);

			// Check event
			await expect(handleTx)
				.to.emit(gnosisAdapter, "ConditionHandled")
				.withArgs(conditionId, (value: any) => value !== null, questionId, outcomeSlotCount);

			// Get request ID
			const requestId = await gnosisAdapter.getRequestId(conditionId);
			expect(requestId).to.not.equal(ethers.ZeroHash);

			// Verify VeyraOracleAVS request was created
			const [exists] = await veyraOracleAVS.getFulfillment(requestId);
			expect(exists).to.be.false; // Not fulfilled yet, but request exists
		});

		it("should reject handling already handled condition", async function () {
			const questionId = ethers.id("Test question");
			const outcomeSlotCount = 2n;

			// Prepare condition
			const tx = await conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount);
			const receipt = await tx.wait();
			const conditionPrepEvent = receipt?.logs.find((log: any) => {
				try {
					return conditionalTokens.interface.parseLog(log)?.name === "ConditionPreparation";
				} catch {
					return false;
				}
			});
			const parsed = conditionalTokens.interface.parseLog(conditionPrepEvent!);
			const conditionId = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address"],
				[questionId, oracle.address]
			);

			// Handle first time
			await gnosisAdapter.handleCondition(conditionId, questionId, outcomeSlotCount, data);

			// Try to handle again
			await expect(
				gnosisAdapter.handleCondition(conditionId, questionId, outcomeSlotCount, data)
			).to.be.revertedWithCustomError(gnosisAdapter, "AlreadyFulfilled");
		});

		it("should reject handling resolved condition", async function () {
			const questionId = ethers.id("Test question");
			const outcomeSlotCount = 2n;

			// Prepare condition
			const tx = await conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount);
			const receipt = await tx.wait();
			const conditionPrepEvent = receipt?.logs.find((log: any) => {
				try {
					return conditionalTokens.interface.parseLog(log)?.name === "ConditionPreparation";
				} catch {
					return false;
				}
			});
			const parsed = conditionalTokens.interface.parseLog(conditionPrepEvent!);
			const conditionId = parsed?.args[0];

			// Resolve condition
			const payouts = [1n, 0n]; // YES wins
			await conditionalTokens.reportPayouts(conditionId, payouts);

			// Try to handle
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address"],
				[questionId, oracle.address]
			);

			await expect(
				gnosisAdapter.handleCondition(conditionId, questionId, outcomeSlotCount, data)
			).to.be.revertedWithCustomError(gnosisAdapter, "AlreadyFulfilled");
		});
	});

	describe("Resolve Condition", function () {
		let conditionId: string;
		let requestId: string;
		let questionId: string;
		let outcomeSlotCount: bigint;

		beforeEach(async function () {
			// Prepare and handle condition
			questionId = ethers.id("Will BTC reach $100k?");
			outcomeSlotCount = 2n;

			const tx = await conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount);
			const receipt = await tx.wait();
			const conditionPrepEvent = receipt?.logs.find((log: any) => {
				try {
					return conditionalTokens.interface.parseLog(log)?.name === "ConditionPreparation";
				} catch {
					return false;
				}
			});
			const parsed = conditionalTokens.interface.parseLog(conditionPrepEvent!);
			conditionId = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address"],
				[questionId, oracle.address]
			);

			await gnosisAdapter.handleCondition(conditionId, questionId, outcomeSlotCount, data);
			requestId = await gnosisAdapter.getRequestId(conditionId);
		});

		it("should reject resolving condition for unfulfilled request", async function () {
			await expect(
				gnosisAdapter.connect(admin).resolveCondition(requestId, outcomeSlotCount)
			).to.be.revertedWithCustomError(gnosisAdapter, "NotFound");
		});

		it("should resolve condition after VeyraOracleAVS fulfillment (YES outcome)", async function () {
			// Fulfill VeyraOracleAVS request with YES outcome
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true; // YES
			const timestamp = Math.floor(Date.now() / 1000);
			
			// Generate valid proof with defaults because request data is not (string, string)
			const { proof } = await generateValidProof(avsNode, "default-source", "default-logic", "YES", timestamp);
			const metadata = proof;

			await veyraOracleAVS.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata,
				timestamp
			);

			// Resolve condition
			const resolveTx = await gnosisAdapter.connect(admin).resolveCondition(requestId, outcomeSlotCount);

			await expect(resolveTx)
				.to.emit(gnosisAdapter, "ConditionResolved")
				.withArgs(conditionId, requestId, outcome);

			// Check condition is resolved in Gnosis
			const [resolved, payouts] = await conditionalTokens.getConditionPayouts(conditionId);
			expect(resolved).to.be.true;
			expect(payouts[0]).to.equal(1n); // YES slot wins
			expect(payouts[1]).to.equal(0n); // NO slot loses
		});

		it("should resolve condition after VeyraOracleAVS fulfillment (NO outcome)", async function () {
			// Fulfill VeyraOracleAVS request with NO outcome
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = false; // NO
			const timestamp = Math.floor(Date.now() / 1000);
			
			// Generate valid proof
			const { proof } = await generateValidProof(avsNode, "default-source", "default-logic", "NO", timestamp);
			const metadata = proof;

			await veyraOracleAVS.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata,
				timestamp
			);

			// Resolve condition
			const resolveTx = await gnosisAdapter.connect(admin).resolveCondition(requestId, outcomeSlotCount);

			await expect(resolveTx)
				.to.emit(gnosisAdapter, "ConditionResolved")
				.withArgs(conditionId, requestId, outcome);

			// Check condition is resolved in Gnosis
			const [resolved, payouts] = await conditionalTokens.getConditionPayouts(conditionId);
			expect(resolved).to.be.true;
			expect(payouts[0]).to.equal(0n); // YES slot loses
			expect(payouts[1]).to.equal(1n); // NO slot wins
		});

		it("should reject resolving condition twice", async function () {
			// Fulfill VeyraOracleAVS request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(avsNode, "default-source", "default-logic", "YES", timestamp);
			const metadata = proof;

			await veyraOracleAVS.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata,
				timestamp
			);

			// Resolve first time
			await gnosisAdapter.connect(admin).resolveCondition(requestId, outcomeSlotCount);

			// Try to resolve again
			await expect(
				gnosisAdapter.connect(admin).resolveCondition(requestId, outcomeSlotCount)
			).to.be.revertedWithCustomError(gnosisAdapter, "AlreadyFulfilled");
		});

		it("should reject non-admin from resolving condition", async function () {
			// Fulfill VeyraOracleAVS request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(avsNode, "default-source", "default-logic", "YES", timestamp);
			const metadata = proof;

			await veyraOracleAVS.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata,
				timestamp
			);

			// Try to resolve as non-admin
			await expect(
				gnosisAdapter.connect(user).resolveCondition(requestId, outcomeSlotCount)
			).to.be.revertedWithCustomError(gnosisAdapter, "OnlyAdmin");
		});

		it("should handle already resolved condition", async function () {
			// Resolve condition directly in Gnosis
			const payouts = [1n, 0n];
			await conditionalTokens.reportPayouts(conditionId, payouts);

			// Fulfill VeyraOracleAVS request
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(avsNode, "default-source", "default-logic", "YES", timestamp);
			const metadata = proof;

			await veyraOracleAVS.connect(avsNode).fulfillVerification(
				requestId,
				attestationCid,
				outcome,
				metadata,
				timestamp
			);

			// Resolve (should succeed even though already resolved)
			const resolveTx = await gnosisAdapter.connect(admin).resolveCondition(requestId, outcomeSlotCount);

			await expect(resolveTx)
				.to.emit(gnosisAdapter, "ConditionResolved")
				.withArgs(conditionId, requestId, outcome);
		});

		it("should handle multiple outcome slots", async function () {
			// Create condition with 3 outcome slots
			const questionId3 = ethers.id("Multi-outcome test");
			const outcomeSlotCount3 = 3n;

			const tx = await conditionalTokens.prepareCondition(oracle.address, questionId3, outcomeSlotCount3);
			const receipt = await tx.wait();
			const conditionPrepEvent = receipt?.logs.find((log: any) => {
				try {
					return conditionalTokens.interface.parseLog(log)?.name === "ConditionPreparation";
				} catch {
					return false;
				}
			});
			const parsed = conditionalTokens.interface.parseLog(conditionPrepEvent!);
			const conditionId3 = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address"],
				[questionId3, oracle.address]
			);

			await gnosisAdapter.handleCondition(conditionId3, questionId3, outcomeSlotCount3, data);
			const requestId3 = await gnosisAdapter.getRequestId(conditionId3);

			// Fulfill with NO outcome (should go to last slot)
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = false; // NO
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(avsNode, "default-source", "default-logic", "NO", timestamp);
			const metadata = proof;

			await veyraOracleAVS.connect(avsNode).fulfillVerification(
				requestId3,
				attestationCid,
				outcome,
				metadata,
				timestamp
			);

			// Resolve
			await gnosisAdapter.connect(admin).resolveCondition(requestId3, outcomeSlotCount3);

			// Check payouts: [0, 0, 1] (last slot wins)
			const [resolved, payouts] = await conditionalTokens.getConditionPayouts(conditionId3);
			expect(resolved).to.be.true;
			expect(payouts[0]).to.equal(0n);
			expect(payouts[1]).to.equal(0n);
			expect(payouts[2]).to.equal(1n);
		});
	});

	describe("Mappings", function () {
		it("should correctly map condition to request", async function () {
			const questionId = ethers.id("Test question");
			const outcomeSlotCount = 2n;

			// Prepare condition
			const tx = await conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount);
			const receipt = await tx.wait();
			const conditionPrepEvent = receipt?.logs.find((log: any) => {
				try {
					return conditionalTokens.interface.parseLog(log)?.name === "ConditionPreparation";
				} catch {
					return false;
				}
			});
			const parsed = conditionalTokens.interface.parseLog(conditionPrepEvent!);
			const conditionId = parsed?.args[0];

			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address"],
				[questionId, oracle.address]
			);

			await gnosisAdapter.handleCondition(conditionId, questionId, outcomeSlotCount, data);

			// Check mappings
			const requestId = await gnosisAdapter.getRequestId(conditionId);
			expect(requestId).to.not.equal(ethers.ZeroHash);

			const mappedConditionId = await gnosisAdapter.getConditionId(requestId);
			expect(mappedConditionId).to.equal(conditionId);
		});
	});
});


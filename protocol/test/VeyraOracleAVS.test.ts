import { expect } from "chai";
import { ethers } from "hardhat";
import { VeyraOracleAVS, EigenVerify } from "../typechain-types";
import { Errors } from "../typechain-types/contracts/security/Errors";
import { generateValidProof } from "./helpers/proof";

describe("VeyraOracleAVS", function () {
	let adapter: VeyraOracleAVS;
	let eigenVerify: EigenVerify;
	let mockDelegationManager: any;
	let mockAllocationManager: any;
	let mockSlashingCoordinator: any;
	let admin: any;
	let avsNode: any;
	let externalMarket: any;
	let otherUser: any;
	let avsId: string;

	beforeEach(async function () {
		[admin, avsNode, externalMarket, otherUser] = await ethers.getSigners();

		// Deploy mock EigenLayer contracts
		const MockDelegationManagerFactory = await ethers.getContractFactory("MockDelegationManager");
		mockDelegationManager = await MockDelegationManagerFactory.deploy();
		await mockDelegationManager.waitForDeployment();

		const MockAllocationManagerFactory = await ethers.getContractFactory("MockAllocationManager");
		mockAllocationManager = await MockAllocationManagerFactory.deploy();
		await mockAllocationManager.waitForDeployment();

		const MockSlashingCoordinatorFactory = await ethers.getContractFactory("MockSlashingCoordinator");
		mockSlashingCoordinator = await MockSlashingCoordinatorFactory.deploy();
		await mockSlashingCoordinator.waitForDeployment();

		// Deploy EigenVerify (optional - can be address(0))
		const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
		eigenVerify = await EigenVerifyFactory.deploy(admin.address);
		await eigenVerify.waitForDeployment();
		
		// Deploy VeyraOracleAVS with EigenLayer contracts
		const VeyraOracleAVSFactory = await ethers.getContractFactory("VeyraOracleAVS");
		adapter = await VeyraOracleAVSFactory.deploy(
			admin.address,
			await mockDelegationManager.getAddress(),
			await mockAllocationManager.getAddress(),
			await mockSlashingCoordinator.getAddress(),
			await eigenVerify.getAddress()
		);
		await adapter.waitForDeployment();

		// Register AVS and get AVS ID
		const metadataURI = "https://ipfs.io/ipfs/test";
		const slashingParams = ethers.AbiCoder.defaultAbiCoder().encode(
			["address", "uint256"],
			[await adapter.getAddress(), 66]
		);
		const registerTx = await mockAllocationManager.registerAVS(metadataURI, slashingParams);
		await registerTx.wait();
		avsId = await mockAllocationManager.getAVSId(await adapter.getAddress());
		
		// Set AVS ID in adapter
		await adapter.connect(admin).setAVSId(avsId);

		// Register operator to AVS
		await mockAllocationManager.registerOperatorToAVS(avsNode.address, avsId);
		
		// Set operator shares in DelegationManager
		await mockDelegationManager.setOperatorShares(
			avsNode.address,
			await adapter.getAddress(),
			ethers.parseEther("100")
		);
		await mockDelegationManager.setOperator(avsNode.address, true);
		
		// Authorize operator in EigenVerify
		await eigenVerify.connect(admin).setAuthorizedVerifier(avsNode.address, true);
	});

	describe("Deployment", function () {
		it("Should set admin correctly", async function () {
			expect(await adapter.admin()).to.equal(admin.address);
		});

		it("Should reject zero address admin", async function () {
			const MockDelegationManagerFactory = await ethers.getContractFactory("MockDelegationManager");
			const mockDM = await MockDelegationManagerFactory.deploy();
			await mockDM.waitForDeployment();

			const MockAllocationManagerFactory = await ethers.getContractFactory("MockAllocationManager");
			const mockAM = await MockAllocationManagerFactory.deploy();
			await mockAM.waitForDeployment();

			const MockSlashingCoordinatorFactory = await ethers.getContractFactory("MockSlashingCoordinator");
			const mockSC = await MockSlashingCoordinatorFactory.deploy();
			await mockSC.waitForDeployment();

			const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
			const eigenVerifyTemp = await EigenVerifyFactory.deploy(admin.address);
			await eigenVerifyTemp.waitForDeployment();
			
			const VeyraOracleAVSFactory = await ethers.getContractFactory("VeyraOracleAVS");
			await expect(
				VeyraOracleAVSFactory.deploy(
					ethers.ZeroAddress,
					await mockDM.getAddress(),
					await mockAM.getAddress(),
					await mockSC.getAddress(),
					await eigenVerifyTemp.getAddress()
				)
			).to.be.revertedWithCustomError(adapter, "ZeroAddress");
		});
	});

	describe("AVS Management", function () {
		it("Should allow admin to set AVS ID", async function () {
			const newAvsId = ethers.keccak256(ethers.toUtf8Bytes("new-avs"));
			await expect(adapter.connect(admin).setAVSId(newAvsId))
				.to.emit(adapter, "AVSNodeUpdated");

			expect(await adapter.avsId()).to.equal(newAvsId);
		});

		it("Should reject zero AVS ID", async function () {
			await expect(
				adapter.connect(admin).setAVSId(ethers.ZeroHash)
			).to.be.revertedWithCustomError(adapter, "InvalidParameter");
		});

		it("Should reject non-admin from setting AVS ID", async function () {
			const newAvsId = ethers.keccak256(ethers.toUtf8Bytes("new-avs"));
			await expect(
				adapter.connect(otherUser).setAVSId(newAvsId)
			).to.be.revertedWithCustomError(adapter, "OnlyAdmin");
		});

	});

	describe("requestResolution", function () {
		it("Should create resolution request", async function () {
			const marketRef = ethers.id("test-market-123");
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string"],
				["test-source", "BTC > 100k by Dec 31"]
			);

			const tx = await adapter.connect(externalMarket).requestResolution(marketRef, data);
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
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string"],
				["test-source", "test data"]
			);

			const tx1 = await adapter.connect(externalMarket).requestResolution(marketRef, data);
			const receipt1 = await tx1.wait();

			// Wait a bit to ensure different block.timestamp
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const tx2 = await adapter.connect(externalMarket).requestResolution(marketRef, data);
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
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string"],
				["test-source", "test query"]
			);
			const tx = await adapter.connect(externalMarket).requestResolution(marketRef, data);
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
			const timestamp = Math.floor(Date.now() / 1000);
			
			// Generate valid proof
			const { proof } = await generateValidProof(avsNode, "test-source", "test query", "YES", timestamp);
			
			// Use proof as metadata for legacy support
			const metadata = proof;

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(requestId, attestationCid, outcome, metadata, timestamp)
			)
				.to.emit(adapter, "VerificationFulfilled")
				.withArgs(requestId, attestationCid, outcome, "0x");

			const [exists, cid, result, meta] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.true;
			expect(ethers.toUtf8String(cid)).to.equal(ethers.toUtf8String(attestationCid));
			expect(result).to.equal(outcome);
			// expect(ethers.toUtf8String(meta)).to.equal(ethers.toUtf8String(metadata)); // Metadata is now proof bytes
		});

		it("Should reject non-AVS node from fulfilling", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const metadata = ethers.toUtf8Bytes("metadata");
			const timestamp = Math.floor(Date.now() / 1000);

			await expect(
				adapter
					.connect(otherUser)
					.fulfillVerification(requestId, attestationCid, true, metadata, timestamp)
			).to.be.revertedWithCustomError(adapter, "Unauthorized");
		});

		it("Should reject fulfillment of non-existent request", async function () {
			const fakeRequestId = ethers.id("fake-request");
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const metadata = ethers.toUtf8Bytes("metadata");
			const timestamp = Math.floor(Date.now() / 1000);

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(fakeRequestId, attestationCid, true, metadata, timestamp)
			).to.be.revertedWithCustomError(adapter, "NotFound");
		});

		it("Should reject fulfillment of already fulfilled request", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const outcome = true;
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(avsNode, "test-source", "test query", "YES", timestamp);
			const metadata = proof;

			await adapter
				.connect(avsNode)
				.fulfillVerification(requestId, attestationCid, outcome, metadata, timestamp);

			await expect(
				adapter
					.connect(avsNode)
					.fulfillVerification(requestId, attestationCid, outcome, metadata, timestamp)
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
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string"],
				["test-source", "test"]
			);
			const tx = await adapter.connect(externalMarket).requestResolution(marketRef, data);
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

	describe("Operator Management (EigenLayer)", function () {
		it("Should query operator weight from DelegationManager", async function () {
			const weight = await adapter.getTotalOperatorWeight();
			expect(weight).to.be.gt(0);
		});

		it("Should check if operator is registered", async function () {
			const isRegistered = await adapter.isOperatorRegistered(avsNode.address);
			expect(isRegistered).to.be.true;

			const isNotRegistered = await adapter.isOperatorRegistered(otherUser.address);
			expect(isNotRegistered).to.be.false;
		});

		it("Should update operator shares in DelegationManager", async function () {
			const newWeight = ethers.parseEther("200");
			await mockDelegationManager.setOperatorShares(
				avsNode.address,
				await adapter.getAddress(),
				newWeight
			);

			const totalWeight = await adapter.getTotalOperatorWeight();
			expect(totalWeight).to.equal(newWeight);
		});
	});

	describe("Quorum Consensus", function () {
		let requestId: string;
		let operator1: any;
		let operator2: any;
		let operator3: any;
		const marketRef = ethers.id("quorum-test");

		beforeEach(async function () {
			[operator1, operator2, operator3] = await ethers.getSigners();

			// Register operators to AVS via EigenLayer AllocationManager
			await mockAllocationManager.registerOperatorToAVS(operator1.address, avsId);
			await mockAllocationManager.registerOperatorToAVS(operator2.address, avsId);
			await mockAllocationManager.registerOperatorToAVS(operator3.address, avsId);

			// Set operator shares in DelegationManager (total = 300, need 66% = 198)
			await mockDelegationManager.setOperatorShares(
				operator1.address,
				await adapter.getAddress(),
				ethers.parseEther("100")
			);
			await mockDelegationManager.setOperatorShares(
				operator2.address,
				await adapter.getAddress(),
				ethers.parseEther("100")
			);
			await mockDelegationManager.setOperatorShares(
				operator3.address,
				await adapter.getAddress(),
				ethers.parseEther("100")
			);
			await mockDelegationManager.setOperator(operator1.address, true);
			await mockDelegationManager.setOperator(operator2.address, true);
			await mockDelegationManager.setOperator(operator3.address, true);

			// Authorize operators in EigenVerify (required for proof verification)
			await eigenVerify.connect(admin).setAuthorizedVerifier(operator1.address, true);
			await eigenVerify.connect(admin).setAuthorizedVerifier(operator2.address, true);
			await eigenVerify.connect(admin).setAuthorizedVerifier(operator3.address, true);

			// Create request
			const data = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string"],
				["test-source", "test query"]
			);
			const tx = await adapter.connect(externalMarket).requestResolution(marketRef, data);
			const receipt = await tx.wait();

			const event = receipt?.logs.find(
				(log) => adapter.interface.parseLog(log as any)?.name === "VerificationRequested"
			);
			if (event) {
				const parsed = adapter.interface.parseLog(event as any);
				requestId = parsed?.args[0] as string;
			}
		});

		it("Should allow operators to submit attestations", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			
			// Generate valid proof matching the request
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);

			await expect(
				adapter
					.connect(operator1)
					.submitAttestation(requestId, true, attestationCid, signature, proof, timestamp)
			)
				.to.emit(adapter, "AttestationSubmitted")
				.withArgs(requestId, operator1.address, true, attestationCid, signature);

			const attestations = await adapter.getAttestations(requestId);
			expect(attestations.length).to.equal(1);
			expect(attestations[0].operator).to.equal(operator1.address);
			expect(attestations[0].outcome).to.be.true;
		});

		it("Should reject operator with zero weight from submitting attestation", async function () {
			const zeroWeightOperator = (await ethers.getSigners())[5];
			// Register operator but don't set shares (stays at 0)
			await mockAllocationManager.registerOperatorToAVS(zeroWeightOperator.address, avsId);
			await mockDelegationManager.setOperator(zeroWeightOperator.address, true);
			await eigenVerify.connect(admin).setAuthorizedVerifier(zeroWeightOperator.address, true);

			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(zeroWeightOperator, "test-source", "test query", "YES", timestamp);

			await expect(
				adapter
					.connect(zeroWeightOperator)
					.submitAttestation(requestId, true, attestationCid, signature, proof, timestamp)
			).to.be.revertedWithCustomError(adapter, "Unauthorized");
		});

		it("Should reject duplicate attestation from same operator", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);

			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof, timestamp);

			await expect(
				adapter
					.connect(operator1)
					.submitAttestation(requestId, true, attestationCid, signature, proof, timestamp)
			).to.be.revertedWithCustomError(adapter, "AlreadyFulfilled");
		});

		it("Should track quorum status correctly", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof: proof1 } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);
			const { proof: proof2 } = await generateValidProof(operator2, "test-source", "test query", "YES", timestamp + 1);

			// Submit 2 attestations (200/300 = 66.67% - should reach quorum)
			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof1, timestamp);

			await adapter
				.connect(operator2)
				.submitAttestation(requestId, true, attestationCid, signature, proof2, timestamp + 1);

			const [isQuorumReached, yesWeight, noWeight, requiredWeight] = await adapter.getQuorumStatus(requestId);
			
			expect(isQuorumReached).to.be.true;
			expect(yesWeight).to.equal(ethers.parseEther("200"));
			expect(noWeight).to.equal(0n);
			expect(requiredWeight).to.equal(ethers.parseEther("198")); // 66% of 300
		});

		it("Should emit QuorumReached event when threshold met", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof: proof1 } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);
			const { proof: proof2 } = await generateValidProof(operator2, "test-source", "test query", "YES", timestamp + 1);

			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof1, timestamp);

			await expect(
				adapter
					.connect(operator2)
					.submitAttestation(requestId, true, attestationCid, signature, proof2, timestamp + 1)
			)
				.to.emit(adapter, "QuorumReached")
				.withArgs(requestId, true, ethers.parseEther("200"));
		});

		it("Should allow finalization only after quorum reached", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const aggregateSig = ethers.toUtf8Bytes("0xaggregate");
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof: proof1 } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);
			const { proof: proof2 } = await generateValidProof(operator2, "test-source", "test query", "YES", timestamp + 1);

			// Try to finalize before quorum - should fail
			await expect(
				adapter.connect(operator1).finalizeResolution(requestId, true, aggregateSig)
			).to.be.revertedWithCustomError(adapter, "InvalidParameter");

			// Submit 2 attestations to reach quorum
			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof1, timestamp);
			await adapter
				.connect(operator2)
				.submitAttestation(requestId, true, attestationCid, signature, proof2, timestamp + 1);

			// Now finalization should succeed
			await expect(
				adapter.connect(operator1).finalizeResolution(requestId, true, aggregateSig)
			)
				.to.emit(adapter, "ResolutionFinalized")
				.withArgs(requestId, true, aggregateSig, ethers.parseEther("200"));

			// Check fulfillment
			const [exists, , outcome] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.true;
			expect(outcome).to.be.true;
		});

		it("Should handle conflicting outcomes correctly", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof: proof1yes } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);
			const { proof: proof2no } = await generateValidProof(operator2, "test-source", "test query", "NO", timestamp + 1);
			const { proof: proof3yes } = await generateValidProof(operator3, "test-source", "test query", "YES", timestamp + 2);

			// Operator 1 says YES
			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof1yes, timestamp);

			// Operator 2 says NO
			await adapter
				.connect(operator2)
				.submitAttestation(requestId, false, attestationCid, signature, proof2no, timestamp + 1);

			// Operator 3 says YES (reaches quorum for YES)
			await adapter
				.connect(operator3)
				.submitAttestation(requestId, true, attestationCid, signature, proof3yes, timestamp + 2);

			const [isQuorumReached, yesWeight, noWeight] = await adapter.getQuorumStatus(requestId);
			
			expect(isQuorumReached).to.be.true;
			expect(yesWeight).to.equal(ethers.parseEther("200")); // Operators 1 and 3
			expect(noWeight).to.equal(ethers.parseEther("100")); // Operator 2

			// Should be able to finalize with YES outcome
			await expect(
				adapter.connect(operator1).finalizeResolution(requestId, true, ethers.toUtf8Bytes("0x"))
			).to.emit(adapter, "ResolutionFinalized");
		});

		it("Should reject finalization with wrong outcome", async function () {
			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof: proof1 } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);
			const { proof: proof2 } = await generateValidProof(operator2, "test-source", "test query", "YES", timestamp + 1);

			// Submit 2 YES attestations (reaches quorum for YES)
			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof1, timestamp);
			await adapter
				.connect(operator2)
				.submitAttestation(requestId, true, attestationCid, signature, proof2, timestamp + 1);

			// Try to finalize with NO - should fail
			await expect(
				adapter.connect(operator1).finalizeResolution(requestId, false, ethers.toUtf8Bytes("0x"))
			).to.be.revertedWithCustomError(adapter, "InvalidParameter");
		});

		it("Should require quorum even with single operator (if weight insufficient)", async function () {
			// Set operator1 weight to 50 (need 66% of 100 = 66, but only 50 available)
			// Set total weight to 100, operator1 to 50, operator2 to 50
			await mockDelegationManager.setOperatorShares(
				operator1.address,
				await adapter.getAddress(),
				ethers.parseEther("50")
			);
			await mockDelegationManager.setOperatorShares(
				operator2.address,
				await adapter.getAddress(),
				ethers.parseEther("50")
			);
			// Remove operator3 shares
			await mockDelegationManager.setOperatorShares(
				operator3.address,
				await adapter.getAddress(),
				0n
			);

			const attestationCid = ethers.toUtf8Bytes("QmTest123");
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));
			const timestamp = Math.floor(Date.now() / 1000);
			const { proof: proof1 } = await generateValidProof(operator1, "test-source", "test query", "YES", timestamp);
			const { proof: proof2 } = await generateValidProof(operator2, "test-source", "test query", "YES", timestamp + 1);

			// Single operator with 50% weight - should not reach quorum (need 66%)
			await adapter
				.connect(operator1)
				.submitAttestation(requestId, true, attestationCid, signature, proof1, timestamp);

			const [isQuorumReached] = await adapter.getQuorumStatus(requestId);
			expect(isQuorumReached).to.be.false;

			// Add operator2 to reach quorum
			await adapter
				.connect(operator2)
				.submitAttestation(requestId, true, attestationCid, signature, proof2, timestamp + 1);

			const [isQuorumReached2] = await adapter.getQuorumStatus(requestId);
			expect(isQuorumReached2).to.be.true; // 100/100 = 100% > 66%
		});
	});

	describe("Quorum Threshold Configuration", function () {
		it("Should allow admin to set quorum threshold", async function () {
			await expect(adapter.connect(admin).setQuorumThreshold(75))
				.to.emit(adapter, "QuorumThresholdUpdated")
				.withArgs(75);

			expect(await adapter.quorumThreshold()).to.equal(75);
		});

		it("Should reject threshold > 100", async function () {
			await expect(
				adapter.connect(admin).setQuorumThreshold(101)
			).to.be.revertedWithCustomError(adapter, "InvalidParameter");
		});

		it("Should reject non-admin from setting threshold", async function () {
			await expect(
				adapter.connect(otherUser).setQuorumThreshold(75)
			).to.be.revertedWithCustomError(adapter, "OnlyAdmin");
		});
	});
});

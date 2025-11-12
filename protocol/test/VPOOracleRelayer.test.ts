import { expect } from "chai";
import { ethers } from "hardhat";
import { VPOOracleRelayer } from "../typechain-types";
import { signAttestation, type Attestation } from "./helpers/eip712";

describe("VPOOracleRelayer", function () {
	let relayer: VPOOracleRelayer;
	let relayerAddress: string;
	let admin: any;
	let signer1: any;
	let signer2: any;
	let user: any;
	let signer1Wallet: ethers.Wallet;
	let signer2Wallet: ethers.Wallet;
	let chainId: bigint;

	beforeEach(async function () {
		[admin, signer1, signer2, user] = await ethers.getSigners();

		const Relayer = await ethers.getContractFactory("VPOOracleRelayer");
		relayer = await Relayer.deploy(admin.address);
		await relayer.waitForDeployment();
		relayerAddress = await relayer.getAddress();

		// Get chain ID
		const network = await ethers.provider.getNetwork();
		chainId = network.chainId;

		// Create new wallets for EIP-712 signing (easier than deriving from Hardhat signers)
		// Fund them from admin for gas
		signer1Wallet = ethers.Wallet.createRandom().connect(ethers.provider);
		signer2Wallet = ethers.Wallet.createRandom().connect(ethers.provider);
		
		// Fund wallets for gas
		await admin.sendTransaction({
			to: signer1Wallet.address,
			value: ethers.parseEther("10.0"),
		});
		await admin.sendTransaction({
			to: signer2Wallet.address,
			value: ethers.parseEther("10.0"),
		});

		// Add wallets as authorized signers (using their addresses, not Hardhat signer addresses)
		await relayer.connect(admin).setSigner(signer1Wallet.address, true);
		await relayer.connect(admin).setSigner(signer2Wallet.address, true);
	});


	describe("Deployment", function () {
		it("should set admin correctly", async function () {
			expect(await relayer.admin()).to.equal(admin.address);
		});

		it("should have correct domain separator", async function () {
			const domain = await relayer.DOMAIN_SEPARATOR();
			expect(domain).to.not.equal(ethers.ZeroHash);
			
			// Verify domain separator matches our calculation
			const { getDomainSeparator } = await import("./helpers/eip712");
			const calculatedDomain = getDomainSeparator(chainId, relayerAddress);
			expect(domain).to.equal(calculatedDomain);
		});

		it("should reject zero address admin", async function () {
			const Relayer = await ethers.getContractFactory("VPOOracleRelayer");
			await expect(Relayer.deploy(ethers.ZeroAddress)).to.be.reverted;
		});
	});

	describe("Signer Management", function () {
		it("should allow admin to add signer", async function () {
			const newSigner = ethers.Wallet.createRandom();
			await expect(relayer.connect(admin).setSigner(newSigner.address, true))
				.to.emit(relayer, "SignerUpdated")
				.withArgs(newSigner.address, true);
			
			expect(await relayer.signers(newSigner.address)).to.be.true;
		});

		it("should allow admin to remove signer", async function () {
			await relayer.connect(admin).setSigner(signer1.address, false);
			expect(await relayer.signers(signer1.address)).to.be.false;
		});

		it("should reject non-admin from managing signers", async function () {
			await expect(
				relayer.connect(user).setSigner(signer1.address, false)
			).to.be.reverted;
		});

		it("should reject zero address signer", async function () {
			await expect(
				relayer.connect(admin).setSigner(ethers.ZeroAddress, true)
			).to.be.reverted;
		});
	});

	describe("Request Resolution", function () {
		it("should emit ResolveRequested event", async function () {
			const marketId = ethers.id("test-market");
			const extraData = ethers.toUtf8Bytes("extra");
			
			await expect(relayer.connect(user).requestResolve(marketId, extraData))
				.to.emit(relayer, "ResolveRequested")
				.withArgs(marketId, user.address, extraData);
		});
	});

	describe("Attestation Fulfillment", function () {
		let marketId: string;
		let questionHash: string;
		let attestation: Attestation;

		beforeEach(async function () {
			marketId = ethers.id("test-market");
			questionHash = ethers.id("Will BTC reach $100k?");
			
			attestation = {
				marketId: marketId,
				questionHash: questionHash,
				outcome: 1,
				sourceId: "binance",
				expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
				nonce: BigInt(1),
			};
		});

		it("should fulfill valid attestation from authorized signer", async function () {
			const ipfsCid = "QmTest123";
			
			// Verify signer1Wallet is authorized
			expect(await relayer.signers(signer1Wallet.address)).to.be.true;
			
			// Create signature using the wallet instance (not Hardhat signer)
			const signature = await signAttestation(attestation, signer1Wallet, chainId, relayerAddress);
			expect(signature.length).to.equal(132); // 0x + 130 hex chars = 65 bytes
			
			// Verify the signature format: r (32 bytes) + s (32 bytes) + v (1 byte)
			const sigBytes = ethers.getBytes(signature);
			expect(sigBytes.length).to.equal(65);
			
			// Verify signature recovery locally
			const { getDomainSeparator, getAttestationStructHash } = await import("./helpers/eip712");
			const domainSeparator = getDomainSeparator(chainId, relayerAddress);
			const structHash = getAttestationStructHash(attestation);
			const messageHash = ethers.keccak256(
				ethers.concat([
					ethers.toUtf8Bytes("\x19\x01"),
					domainSeparator,
					structHash,
				])
			);
			const sig = ethers.Signature.from(signature);
			const recoveredAddress = ethers.recoverAddress(ethers.getBytes(messageHash), sig);
			expect(recoveredAddress.toLowerCase()).to.equal(signer1Wallet.address.toLowerCase());

			// Get block timestamp before fulfillment
			const blockBefore = await ethers.provider.getBlock("latest");
			const tx = await relayer.connect(signer1Wallet).fulfillAttestation(attestation, signature, ipfsCid);
			const receipt = await tx.wait();
			const blockAfter = await ethers.provider.getBlock(receipt!.blockNumber);
			
			// Contract uses block.timestamp, not expiresAt
			const expectedMetadata = ethers.AbiCoder.defaultAbiCoder().encode(
				["string", "string", "uint256"],
				[ipfsCid, attestation.sourceId, BigInt(blockAfter!.timestamp)]
			);

			await expect(tx)
				.to.emit(relayer, "ResolveFulfilled")
				.withArgs(marketId, ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]), expectedMetadata)
				.to.emit(relayer, "AttestationFulfilled")
				.withArgs(marketId, signer1Wallet.address, 1, ipfsCid);

			// Verify result is stored
			const [resolved, data, metadata] = await relayer.getResult(marketId);
			expect(resolved).to.be.true;
			expect(data).to.equal(ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [1]));
			// Metadata includes ipfsCid, sourceId, and block timestamp
			const decodedMetadata = ethers.AbiCoder.defaultAbiCoder().decode(["string", "string", "uint256"], metadata);
			expect(decodedMetadata[0]).to.equal(ipfsCid);
			expect(decodedMetadata[1]).to.equal(attestation.sourceId);
			expect(decodedMetadata[2]).to.be.at.least(blockBefore!.timestamp);

			// Verify nonce is marked as used
			expect(await relayer.isNonceUsed(attestation.nonce)).to.be.true;
		});

		it("should reject expired attestation", async function () {
			attestation.expiresAt = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
			const signature = await signAttestation(attestation, signer1Wallet, chainId, relayerAddress);
			
			await expect(
				relayer.connect(signer1Wallet).fulfillAttestation(attestation, signature, "")
			).to.be.revertedWithCustomError(relayer, "Expired");
		});

		it("should reject reused nonce", async function () {
			const signature1 = await signAttestation(attestation, signer1Wallet, chainId, relayerAddress);
			
			// First fulfillment succeeds
			await relayer.connect(signer1Wallet).fulfillAttestation(attestation, signature1, "QmTest1");
			
			// Try to reuse the same nonce
			const attestation2 = { ...attestation };
			const signature2 = await signAttestation(attestation2, signer1Wallet, chainId, relayerAddress);
			
			await expect(
				relayer.connect(signer1Wallet).fulfillAttestation(attestation2, signature2, "QmTest2")
			).to.be.revertedWithCustomError(relayer, "AlreadyUsed");
		});

		it("should reject attestation from unauthorized signer", async function () {
			const unauthorizedWallet = ethers.Wallet.createRandom().connect(ethers.provider);
			// Fund the wallet for gas (in test environment)
			await admin.sendTransaction({
				to: unauthorizedWallet.address,
				value: ethers.parseEther("1.0"),
			});
			const signature = await signAttestation(attestation, unauthorizedWallet, chainId, relayerAddress);
			
			// Contract checks signer after signature recovery, so it reverts with InvalidSignature
			await expect(
				relayer.connect(unauthorizedWallet).fulfillAttestation(attestation, signature, "")
			).to.be.revertedWithCustomError(relayer, "InvalidSignature");
		});

		it("should reject invalid signature", async function () {
			const invalidSignature = "0x" + "0".repeat(130);
			
			await expect(
				relayer.connect(signer1Wallet).fulfillAttestation(attestation, invalidSignature, "")
			).to.be.revertedWithCustomError(relayer, "InvalidSignature");
		});

		it("should accept signature from any authorized signer regardless of submitter", async function () {
			// Sign with signer2Wallet but submit as signer1Wallet
			// The contract recovers the signer from the signature (signer2Wallet)
			// Since signer2Wallet is authorized, it should succeed
			const signature = await signAttestation(attestation, signer2Wallet, chainId, relayerAddress);
			
			// This should succeed because signer2Wallet (the recovered signer) is authorized
			// The contract doesn't check who submits, only who signed
			await expect(
				relayer.connect(signer1Wallet).fulfillAttestation(attestation, signature, "QmTest")
			).to.emit(relayer, "AttestationFulfilled")
				.withArgs(marketId, signer2Wallet.address, attestation.outcome, "QmTest");
		});

		it("should allow different signers to fulfill different attestations", async function () {
			const attestation1: Attestation = {
				...attestation,
				nonce: BigInt(100),
			};
			const attestation2: Attestation = {
				...attestation,
				nonce: BigInt(200),
			};

			const signature1 = await signAttestation(attestation1, signer1Wallet, chainId, relayerAddress);
			const signature2 = await signAttestation(attestation2, signer2Wallet, chainId, relayerAddress);

			await relayer.connect(signer1Wallet).fulfillAttestation(attestation1, signature1, "QmTest1");
			await relayer.connect(signer2Wallet).fulfillAttestation(attestation2, signature2, "QmTest2");

			expect(await relayer.isNonceUsed(BigInt(100))).to.be.true;
			expect(await relayer.isNonceUsed(BigInt(200))).to.be.true;
		});
	});

	describe("Replay Protection", function () {
		it("should track used nonces", async function () {
			const nonce = 456n;
			expect(await relayer.isNonceUsed(nonce)).to.be.false;
		});

		it("should prevent replay attacks with same nonce", async function () {
			const attestation: Attestation = {
				marketId: ethers.id("replay-test"),
				questionHash: ethers.id("Test question"),
				outcome: 0,
				sourceId: "test",
				expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
				nonce: BigInt(999),
			};

			const signature = await signAttestation(attestation, signer1Wallet, chainId, relayerAddress);
			
			// First fulfillment
			await relayer.connect(signer1Wallet).fulfillAttestation(attestation, signature, "QmTest");
			expect(await relayer.isNonceUsed(BigInt(999))).to.be.true;

			// Try to replay with same nonce but different outcome
			const replayAttestation: Attestation = {
				...attestation,
				outcome: 1, // Different outcome
			};
			const replaySignature = await signAttestation(replayAttestation, signer1Wallet, chainId, relayerAddress);

			await expect(
				relayer.connect(signer1Wallet).fulfillAttestation(replayAttestation, replaySignature, "QmReplay")
			).to.be.revertedWithCustomError(relayer, "AlreadyUsed");
		});
	});

	describe("Result Retrieval", function () {
		it("should return false for unresolved markets", async function () {
			const marketId = ethers.id("unresolved-market");
			const [resolved, data, metadata] = await relayer.getResult(marketId);
			
			expect(resolved).to.be.false;
			expect(data).to.equal("0x");
			expect(metadata).to.equal("0x");
		});
	});
});

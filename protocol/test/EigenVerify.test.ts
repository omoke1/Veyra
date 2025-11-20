/**
 * EigenVerify Contract Tests
 * 
 * Tests proof generation and verification end-to-end
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { EigenVerify } from "../typechain-types";
import { generateValidProof } from "./helpers/proof";

describe("EigenVerify", function () {
	let eigenVerify: EigenVerify;
	let admin: any;
	let operator: any;

	beforeEach(async function () {
		[admin, operator] = await ethers.getSigners();

		// Deploy EigenVerify
		const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
		eigenVerify = await EigenVerifyFactory.deploy(admin.address);
		await eigenVerify.waitForDeployment();

		// Authorize operator
		await eigenVerify.connect(admin).setAuthorizedVerifier(operator.address, true);
	});

	describe("Proof Verification", function () {
		it("Should verify a valid proof", async function () {
			const dataSourceId = "test-source";
			const queryLogic = "test query logic";
			const result = "YES";
			const timestamp = Math.floor(Date.now() / 1000);

			// Generate proof
			const { proof, dataSpec } = await generateValidProof(
				operator,
				dataSourceId,
				queryLogic,
				result,
				timestamp
			);

			// Verify proof
			const [valid, verifiedResult] = await eigenVerify.verify(proof, dataSpec);

			expect(valid).to.be.true;
			expect(verifiedResult).to.equal(result);
		});

		it("Should reject proof from unauthorized signer", async function () {
			const unauthorized = (await ethers.getSigners())[2];

			const dataSourceId = "test-source";
			const queryLogic = "test query";
			const result = "YES";
			const timestamp = Math.floor(Date.now() / 1000);

			// Generate proof with unauthorized signer
			const { proof, dataSpec } = await generateValidProof(
				unauthorized,
				dataSourceId,
				queryLogic,
				result,
				timestamp
			);

			// Verify proof should fail
			const [valid, verifiedResult] = await eigenVerify.verify(proof, dataSpec);

			expect(valid).to.be.false;
			expect(verifiedResult).to.equal("");
		});

		it("Should reject proof with mismatched dataSourceId", async function () {
			const dataSourceId = "test-source";
			const queryLogic = "test query";
			const result = "YES";
			const timestamp = Math.floor(Date.now() / 1000);

			// Generate proof
			const { proof, dataSpec } = await generateValidProof(
				operator,
				dataSourceId,
				queryLogic,
				result,
				timestamp
			);

			// Modify dataSpec to have different dataSourceId
			// This should cause verification to fail
			const modifiedDataSpec = ethers.concat([
				ethers.zeroPadValue(ethers.toUtf8Bytes("different-source"), 32), // Different source
				dataSpec.slice(32), // Rest stays the same
			]);

			const [valid, verifiedResult] = await eigenVerify.verify(proof, modifiedDataSpec);

			expect(valid).to.be.false;
			expect(verifiedResult).to.equal("");
		});

		it("Should reject proof with mismatched result", async function () {
			const dataSourceId = "test-source";
			const queryLogic = "test query";
			const result = "YES";
			const timestamp = Math.floor(Date.now() / 1000);

			// Generate proof with YES
			const { proof: proofYes, dataSpec: dataSpecYes } = await generateValidProof(
				operator,
				dataSourceId,
				queryLogic,
				"YES",
				timestamp
			);

			// Create dataSpec with NO
			const { dataSpec: dataSpecNo } = await generateValidProof(
				operator,
				dataSourceId,
				queryLogic,
				"NO",
				timestamp + 1
			);

			// Verify proof (YES) with dataSpec (NO) - should fail
			const [valid, verifiedResult] = await eigenVerify.verify(proofYes, dataSpecNo);

			expect(valid).to.be.false;
			expect(verifiedResult).to.equal("");
		});
	});

	describe("Authorized Verifiers", function () {
		it("Should allow admin to add verifier", async function () {
			const newVerifier = (await ethers.getSigners())[2];

			await expect(eigenVerify.connect(admin).setAuthorizedVerifier(newVerifier.address, true))
				.to.emit(eigenVerify, "VerifierUpdated")
				.withArgs(newVerifier.address, true);

			expect(await eigenVerify.authorizedVerifiers(newVerifier.address)).to.be.true;
		});

		it("Should allow admin to remove verifier", async function () {
			await expect(eigenVerify.connect(admin).setAuthorizedVerifier(operator.address, false))
				.to.emit(eigenVerify, "VerifierUpdated")
				.withArgs(operator.address, false);

			expect(await eigenVerify.authorizedVerifiers(operator.address)).to.be.false;
		});

		it("Should reject non-admin from setting verifier", async function () {
			const otherUser = (await ethers.getSigners())[2];

			await expect(
				eigenVerify.connect(otherUser).setAuthorizedVerifier(operator.address, true)
			).to.be.revertedWithCustomError(eigenVerify, "OnlyAdmin");
		});
	});
});


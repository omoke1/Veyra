import { expect } from "chai";
import { ethers } from "hardhat";
import { VeyraOracleAVS, EigenVerify, Slashing } from "../typechain-types";
import { generateValidProof } from "./helpers/proof";

/**
 * Integration test simulating external prediction market using VeyraOracleAVS
 */
describe("VeyraOracleAVS Integration", function () {
	let adapter: VeyraOracleAVS;
	let eigenVerify: EigenVerify;
	let slashing: Slashing;
	let admin: any;
	let avsNode: any;
	let externalMarket: any;

	beforeEach(async function () {
		[admin, avsNode, externalMarket] = await ethers.getSigners();

		// Deploy dependencies
		const EigenVerifyFactory = await ethers.getContractFactory("EigenVerify");
		eigenVerify = await EigenVerifyFactory.deploy(admin.address);
		await eigenVerify.waitForDeployment();

		const SlashingFactory = await ethers.getContractFactory("Slashing");
		slashing = await SlashingFactory.deploy(ethers.ZeroAddress);
		
		// Deploy VeyraOracleAVS
		const VeyraOracleAVSFactory = await ethers.getContractFactory("VeyraOracleAVS");
		adapter = await VeyraOracleAVSFactory.deploy(
			admin.address,
			await eigenVerify.getAddress(),
			await slashing.getAddress()
		);
		await adapter.waitForDeployment();

		// Setup
		await slashing.setAVS(await adapter.getAddress());
		await adapter.connect(admin).setAVSNode(avsNode.address, true);
		await eigenVerify.connect(admin).setAuthorizedVerifier(avsNode.address, true);
		await slashing.addStake(avsNode.address, ethers.parseEther("1000"));
		await adapter.connect(admin).setOperatorWeight(avsNode.address, ethers.parseEther("100"));
	});

	describe("End-to-End Flow", function () {
		it("Should handle full verification flow: request → AVS fulfills → read result", async function () {
			// Step 1: External market requests resolution
			const marketRef = ethers.id("uma-dispute-12345");
			// abi.encode(source, logic)
			const queryData = new ethers.AbiCoder().encode(
				["string", "string"],
				["binance", "Will BTC reach $100k by Dec 31, 2024?"]
			);

			const tx = await adapter.connect(externalMarket).requestResolution(marketRef, queryData);
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
			const timestamp = Math.floor(Date.now() / 1000);
			
			// Generate valid proof
			const { proof } = await generateValidProof(
				avsNode, 
				"binance", 
				"Will BTC reach $100k by Dec 31, 2024?", 
				"YES", 
				timestamp
			);
			
			// Sign attestation (optional for contract but good for completeness)
			const signature = ethers.toUtf8Bytes("0x" + "a".repeat(130));

			await expect(
				adapter
					.connect(avsNode)
					.submitAttestation(requestId, outcome, attestationCidBytes, signature, proof, timestamp)
			)
				.to.emit(adapter, "AttestationSubmitted")
				.withArgs(requestId, avsNode.address, outcome, attestationCidBytes, signature);

			// Check quorum (should be reached with 1 node having 100% weight)
			const [isQuorumReached] = await adapter.getQuorumStatus(requestId);
			expect(isQuorumReached).to.be.true;

			// Finalize
			await adapter.connect(avsNode).finalizeResolution(requestId, outcome, ethers.toUtf8Bytes(""));

			// Step 3: External market reads result
			const [exists, cid, result] = await adapter.getFulfillment(requestId);
			expect(exists).to.be.true;
			expect(ethers.toUtf8String(cid)).to.equal(ipfsCid);
			expect(result).to.equal(outcome);
		});

		it("Should handle multiple concurrent requests", async function () {
			const requests: string[] = [];

			// Create 3 requests
			for (let i = 0; i < 3; i++) {
				const marketRef = ethers.id(`market-${i}`);
				const data = new ethers.AbiCoder().encode(["string", "string"], ["source", `query-${i}`]);
				const tx = await adapter.connect(externalMarket).requestResolution(marketRef, data);
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
				const timestamp = Math.floor(Date.now() / 1000);
				const outcome = i % 2 === 0;
				const resultStr = outcome ? "YES" : "NO";
				
				const { proof } = await generateValidProof(
					avsNode, 
					"source", 
					`query-${i}`, 
					resultStr, 
					timestamp
				);
				const signature = ethers.toUtf8Bytes("0x");

				await adapter
					.connect(avsNode)
					.submitAttestation(requestId, outcome, cid, signature, proof, timestamp);

				await adapter.connect(avsNode).finalizeResolution(requestId, outcome, ethers.toUtf8Bytes(""));

				const [exists] = await adapter.getFulfillment(requestId);
				expect(exists).to.be.true;
			}
		});
	});
});

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const adapterAddress = process.env.ADAPTER_ADDRESS;
  if (!adapterAddress) {
    throw new Error("ADAPTER_ADDRESS not set in .env");
  }

  // The Request ID from the logs
  const requestId = "0xee100021cf0c4180d3149bda477cbcad26570e105f80ad83c70dc63c2cd061cd";

  console.log(`Checking request status for ${requestId} on adapter ${adapterAddress}...`);

  const VPOAdapter = await ethers.getContractAt("VeyraOracleAVS", adapterAddress);
  
  const request = await VPOAdapter.getRequest(requestId);
  console.log("Request Details:");
  console.log("- Requester:", request.requester);
  console.log("- Fulfilled:", request.fulfilled);
  console.log("- Outcome:", request.outcome);
  console.log("- Attestation CID:", ethers.toUtf8String(request.attestationCid));
  
  if (request.fulfilled) {
    console.log("✅ Request is FULFILLED!");
  } else {
    console.log("❌ Request is NOT fulfilled.");
  }

  const quorumStatus = await VPOAdapter.getQuorumStatus(requestId);
  console.log("\nQuorum Status:");
  console.log("- Is Quorum Reached:", quorumStatus[0]);
  console.log("- Yes Weight:", quorumStatus[1].toString());
  console.log("- No Weight:", quorumStatus[2].toString());
  console.log("- Required Weight:", quorumStatus[3].toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

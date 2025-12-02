import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS;
  if (!ADAPTER_ADDRESS) {
    throw new Error("ADAPTER_ADDRESS not found in .env");
  }

  console.log("Connecting to VPOAdapter at:", ADAPTER_ADDRESS);
  const adapter = await ethers.getContractAt("VeyraOracleAVS", ADAPTER_ADDRESS);

  // Create a mock market ID (keccak256 of a string)
  const marketIdString = `test-market-${Date.now()}`;
  const marketRef = ethers.keccak256(ethers.toUtf8Bytes(marketIdString));
  
  console.log(`Requesting resolution for market: ${marketIdString}`);
  console.log(`Market Ref (Hash): ${marketRef}`);

  // Encode data: source, logic
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string"],
    ["manual_test", "default_logic"]
  );

  const tx = await adapter.requestResolution(marketRef, data);
  console.log("Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt?.blockNumber);

  // Find VerificationRequested event
  const event = receipt?.logs.find((log: any) => {
    try {
        const parsed = adapter.interface.parseLog(log);
        return parsed?.name === "VerificationRequested";
    } catch (e) {
        return false;
    }
  });

  if (event) {
      const parsed = adapter.interface.parseLog(event);
      console.log("✅ VerificationRequested event emitted!");
      console.log("Request ID:", parsed?.args.requestId);
  } else {
      console.log("⚠️ VerificationRequested event NOT found in receipt logs");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const adapterAddress = process.env.ADAPTER_ADDRESS;
  if (!adapterAddress) {
    throw new Error("ADAPTER_ADDRESS not set in .env");
  }

  console.log(`Checking weights on adapter ${adapterAddress}...`);

  const VPOAdapter = await ethers.getContractAt("VeyraOracleAVS", adapterAddress);
  
  const totalWeight = await VPOAdapter.totalOperatorWeight();
  console.log("Total Operator Weight:", totalWeight.toString());

  const quorumThreshold = await VPOAdapter.quorumThreshold();
  console.log("Quorum Threshold:", quorumThreshold.toString(), "%");

  // Check my operator weight
  const avsNodeAddress = "0x0097f33DFc6bB6C7d3Ac494404caC1Eca49bC445";
  const myWeight = await VPOAdapter.operatorWeights(avsNodeAddress);
  console.log(`Weight for ${avsNodeAddress}:`, myWeight.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

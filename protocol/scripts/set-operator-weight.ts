import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const adapterAddress = process.env.ADAPTER_ADDRESS;
  if (!adapterAddress) {
    throw new Error("ADAPTER_ADDRESS not set in .env");
  }

  const avsNodeAddress = "0x0097f33DFc6bB6C7d3Ac494404caC1Eca49bC445";
  const weight = ethers.parseEther("1000"); // Set weight to 1000 ETH

  console.log(`Setting weight for AVS node ${avsNodeAddress} to ${weight} on adapter ${adapterAddress}...`);

  const VPOAdapter = await ethers.getContractAt("VeyraOracleAVS", adapterAddress);
  
  // Register the node
  // Assuming the deployer (signer[0]) has the authority (admin)
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  const tx = await VPOAdapter.setOperatorWeight(avsNodeAddress, weight);
  console.log("Transaction sent:", tx.hash);

  await tx.wait();
  console.log("✅ Operator weight updated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

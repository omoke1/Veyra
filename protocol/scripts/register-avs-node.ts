import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const adapterAddress = process.env.ADAPTER_ADDRESS;
  if (!adapterAddress) {
    throw new Error("ADAPTER_ADDRESS not set in .env");
  }

  // The AVS node address from the logs
  const avsNodeAddress = "0x0097f33DFc6bB6C7d3Ac494404caC1Eca49bC445";

  console.log(`Registering AVS node ${avsNodeAddress} on adapter ${adapterAddress}...`);

  const VPOAdapter = await ethers.getContractAt("VeyraOracleAVS", adapterAddress);
  
  // Check if already registered
  const isRegistered = await VPOAdapter.avsNodes(avsNodeAddress);
  if (isRegistered) {
    console.log("AVS node is already registered.");
    return;
  }

  // Register the node
  // Assuming the deployer (signer[0]) has the authority to register nodes
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  const tx = await VPOAdapter.setAVSNode(avsNodeAddress, true);
  console.log("Transaction sent:", tx.hash);

  await tx.wait();
  console.log("✅ AVS node registered successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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

  console.log(`Checking EigenVerify authorization for ${avsNodeAddress}...`);

  const VPOAdapter = await ethers.getContractAt("VeyraOracleAVS", adapterAddress);
  const eigenVerifyAddress = await VPOAdapter.eigenVerify();
  console.log("EigenVerify address:", eigenVerifyAddress);

  const EigenVerify = await ethers.getContractAt("EigenVerify", eigenVerifyAddress);
  
  // Check if already authorized
  const isAuthorized = await EigenVerify.authorizedVerifiers(avsNodeAddress);
  if (isAuthorized) {
    console.log("AVS node is already authorized in EigenVerify.");
    return;
  }

  // Register the node
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  console.log(`Authorizing ${avsNodeAddress} in EigenVerify...`);
  const tx = await EigenVerify.setAuthorizedVerifier(avsNodeAddress, true);
  console.log("Transaction sent:", tx.hash);

  await tx.wait();
  console.log("✅ AVS node authorized in EigenVerify successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TestERC20 with account:", deployer.address);

  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const token = await TestERC20.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("TestERC20 deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

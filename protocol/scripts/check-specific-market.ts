import { ethers } from "hardhat";

async function main() {
  const marketAddress = "0x3a209a6e2C901b84Df2C6B8C38A165d27ad64B6b";
  console.log(`Checking collateral for market: ${marketAddress}`);
  
  const market = await ethers.getContractAt("Market", marketAddress);
  const collateral = await market.collateral();
  console.log(`Collateral: ${collateral}`);
  
  const testToken = "0x228727D028c45f9fD21f2232e0B3775c5CA972Cc";
  if (collateral.toLowerCase() === testToken.toLowerCase()) {
      console.log("✅ Collateral MATCHES Test Token");
  } else {
      console.log("❌ Collateral DOES NOT MATCH Test Token");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

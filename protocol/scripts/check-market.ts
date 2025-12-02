import { ethers } from "hardhat";

async function main() {
  const factoryAddress = "0xBCBc48a345918eBa593f20E2F684195921ef4f7b"; // From .env
  console.log(`Checking markets from factory: ${factoryAddress}`);
  
  const factory = await ethers.getContractAt("MarketFactory", factoryAddress);
  
  // Get MarketDeployed events
  const filter = factory.filters.MarketDeployed();
  const events = await factory.queryFilter(filter);
  
  console.log(`Found ${events.length} markets`);
  
  if (events.length > 0) {
      const latest = events[events.length - 1];
      const marketAddress = latest.args?.[1]; // market address is 2nd arg
      console.log(`Latest Market: ${marketAddress}`);
      
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

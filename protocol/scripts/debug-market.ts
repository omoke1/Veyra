import { ethers } from "hardhat";

async function main() {
  const marketAddress = "0x465FD0973C98D0226BcD5d3F08a4a71EE43A1A6d"; // Address from screenshot
  const rpcUrl = "https://ethereum-sepolia.publicnode.com";
  
  console.log(`Debugging market at ${marketAddress}`);
  console.log(`Using RPC: ${rpcUrl}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (${network.chainId})`);
  } catch (error: any) {
    console.error("Failed to connect to RPC:", error.message);
    return;
  }

  const market = await ethers.getContractAt("Market", marketAddress);
  // Connect with provider explicitly to avoid using hardhat's default provider if needed
  const marketWithProvider = market.connect(provider);

  try {
    console.log("Fetching status...");
    const status = await marketWithProvider.status();
    console.log("Status:", status);
  } catch (error: any) {
    console.error("Failed to fetch status:", error.message);
  }

  try {
    console.log("Fetching endTime...");
    const endTime = await marketWithProvider.endTime();
    console.log("EndTime:", endTime);
  } catch (error: any) {
    console.error("Failed to fetch endTime:", error.message);
  }

  try {
    console.log("Fetching marketId...");
    const marketId = await marketWithProvider.marketId();
    console.log("MarketId:", marketId);
  } catch (error: any) {
    console.error("Failed to fetch marketId:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

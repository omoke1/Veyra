import { ethers } from "hardhat";

async function main() {
  const tokenAddress = "0x228727D028c45f9fD21f2232e0B3775c5CA972Cc";
  const userAddress = "0x40a2Aa83271dd2F86e7C50C05b60bf3873bA4461"; // User from screenshot

  console.log(`Checking balance for ${userAddress} on ${tokenAddress}`);
  const token = await ethers.getContractAt("IERC20", tokenAddress);
  
  try {
      const balance = await token.balanceOf(userAddress);
      const decimals = await token.decimals(); // Assuming standard ERC20, but might need custom ABI if fails
      console.log(`Raw Balance: ${balance.toString()}`);
      // console.log(`Decimals: ${decimals}`); // IERC20 doesn't always have decimals in interface
      console.log(`Formatted Balance: ${ethers.formatUnits(balance, 18)} (assuming 18 decimals)`);
  } catch (e) {
      console.error("Error fetching balance:", e);
      // Try with basic ABI
      const abi = [
          "function balanceOf(address) view returns (uint256)",
          "function decimals() view returns (uint8)"
      ];
      const provider = ethers.provider;
      const contract = new ethers.Contract(tokenAddress, abi, provider);
      const bal = await contract.balanceOf(userAddress);
      const dec = await contract.decimals();
      console.log(`Balance: ${ethers.formatUnits(bal, dec)} (decimals: ${dec})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

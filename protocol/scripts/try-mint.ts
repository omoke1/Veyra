import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const tokenAddress = "0x228727D028c45f9fD21f2232e0B3775c5CA972Cc";
  const userAddress = "0x40a2Aa83271dd2F86e7C50C05b60bf3873bA4461"; // User's address from screenshot/logs

  console.log(`Checking token at ${tokenAddress}`);
  const token = await ethers.getContractAt("IERC20", tokenAddress);

  // Check balance
  const balance = await token.balanceOf(userAddress);
  console.log(`Current balance: ${ethers.formatEther(balance)}`);

  // Try to mint (assuming MockERC20 interface)
  try {
    console.log("Attempting to mint 1000 tokens...");
    // We need to use a custom interface because IERC20 doesn't have mint
    const abi = ["function mint(address to, uint256 amount) external"];
    const mockToken = new ethers.Contract(tokenAddress, abi, signer);
    
    const tx = await mockToken.mint(userAddress, ethers.parseEther("1000"));
    console.log("Mint tx sent:", tx.hash);
    await tx.wait();
    console.log("Mint successful!");
    
    const newBalance = await token.balanceOf(userAddress);
    console.log(`New balance: ${ethers.formatEther(newBalance)}`);
  } catch (error: any) {
    console.error("Mint failed:", error.message);
    if (error.data) console.error("Error data:", error.data);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

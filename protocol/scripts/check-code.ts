import { ethers } from "hardhat";

async function main() {
  const address = '0x228727D028c45f9fD21f2232e0B3775c5CA972Cc';
  console.log(`Checking code at ${address}...`);
  const code = await ethers.provider.getCode(address);
  console.log("Code length:", code.length);
  if (code === "0x") {
      console.log("❌ Address is NOT a contract (EOA or empty)");
  } else {
      console.log("✅ Address IS a contract");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

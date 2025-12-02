import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const avsAddress = "0x13179cdE5ff82f8ab183a5465445818c243118de";
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing env vars");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Connected with ${wallet.address}`);

  const abi = [
    "function setQuorumThreshold(uint256 threshold) external",
    "function quorumThreshold() external view returns (uint256)"
  ];

  const avs = new ethers.Contract(avsAddress, abi, wallet);

  const currentQuorum = await avs.quorumThreshold();
  console.log(`Current Quorum: ${currentQuorum}%`);

  console.log("Setting Quorum to 10%...");
  const tx = await avs.setQuorumThreshold(10);
  console.log(`Tx sent: ${tx.hash}`);
  await tx.wait();
  console.log("Quorum updated!");

  const newQuorum = await avs.quorumThreshold();
  console.log(`New Quorum: ${newQuorum}%`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

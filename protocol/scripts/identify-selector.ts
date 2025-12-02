import { ethers } from "ethers";

function main() {
  const sig = "settleFromOracle()";
  const selector = ethers.id(sig).slice(0, 10);
  console.log(`${sig} -> ${selector}`);
  
  const fulfill = "fulfillResult(bytes32,bytes,bytes)";
  const sel2 = ethers.id(fulfill).slice(0, 10);
  console.log(`${fulfill} -> ${sel2}`);

  if (selector === "0xbd3fb12f") {
      console.log("MATCH: settleFromOracle");
  }
}

main();

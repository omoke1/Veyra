import { ethers } from "ethers";

const key = "0x2f44e8f15e102e9510760b7d0729075ba54b03378a2d3cced19544ec977de209";
const wallet = new ethers.Wallet(key);
console.log(`Key: ${key}`);
console.log(`Address: ${wallet.address}`);

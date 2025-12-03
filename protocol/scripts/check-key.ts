
import { ethers } from "ethers";

const PRIVATE_KEY = "2693ccf4c05f117c8c4a0524b4c34c043c56f43337655b4c0607c1f38f55081e";
const wallet = new ethers.Wallet(PRIVATE_KEY);
console.log("Address:", wallet.address);

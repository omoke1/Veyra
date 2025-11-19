import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from contracts folder
dotenv.config({ path: path.join(__dirname, "../contracts/.env") });

/**
 * Generate AVS node address from a private key
 * 
 * Usage:
 * 1. Generate a new private key and address
 * 2. Or get address from an existing private key
 */

async function main() {
	console.log("\n🔑 AVS Node Address Generator\n");
	
	// Option 1: Generate a new wallet
	console.log("Option 1: Generate a new AVS node wallet");
	const newWallet = ethers.Wallet.createRandom();
	console.log("New Private Key:", newWallet.privateKey);
	console.log("New Address:", newWallet.address);
	console.log("\n⚠️  IMPORTANT: Save this private key securely!\n");
	
	// Option 2: Get address from existing private key
	const existingPrivateKey = process.env.AVS_PRIVATE_KEY;
	if (existingPrivateKey) {
		console.log("Option 2: Address from AVS_PRIVATE_KEY in .env");
		const wallet = new ethers.Wallet(existingPrivateKey);
		console.log("Address:", wallet.address);
		console.log("\nYou can register this address in VPOAdapter:\n");
		console.log(`adapter.setAVSNode("${wallet.address}", true)`);
	} else {
		console.log("\n💡 To use an existing private key:");
		console.log("   1. Add AVS_PRIVATE_KEY to protocol/contracts/.env");
		console.log("   2. Run this script again to get the address");
	}
	
	console.log("\n📝 Next Steps:");
	console.log("   1. Save the private key (for AVS service)");
	console.log("   2. Register the address in VPOAdapter:");
	console.log("      adapter.setAVSNode(avsAddress, true)");
	console.log("   3. Start the AVS service with the private key");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});





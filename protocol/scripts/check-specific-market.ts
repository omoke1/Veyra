
import { ethers } from "hardhat";

async function main() {
    const marketId = "0x405fc9f8c5f8a7f75c53bb20ac4d91b5a5f7e2622f5a5b905a490d3aaa245714";
    const avsAddress = "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
    
    console.log(`Checking Market ID: ${marketId}`);
    console.log(`AVS Address: ${avsAddress}`);

    const avs = await ethers.getContractAt("VeyraOracleAVS", avsAddress);
    
    try {
        const requestId = await avs.marketToRequestId(marketId);
        console.log("Request ID:", requestId);
        
        if (requestId !== ethers.ZeroHash) {
            const request = await avs.getRequest(requestId);
            console.log("Request Details:");
            console.log("  Requester:", request.requester);
            console.log("  Fulfilled:", request.fulfilled);
            console.log("  Outcome:", request.outcome);
            // console.log("  Metadata:", request.metadata);
            
            const attestations = await avs.getAttestations(requestId);
            console.log("Attestations Count:", attestations.length);
            
            const quorum = await avs.getQuorumStatus(requestId);
            console.log("Quorum Status:");
            console.log("  Reached:", quorum.isQuorumReached);
            console.log("  Yes Weight:", quorum.yesWeight.toString());
            console.log("  No Weight:", quorum.noWeight.toString());
            console.log("  Required:", quorum.requiredWeight.toString());
        } else {
            console.log("No Request ID found for this market ID.");
        }
    } catch (e: any) {
        console.log("Error querying AVS:", e.message);
    }
}

main().catch(console.error);

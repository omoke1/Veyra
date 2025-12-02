
import { ethers } from "ethers";

const errors = [
    "NotAuthorized()",
    "Unauthorized()",
    "OnlyAdmin()",
    "OnlyMarketManager()",
    "OnlyOracleManager()",
    "OnlyFactory()",
    "OnlyMarket()",
    "MarketAlreadyResolved()",
    "MarketNotResolved()",
    "TradingClosed()",
    "TradingOpen()",
    "Paused()",
    "NotPaused()",
    "InvalidParameter()",
    "InvalidFee()",
    "InvalidTime()",
    "ZeroAddress()",
    "InsufficientBalance()",
    "InsufficientCollateral()",
    "TransferFailed()",
    "NotFound()",
    "AlreadyFulfilled()",
    "Expired()",
    "AlreadyUsed()",
    "InvalidSignature()"
];

async function main() {
    console.log("Checking Error Selectors...");
    const target = "0x4a4117f9";
    console.log(`Target Selector: ${target}`);

    for (const err of errors) {
        const selector = ethers.id(err).slice(0, 10);
        console.log(`${err}: ${selector}`);
        if (selector === target) {
            console.log(`✅ MATCH FOUND: ${err}`);
            return;
        }
    }
    console.log("❌ No match found.");
}

main().catch(console.error);

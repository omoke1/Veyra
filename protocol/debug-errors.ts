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

console.log("Searching for 0x6f7eac26...");
errors.forEach(e => {
    const selector = ethers.id(e).substring(0, 10);
    if (selector === "0x6f7eac26") {
        console.log(`MATCH FOUND: ${e} -> ${selector}`);
    } else {
        // console.log(`${e}: ${selector}`);
    }
});

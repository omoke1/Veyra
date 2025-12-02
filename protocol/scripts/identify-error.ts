import { ethers } from "ethers";

const ERRORS = [
  "OnlyFactory()",
  "ZeroAddress()",
  "InvalidParameter()",
  "InvalidTime()",
  "InvalidFee()",
  "TradingClosed()",
  "TradingOpen()",
  "InsufficientBalance()",
  "MarketNotResolved()",
  "AlreadyInitialized()",
  "Unauthorized()",
  "SlippageExceeded()",
  "TransferFailed()",
  "AllowanceExceeded()"
];

function main() {
  console.log("Checking error selectors...");
  for (const err of ERRORS) {
      const selector = ethers.id(err).slice(0, 10);
      console.log(`${selector} : ${err}`);
      if (selector === "0xe2c865df") {
          console.log(`\n✅ MATCH FOUND: ${err}`);
      }
  }
}

main();

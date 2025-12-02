import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseContractError(error: any): string {
  if (!error) return "Unknown error occurred";
  
  // Handle string errors
  if (typeof error === "string") {
    if (error.includes("user rejected") || error.includes("User rejected")) {
      return "Transaction rejected by user";
    }
    return error;
  }

  // Handle object errors
  const msg = error.message || error.reason || JSON.stringify(error);
  
  if (msg.includes("user rejected") || msg.includes("User rejected") || error.code === 4001 || (error.info && error.info.error && error.info.error.code === 4001)) {
    return "Transaction rejected by user";
  }
  
  if (msg.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }

  // Try to extract clean reason from revert
  if (msg.includes("execution reverted:")) {
    return msg.split("execution reverted:")[1].trim();
  }

  // Handle decoded custom errors
  if (msg.includes("TradingClosed")) return "Trading is closed for this market";
  if (msg.includes("TradingOpen")) return "Trading is not yet closed";
  if (msg.includes("InsufficientBalance")) return "Insufficient balance for this trade";
  if (msg.includes("InvalidParameter")) return "Invalid parameter provided";
  if (msg.includes("MarketNotResolved")) return "Market is not yet resolved";
  if (msg.includes("InvalidTime")) return "Invalid time specified";

  // If it's a huge JSON string, try to parse it or just return a generic error
  if (msg.length > 100 && (msg.includes("{") || msg.includes("["))) {
    return "Transaction failed. Check console for details.";
  }

  return msg;
}
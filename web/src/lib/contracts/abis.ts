/**
 * Contract ABIs imported from protocol artifacts
 * Auto-generated from Solidity compilation artifacts
 */

// Import full ABIs from protocol artifacts (copied to web/src/lib/contracts/artifacts)
import VeyraOracleAVSArtifact from "./artifacts/VeyraOracleAVS.json";
import VPOOracleChainlinkArtifact from "./artifacts/VPOOracleChainlink.json";
import MarketFactoryArtifact from "./artifacts/MarketFactory.json";
import MarketArtifact from "./artifacts/Market.json";

// Export full ABIs
export const VeyraOracleAVSABI = VeyraOracleAVSArtifact.abi;
export const VPOOracleChainlinkABI = VPOOracleChainlinkArtifact.abi;
export const MarketFactoryABI = MarketFactoryArtifact.abi;
export const PredictionMarketABI = MarketArtifact.abi;

// ERC20 ABI (standard)
export const ERC20ABI = [
	"function approve(address spender, uint256 amount) external returns (bool)",
	"function allowance(address owner, address spender) external view returns (uint256)",
	"function balanceOf(address account) external view returns (uint256)",
	"function decimals() external view returns (uint8)",
	"function symbol() external view returns (string)",
	"function mint(address to, uint256 amount) external",
] as const;

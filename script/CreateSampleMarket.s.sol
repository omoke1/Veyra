// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import {MarketFactory} from "../contracts/market/MarketFactory.sol";

/// @notice Optionally create a sample market after deployment.
/// Env vars required:
/// - PRIVATE_KEY
/// - FACTORY: deployed MarketFactory address
/// - COLLATERAL: ERC20 collateral token address
contract CreateSampleMarket is Script {
    function run() external {
        address factoryAddr = vm.envAddress("FACTORY");
        address collateral = vm.envAddress("COLLATERAL");
        string memory question = vm.envOr("QUESTION", string("Will BTC > $100k by year-end?"));
        uint256 endTime = vm.envOr("END_TIME", block.timestamp + 7 days);
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(100)));

        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);

        MarketFactory factory = MarketFactory(factoryAddr);
        (address market, address vault) = factory.createMarket(collateral, question, endTime, feeBps);

        vm.stopBroadcast();

        console2.log("Market:", market);
        console2.log("Vault:", vault);
    }
}



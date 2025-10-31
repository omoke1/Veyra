// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import {VPOOracleChainlink} from "../contracts/oracle/VPOOracleChainlink.sol";
import {MarketFactory} from "../contracts/market/MarketFactory.sol";

/// @notice Deploys Phase 1 contracts to Sepolia (or any EVM) using Foundry Script.
/// Env vars required:
/// - PRIVATE_KEY: deployer EOA private key
/// - ADMIN: admin address for both oracle and factory (can be same as deployer)
contract DeploySepolia is Script {
    function run() external {
        address admin = vm.envAddress("ADMIN");

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        VPOOracleChainlink oracle = new VPOOracleChainlink(admin);
        MarketFactory factory = new MarketFactory(admin, address(oracle));

        vm.stopBroadcast();

        console2.log("VPOOracleChainlink:", address(oracle));
        console2.log("MarketFactory:", address(factory));
    }
}



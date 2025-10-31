// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {MarketFactory} from "../contracts/market/MarketFactory.sol";
import {Market} from "../contracts/market/Market.sol";
import {IVPOOracle} from "../contracts/interfaces/IVPOOracle.sol";

contract DummyOracle is IVPOOracle {
    function requestResolve(bytes32, bytes calldata) external {}
    function getResult(bytes32) external pure returns (bool, bytes memory, bytes memory) {
        return (false, bytes(""), bytes(""));
    }
}

contract InvariantTest is Test {
    MarketFactory factory;
    DummyOracle oracle;

    address admin = address(0xA0);

    function setUp() public {
        oracle = new DummyOracle();
        vm.prank(admin);
        factory = new MarketFactory(admin, address(oracle));
    }

    function testCollateralConservationTrivial() public {
        (address mAddr, ) = factory.createMarket(address(0xdead), "Q", block.timestamp + 1 days, 0);
        Market m = Market(mAddr);
        assertEq(address(m).balance, 0);
    }
}



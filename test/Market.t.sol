// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {MarketFactory} from "../contracts/market/MarketFactory.sol";
import {Market} from "../contracts/market/Market.sol";
import {IVPOOracle} from "../contracts/interfaces/IVPOOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FakeOracle is IVPOOracle {
    bytes32 public lastRequest;
    mapping(bytes32 => bytes) public marketResult;

    function requestResolve(bytes32 marketId, bytes calldata) external override {
        lastRequest = marketId;
        emit ResolveRequested(marketId, msg.sender, "");
    }

    function getResult(bytes32 marketId)
        external
        view
        override
        returns (bool resolved, bytes memory resultData, bytes memory metadata)
    {
        bytes memory r = marketResult[marketId];
        return (r.length != 0, r, hex"01");
    }

    function setResult(bytes32 marketId, uint8 outcome) external {
        marketResult[marketId] = abi.encode(outcome);
    }
}

contract TestToken is IERC20 {
    string public name = "Test";
    string public symbol = "T";
    uint8 public decimals = 18;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
    }
}

contract MarketTest is Test {
    MarketFactory factory;
    FakeOracle oracle;
    TestToken token;

    address admin = address(0xD1);

    function setUp() public {
        oracle = new FakeOracle();
        token = new TestToken();
        vm.prank(admin);
        factory = new MarketFactory(admin, address(oracle));
    }

    function test_CreateMarket() public {
        (address mAddr, address vAddr) = factory.createMarket(
            address(token),
            "Will BTC > $100k?",
            block.timestamp + 7 days,
            100
        );
        Market m = Market(mAddr);
        assertEq(address(m.oracle()), address(oracle));
        assertGt(m.endTime(), block.timestamp);
        assertTrue(vAddr != address(0));
    }
}



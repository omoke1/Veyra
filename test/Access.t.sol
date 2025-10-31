// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Roles} from "../contracts/access/Roles.sol";

contract AccessTest is Test {
    function test_RoleConstants() public {
        assertEq(Roles.ADMIN_ROLE, keccak256("ADMIN_ROLE"));
        assertEq(Roles.MARKET_MANAGER_ROLE, keccak256("MARKET_MANAGER_ROLE"));
        assertEq(Roles.ORACLE_MANAGER_ROLE, keccak256("ORACLE_MANAGER_ROLE"));
        assertEq(Roles.PAUSER_ROLE, keccak256("PAUSER_ROLE"));
    }
}



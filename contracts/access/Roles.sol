// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

library Roles {
	bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
	bytes32 internal constant MARKET_MANAGER_ROLE = keccak256("MARKET_MANAGER_ROLE");
	bytes32 internal constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
	bytes32 internal constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
}

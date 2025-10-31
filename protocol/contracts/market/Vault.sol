// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Errors} from "../security/Errors.sol";

/// @notice Escrows collateral for a single market.
contract Vault {
	IERC20 public immutable collateral;
	address public market; // controller set once by factory
	bool private _marketSet;

	mapping(address => uint256) public collateralOf;

	modifier onlyMarket() {
		if (msg.sender != market) revert Errors.OnlyMarket();
		_;
	}

	constructor(address collateral_) {
		if (collateral_ == address(0)) revert Errors.ZeroAddress();
		collateral = IERC20(collateral_);
	}

	function setMarket(address market_) external {
		if (_marketSet) revert Errors.InvalidParameter();
		if (market_ == address(0)) revert Errors.ZeroAddress();
		market = market_;
		_marketSet = true;
	}

	function depositFrom(address payer, uint256 amount) external onlyMarket {
		if (amount == 0) revert Errors.InvalidParameter();
		(bool s) = collateral.transferFrom(payer, address(this), amount);
		if (!s) revert Errors.TransferFailed();
		collateralOf[payer] += amount;
	}

	function withdrawFromTo(address from, address to, uint256 amount) external onlyMarket {
		if (amount == 0) revert Errors.InvalidParameter();
		uint256 bal = collateralOf[from];
		if (bal < amount) revert Errors.InsufficientCollateral();
		collateralOf[from] = bal - amount;
		(bool s) = collateral.transfer(to, amount);
		if (!s) revert Errors.TransferFailed();
	}

	function sweepTo(address to, uint256 amount) external onlyMarket {
		(bool s) = collateral.transfer(to, amount);
		if (!s) revert Errors.TransferFailed();
	}
}

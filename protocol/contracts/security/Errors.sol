// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

library Errors {
	// Access control
	error NotAuthorized();
	error Unauthorized();
	error OnlyAdmin();
	error OnlyMarketManager();
	error OnlyOracleManager();
	error OnlyFactory();
	error OnlyMarket();

	// State
	error MarketAlreadyResolved();
	error MarketNotResolved();
	error TradingClosed();
	error TradingOpen();
	error Paused();
	error NotPaused();

	// Input validation
	error InvalidParameter();
	error InvalidFee();
	error InvalidTime();
	error ZeroAddress();

	// Economic
	error InsufficientBalance();
	error InsufficientCollateral();
	error TransferFailed();

	// Adapter specific
	error NotFound();
	error AlreadyFulfilled();
}

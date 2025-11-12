// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Errors} from "../security/Errors.sol";
import {Market} from "./Market.sol";
import {Vault} from "./Vault.sol";

contract MarketFactory {
	address public admin;
	address public oracle;
	address public feeRecipient;
	uint256 public flatFee; // in collateral units

	event MarketDeployed(bytes32 indexed marketId, address market, address vault, string question, uint256 endTime, uint16 feeBps, uint256 flatFee, address feeRecipient);
	event AdminUpdated(address admin);
	event OracleUpdated(address oracle);
	event FeeRecipientUpdated(address recipient);
	event FlatFeeUpdated(uint256 amount);

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	constructor(address admin_, address oracle_, address feeRecipient_, uint256 flatFee_) {
		if (admin_ == address(0) || oracle_ == address(0) || feeRecipient_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;
		oracle = oracle_;
		feeRecipient = feeRecipient_;
		flatFee = flatFee_;
	}

	function setOracle(address oracle_) external onlyAdmin {
		if (oracle_ == address(0)) revert Errors.ZeroAddress();
		oracle = oracle_;
		emit OracleUpdated(oracle_);
	}

	function setAdmin(address admin_) external onlyAdmin {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;
		emit AdminUpdated(admin_);
	}

	function setFeeRecipient(address recipient) external onlyAdmin {
		if (recipient == address(0)) revert Errors.ZeroAddress();
		feeRecipient = recipient;
		emit FeeRecipientUpdated(recipient);
	}

	function setFlatFee(uint256 amount) external onlyAdmin {
		flatFee = amount;
		emit FlatFeeUpdated(amount);
	}

	function computeMarketId(address creator, string memory question, uint256 endTime) public pure returns (bytes32) {
		return keccak256(abi.encode(creator, question, endTime));
	}

	function createMarket(
		address collateral,
		string memory question,
		uint256 endTime,
		uint16 feeBps
	) external returns (address market, address vault) {
		return createMarketWithOracle(collateral, question, endTime, feeBps, oracle);
	}

	/// @notice Create a market with a specific oracle (or use factory default if address(0))
	/// @param collateral_ The collateral token address
	/// @param question_ The market question
	/// @param endTime_ The trading end time
	/// @param feeBps_ The fee basis points
	/// @param oracle_ The oracle address (address(0) uses factory default)
	function createMarketWithOracle(
		address collateral_,
		string memory question_,
		uint256 endTime_,
		uint16 feeBps_,
		address oracle_
	) public returns (address market, address vault) {
		if (collateral_ == address(0)) revert Errors.ZeroAddress();
		if (bytes(question_).length == 0) revert Errors.InvalidParameter();
		if (endTime_ <= block.timestamp) revert Errors.InvalidTime();
		if (feeBps_ > 10_000) revert Errors.InvalidFee();

		// Use provided oracle or factory default
		address marketOracle = oracle_ == address(0) ? oracle : oracle_;
		if (marketOracle == address(0)) revert Errors.ZeroAddress();

		bytes32 marketId = computeMarketId(msg.sender, question_, endTime_);

		vault = address(new Vault(collateral_));
		market = address(new Market(collateral_, marketOracle, address(this), vault, marketId, question_, endTime_, feeBps_, flatFee, feeRecipient));
		Vault(vault).setMarket(market);

		emit MarketDeployed(marketId, market, vault, question_, endTime_, feeBps_, flatFee, feeRecipient);
	}
}

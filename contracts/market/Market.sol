// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IVPOOracle} from "../interfaces/IVPOOracle.sol";
import {PayoutCalculator} from "../libs/PayoutCalculator.sol";
import {Errors} from "../security/Errors.sol";
import {Vault} from "./Vault.sol";

/// @notice Binary prediction market with escrowed collateral and oracle resolution.
contract Market is ReentrancyGuard, Pausable {
	using PayoutCalculator for uint256;

	enum Status { Trading, PendingResolve, Resolved }

	IERC20 public immutable collateral;
	IVPOOracle public immutable oracle;
	address public immutable factory;
	Vault public immutable vault;

	bytes32 public immutable marketId; // derived by factory
	string public question;
	uint256 public endTime; // trading cutoff
	uint16 public feeBps; // reserved (unused for now)
	uint256 public flatFee; // fixed amount in collateral smallest units (e.g., 0.5 USDC = 500000)
	address public feeRecipient;

	Status public status;
	uint8 public outcome; // 0 = short, 1 = long

	// Simplified share balances per user for long/short
	mapping(address => uint256) public longOf;
	mapping(address => uint256) public shortOf;

	event MarketCreated(bytes32 indexed marketId, string question, uint256 endTime, address oracle);
	event Trade(address indexed trader, bool isLong, uint256 collateralInOrOut, uint256 sharesDelta, uint256 fee);
	event CloseTrading(bytes32 indexed marketId);
	event Resolve(bytes32 indexed marketId, uint8 outcome, bytes resultData, bytes metadata);
	event Redeem(address indexed user, uint256 payout);

	modifier onlyFactory() {
		if (msg.sender != factory) revert Errors.OnlyFactory();
		_;
	}

	constructor(
		address collateral_,
		address oracle_,
		address factory_,
		address vault_,
		bytes32 marketId_,
		string memory question_,
		uint256 endTime_,
		uint16 feeBps_,
		uint256 flatFee_,
		address feeRecipient_
	) {
		if (collateral_ == address(0) || oracle_ == address(0) || factory_ == address(0) || vault_ == address(0)) {
			revert Errors.ZeroAddress();
		}
		if (bytes(question_).length == 0) revert Errors.InvalidParameter();
		if (endTime_ <= block.timestamp) revert Errors.InvalidTime();
		if (feeBps_ > 10_000) revert Errors.InvalidFee();
		if (feeRecipient_ == address(0)) revert Errors.ZeroAddress();

		collateral = IERC20(collateral_);
		oracle = IVPOOracle(oracle_);
		factory = factory_;
		vault = Vault(vault_);
		marketId = marketId_;
		question = question_;
		endTime = endTime_;
		feeBps = feeBps_;
		flatFee = flatFee_;
		feeRecipient = feeRecipient_;

		status = Status.Trading;
		emit MarketCreated(marketId, question_, endTime_, oracle_);
	}

	function buy(bool isLong, uint256 collateralIn) external nonReentrant {
		if (status != Status.Trading) revert Errors.TradingClosed();
		if (block.timestamp >= endTime) revert Errors.TradingClosed();
		if (collateralIn <= flatFee) revert Errors.InvalidParameter();

		uint256 fee = flatFee;
		uint256 amountNet = collateralIn - fee;

		// Pull collateral from trader to vault
		vault.depositFrom(msg.sender, collateralIn);
		// Send fee to recipient out of trader's escrow, then deduct escrowed balance to net
		vault.withdrawTo(feeRecipient, fee);

		// Mint shares 1:1 to net collateral
		if (isLong) {
			longOf[msg.sender] += amountNet;
		} else {
			shortOf[msg.sender] += amountNet;
		}
		emit Trade(msg.sender, isLong, collateralIn, amountNet, fee);
	}

	function sell(bool isLong, uint256 shares) external nonReentrant {
		if (status != Status.Trading) revert Errors.TradingClosed();
		if (block.timestamp >= endTime) revert Errors.TradingClosed();
		if (shares <= flatFee) revert Errors.InvalidParameter();

		uint256 fee = flatFee;
		uint256 amountNet = shares - fee;

		if (isLong) {
			uint256 bal = longOf[msg.sender];
			if (bal < shares) revert Errors.InsufficientBalance();
			longOf[msg.sender] = bal - shares;
		} else {
			uint256 bal = shortOf[msg.sender];
			if (bal < shares) revert Errors.InsufficientBalance();
			shortOf[msg.sender] = bal - shares;
		}

		// Fee sent to recipient, net returned to trader
		vault.withdrawTo(feeRecipient, fee);
		vault.withdrawTo(msg.sender, amountNet);

		emit Trade(msg.sender, isLong, amountNet, shares, fee);
	}

	function closeTrading() external {
		if (block.timestamp < endTime) revert Errors.TradingOpen();
		if (status != Status.Trading) revert Errors.InvalidParameter();
		status = Status.PendingResolve;
		emit CloseTrading(marketId);
	}

	function requestResolve(bytes calldata extraData) external {
		if (status != Status.PendingResolve) revert Errors.InvalidParameter();
		oracle.requestResolve(marketId, extraData);
	}

	function settleFromOracle() external nonReentrant {
		if (status != Status.PendingResolve) revert Errors.InvalidParameter();
		(bool resolved, bytes memory resultData, bytes memory metadata) = oracle.getResult(marketId);
		if (!resolved) revert Errors.MarketNotResolved();
		// Expect resultData to be abi.encode(uint8 outcome)
		uint8 o = abi.decode(resultData, (uint8));
		if (o > 1) revert Errors.InvalidParameter();
		outcome = o;
		status = Status.Resolved;
		emit Resolve(marketId, o, resultData, metadata);
	}

	function redeem() external nonReentrant {
		if (status != Status.Resolved) revert Errors.MarketNotResolved();
		uint256 payout = PayoutCalculator.computeBinary(outcome, longOf[msg.sender], shortOf[msg.sender]);
		if (payout == 0) revert Errors.InvalidParameter();
		longOf[msg.sender] = 0;
		shortOf[msg.sender] = 0;
		vault.withdrawTo(msg.sender, payout);
		emit Redeem(msg.sender, payout);
	}

	// Admin hooks (factory-only)
	function updateFlatFee(uint256 newFee) external onlyFactory {
		flatFee = newFee;
	}

	function updateFeeRecipient(address newRecipient) external onlyFactory {
		if (newRecipient == address(0)) revert Errors.ZeroAddress();
		feeRecipient = newRecipient;
	}
}

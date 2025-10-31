// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

library PayoutCalculator {
	/// @notice Compute payouts for long/short shares in a binary market.
	/// @param outcome 0 = short wins, 1 = long wins.
	/// @param longShares User's long share balance.
	/// @param shortShares User's short share balance.
	/// @return payout Amount of collateral to redeem.
	function computeBinary(uint8 outcome, uint256 longShares, uint256 shortShares)
		internal
		pure
		returns (uint256 payout)
	{
		if (outcome == 0) {
			return shortShares;
		} else if (outcome == 1) {
			return longShares;
		}
		return 0;
	}
}

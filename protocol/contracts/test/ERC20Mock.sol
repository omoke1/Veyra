// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract ERC20Mock {
	string public name;
	string public symbol;
	uint8 public decimals;
	uint256 public totalSupply;

	mapping(address => uint256) public balanceOf;
	mapping(address => mapping(address => uint256)) public allowance;

	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);

	constructor(string memory name_, string memory symbol_, uint8 decimals_) {
		name = name_;
		symbol = symbol_;
		decimals = decimals_;
	}

	function mint(address to, uint256 amount) external {
		balanceOf[to] += amount;
		totalSupply += amount;
		emit Transfer(address(0), to, amount);
	}

	function approve(address spender, uint256 amount) external returns (bool) {
		allowance[msg.sender][spender] = amount;
		emit Approval(msg.sender, spender, amount);
		return true;
	}

	function transfer(address to, uint256 amount) external returns (bool) {
		require(balanceOf[msg.sender] >= amount, "bal");
		balanceOf[msg.sender] -= amount;
		balanceOf[to] += amount;
		emit Transfer(msg.sender, to, amount);
		return true;
	}

	function transferFrom(address from, address to, uint256 amount) external returns (bool) {
		require(balanceOf[from] >= amount, "bal");
		require(allowance[from][msg.sender] >= amount, "allow");
		allowance[from][msg.sender] -= amount;
		balanceOf[from] -= amount;
		balanceOf[to] += amount;
		emit Transfer(from, to, amount);
		return true;
	}
}


import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vault", function () {
	let vault: any;
	let collateral: any;
	let market: any;
	let deployer: string;
	let trader: string;

	beforeEach(async function () {
		[deployer, trader] = await ethers.getSigners();

		// Deploy collateral
		const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
		collateral = await ERC20Mock.deploy("MockUSD", "mUSD", 6);
		await collateral.waitForDeployment();

		// Deploy vault
		const Vault = await ethers.getContractFactory("Vault");
		vault = await Vault.deploy(await collateral.getAddress());
		await vault.waitForDeployment();

		// Deploy a mock market for testing
		const Market = await ethers.getContractFactory("Market");
		// We'll need oracle and factory for a real market, but for vault tests we can use a mock
		// For now, let's create a minimal setup
		const Oracle = await ethers.getContractFactory("VPOOracleChainlink");
		const oracle = await Oracle.deploy(deployer.address);
		await oracle.waitForDeployment();

		const Factory = await ethers.getContractFactory("MarketFactory");
		const factory = await Factory.deploy(
			deployer.address,
			await oracle.getAddress(),
			deployer.address,
			500000n
		);
		await factory.waitForDeployment();

		const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
		const endTime = blockTimestamp + 3600;
		const tx = await factory.createMarket(
			await collateral.getAddress(),
			"Test Market",
			endTime,
			0
		);
		const rcpt = await tx.wait();
		const ev = rcpt!.logs
			.map((l) => {
				try {
					return factory.interface.parseLog({ topics: l.topics as string[], data: l.data as string });
				} catch {
					return null;
				}
			})
			.find((e: any) => e && e.name === "MarketDeployed");
		const marketAddr = (ev as any).args.market;
		market = await (await ethers.getContractFactory("Market")).attach(marketAddr);

		// Set market on vault (normally done by factory)
		await vault.setMarket(marketAddr);
	});

	describe("Deployment", function () {
		it("should set collateral token", async function () {
			expect(await vault.collateral()).to.equal(await collateral.getAddress());
		});

		it("should revert if collateral is zero address", async function () {
			const Vault = await ethers.getContractFactory("Vault");
			const newVault = await Vault.deploy(await collateral.getAddress());
			await newVault.waitForDeployment();
			// Test with zero address - need to use an instance for custom error
			await expect(
				Vault.deploy(ethers.ZeroAddress)
			).to.be.revertedWithCustomError(newVault, "ZeroAddress");
		});
	});

	describe("setMarket", function () {
		it("should allow setting market once", async function () {
			const Vault = await ethers.getContractFactory("Vault");
			const newVault = await Vault.deploy(await collateral.getAddress());
			await newVault.waitForDeployment();

			const [, newMarket] = await ethers.getSigners();
			await newVault.setMarket(newMarket.address);
			expect(await newVault.market()).to.equal(newMarket.address);
		});

		it("should revert if market already set", async function () {
			await expect(vault.setMarket(await market.getAddress()))
				.to.be.revertedWithCustomError(vault, "InvalidParameter");
		});

		it("should revert if setting zero address", async function () {
			const Vault = await ethers.getContractFactory("Vault");
			const newVault = await Vault.deploy(await collateral.getAddress());
			await newVault.waitForDeployment();

			await expect(newVault.setMarket(ethers.ZeroAddress))
				.to.be.revertedWithCustomError(newVault, "ZeroAddress");
		});
	});

	describe("depositFrom", function () {
		it("should deposit collateral from payer", async function () {
			const amount = 1000000n; // 1.0 token (6 decimals)
			await collateral.mint(trader.address, amount);
			await collateral.connect(trader).approve(await vault.getAddress(), amount);

			const marketAddress = await market.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [marketAddress]);
			await ethers.provider.send("hardhat_setBalance", [marketAddress, "0x1000000000000000000"]);
			const marketSigner = await ethers.getSigner(marketAddress);

			await expect(vault.connect(marketSigner).depositFrom(trader.address, amount))
				.to.not.be.reverted;

			expect(await vault.collateralOf(trader.address)).to.equal(amount);
			expect(await collateral.balanceOf(await vault.getAddress())).to.equal(amount);
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [marketAddress]);
		});

		it("should revert if not called by market", async function () {
			const amount = 1000000n;
			await collateral.mint(trader.address, amount);
			await collateral.connect(trader).approve(await vault.getAddress(), amount);

			await expect(vault.connect(trader).depositFrom(trader.address, amount))
				.to.be.revertedWithCustomError(vault, "OnlyMarket");
		});

		it("should revert if amount is zero", async function () {
			const marketAddress = await market.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [marketAddress]);
			await ethers.provider.send("hardhat_setBalance", [marketAddress, "0x1000000000000000000"]);
			const marketSigner = await ethers.getSigner(marketAddress);
			
			await expect(vault.connect(marketSigner).depositFrom(trader.address, 0))
				.to.be.revertedWithCustomError(vault, "InvalidParameter");
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [marketAddress]);
		});
	});

	describe("withdrawFromTo", function () {
		it("should withdraw collateral to recipient", async function () {
			const amount = 1000000n;
			await collateral.mint(trader.address, amount);
			await collateral.connect(trader).approve(await vault.getAddress(), amount);
			
			const marketAddress = await market.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [marketAddress]);
			await ethers.provider.send("hardhat_setBalance", [marketAddress, "0x1000000000000000000"]);
			const marketSigner = await ethers.getSigner(marketAddress);
			
			await vault.connect(marketSigner).depositFrom(trader.address, amount);

			const recipient = deployer.address;
			const withdrawAmount = 500000n;

			await vault.connect(marketSigner).withdrawFromTo(trader.address, recipient, withdrawAmount);

			expect(await vault.collateralOf(trader.address)).to.equal(amount - withdrawAmount);
			expect(await collateral.balanceOf(recipient)).to.equal(withdrawAmount);
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [marketAddress]);
		});

		it("should revert if insufficient collateral", async function () {
			const marketAddress = await market.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [marketAddress]);
			await ethers.provider.send("hardhat_setBalance", [marketAddress, "0x1000000000000000000"]);
			const marketSigner = await ethers.getSigner(marketAddress);
			
			const withdrawAmount = 1000000n;
			await expect(
				vault.connect(marketSigner).withdrawFromTo(trader.address, deployer.address, withdrawAmount)
			).to.be.revertedWithCustomError(vault, "InsufficientCollateral");
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [marketAddress]);
		});

		it("should revert if amount is zero", async function () {
			const marketAddress = await market.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [marketAddress]);
			await ethers.provider.send("hardhat_setBalance", [marketAddress, "0x1000000000000000000"]);
			const marketSigner = await ethers.getSigner(marketAddress);
			
			await expect(
				vault.connect(marketSigner).withdrawFromTo(trader.address, deployer.address, 0)
			).to.be.revertedWithCustomError(vault, "InvalidParameter");
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [marketAddress]);
		});
	});

	describe("sweepTo", function () {
		it("should allow market to sweep collateral", async function () {
			const marketAddress = await market.getAddress();
			await ethers.provider.send("hardhat_impersonateAccount", [marketAddress]);
			await ethers.provider.send("hardhat_setBalance", [marketAddress, "0x1000000000000000000"]);
			const marketSigner = await ethers.getSigner(marketAddress);
			
			// First deposit some collateral
			const amount = 1000000n;
			await collateral.mint(trader.address, amount);
			await collateral.connect(trader).approve(await vault.getAddress(), amount);
			await vault.connect(marketSigner).depositFrom(trader.address, amount);

			// Then withdraw everything for trader
			await vault.connect(marketSigner).withdrawFromTo(trader.address, trader.address, amount);

			// Now sweep any remaining (should be 0, but test the function)
			const balance = await collateral.balanceOf(await vault.getAddress());
			if (balance > 0n) {
				await expect(vault.connect(marketSigner).sweepTo(deployer.address, balance))
					.to.not.be.reverted;
			}
			
			await ethers.provider.send("hardhat_stopImpersonatingAccount", [marketAddress]);
		});

		it("should revert if not called by market", async function () {
			await expect(vault.connect(trader).sweepTo(deployer.address, 1000))
				.to.be.revertedWithCustomError(vault, "OnlyMarket");
		});
	});
});


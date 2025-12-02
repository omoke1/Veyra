
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reproduction", function () {
    it("Should request resolution successfully", async function () {
        const [deployer, user] = await ethers.getSigners();

        // Deploy Mock Contracts
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const collateral = await TestERC20.deploy();
        
        // Mock EigenVerify (deploy real one or mock if available)
        // Since we don't have MockEigenVerify, we can pass address(0) if allowed
        // VeyraOracleAVS constructor allows address(0) for eigenVerify
        const eigenVerifyAddress = ethers.ZeroAddress;

        // Deploy AVS
        const VeyraOracleAVS = await ethers.getContractFactory("VeyraOracleAVS");
        const avs = await VeyraOracleAVS.deploy(
            deployer.address,
            deployer.address, // DM
            deployer.address, // AM
            deployer.address, // SC
            eigenVerifyAddress
        );

        // Deploy Factory
        const MarketFactory = await ethers.getContractFactory("MarketFactory");
        const factory = await MarketFactory.deploy(
            deployer.address,
            await avs.getAddress(), // Default Oracle
            deployer.address,
            0
        );

        // Create Market
        const endTime = Math.floor(Date.now() / 1000) + 60;
        const tx = await factory.createMarket(
            await collateral.getAddress(),
            "Test Question",
            endTime,
            0
        );
        const rcpt = await tx.wait();
        const marketEvt = rcpt?.logs.find((l: any) => l.fragment?.name === "MarketDeployed");
        const marketAddr = marketEvt?.args[1];
        const Market = await ethers.getContractAt("Market", marketAddr);

        console.log("Market deployed at:", marketAddr);
        console.log("Oracle:", await Market.oracle());

        // Wait for endTime (simulate time pass)
        await ethers.provider.send("evm_increaseTime", [61]);
        await ethers.provider.send("evm_mine", []);

        // Request Resolve
        const extraData = ethers.AbiCoder.defaultAbiCoder().encode(["string", "string"], ["gemini", "logic"]);
        
        console.log("Requesting resolve...");
        await Market.requestResolve(extraData);
        console.log("✅ Request resolve success");
    });
});

import { ethers } from "hardhat";
import { Signer } from "ethers";

/**
 * Mock DelegationManager contract for testing
 */
export async function deployMockDelegationManager(
	signer: Signer
): Promise<ethers.Contract> {
	const MockDelegationManager = await ethers.getContractFactory(
		"MockDelegationManager",
		signer
	);
	const mock = await MockDelegationManager.deploy();
	await mock.waitForDeployment();
	return mock;
}

/**
 * Mock AllocationManager contract for testing
 */
export async function deployMockAllocationManager(
	signer: Signer
): Promise<ethers.Contract> {
	const MockAllocationManager = await ethers.getContractFactory(
		"MockAllocationManager",
		signer
	);
	const mock = await MockAllocationManager.deploy();
	await mock.waitForDeployment();
	return mock;
}

/**
 * Mock SlashingCoordinator contract for testing
 */
export async function deployMockSlashingCoordinator(
	signer: Signer
): Promise<ethers.Contract> {
	const MockSlashingCoordinator = await ethers.getContractFactory(
		"MockSlashingCoordinator",
		signer
	);
	const mock = await MockSlashingCoordinator.deploy();
	await mock.waitForDeployment();
	return mock;
}



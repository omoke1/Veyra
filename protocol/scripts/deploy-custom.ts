import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import solc from "solc";
import * as dotenv from "dotenv";

// Load .env from contracts folder
dotenv.config({ path: path.join(__dirname, "../contracts/.env") });

interface DeploymentConfig {
	network: string;
	deployedAt: string;
	oracle: string;
	factory: string;
	adapter?: string;
	deployer: string;
	flatFee: string;
}

interface CompilerOutput {
	contracts: {
		[file: string]: {
			[contract: string]: {
				abi: any[];
				evm: {
					bytecode: {
						object: string;
					};
				};
			};
		};
	};
}

function readFileRecursive(dir: string, baseDir: string, sources: { [key: string]: { content: string } }, prefix: string = ""): void {
	const files = fs.readdirSync(dir);
	
	for (const file of files) {
		const fullPath = path.join(dir, file);
		const stat = fs.statSync(fullPath);
		
		if (stat.isDirectory() && file !== "test" && file !== ".git" && file !== "node_modules") {
			readFileRecursive(fullPath, baseDir, sources, prefix);
		} else if (file.endsWith(".sol")) {
			const relativePath = prefix ? `${prefix}${path.relative(baseDir, fullPath).replace(/\\/g, "/")}` : path.relative(baseDir, fullPath).replace(/\\/g, "/");
			let content = fs.readFileSync(fullPath, "utf-8");
			// Temporarily modify pragma to allow compatible versions (0.8.26 -> ^0.8.26)
			content = content.replace(/pragma solidity 0\.8\.26;/g, "pragma solidity ^0.8.26;");
			sources[relativePath] = { content };
		}
	}
}

function getAllDependencies(contractsDir: string, openZeppelinPath: string): { [key: string]: { content: string } } {
	const sources: { [key: string]: { content: string } } = {};
	
	// Read all contract files
	readFileRecursive(contractsDir, contractsDir, sources);
	
	// Read all OpenZeppelin files with @openzeppelin prefix
	const openZeppelinContractsPath = path.join(openZeppelinPath, "contracts");
	if (fs.existsSync(openZeppelinContractsPath)) {
		readFileRecursive(openZeppelinContractsPath, openZeppelinContractsPath, sources, "@openzeppelin/contracts/");
	}
	
	return sources;
}

async function compileContract(contractPath: string, contractName: string): Promise<{ abi: any[]; bytecode: string }> {
	const contractsDir = path.join(__dirname, "../contracts");
	const openZeppelinPath = path.join(__dirname, "../node_modules/@openzeppelin");
	
	// Check if OpenZeppelin is installed
	if (!fs.existsSync(openZeppelinPath)) {
		throw new Error("OpenZeppelin contracts not found. Please run: cd protocol && pnpm install");
	}

	// Get all contract sources including dependencies
	const sources = getAllDependencies(contractsDir, openZeppelinPath);
	
	// Ensure the main contract is included
	const fullContractPath = path.join(contractsDir, contractPath);
	if (!fs.existsSync(fullContractPath)) {
		throw new Error(`Contract file not found: ${fullContractPath}`);
	}
	
	const contractRelativePath = path.relative(contractsDir, fullContractPath).replace(/\\/g, "/");
	if (!sources[contractRelativePath]) {
		sources[contractRelativePath] = { content: fs.readFileSync(fullContractPath, "utf-8") };
	}

	// Create import callback to handle dynamic imports
	const importCallback = (importPath: string) => {
		// Handle @openzeppelin imports
		if (importPath.startsWith("@openzeppelin/")) {
			const sourceKey = Object.keys(sources).find(key => key.includes(importPath.replace("@openzeppelin/", "")));
			if (sourceKey && sources[sourceKey]) {
				return { contents: sources[sourceKey].content };
			}
			return { error: `Import not found: ${importPath}` };
		}
		
		// Handle relative imports
		const possiblePaths = [
			importPath,
			path.join(contractsDir, importPath).replace(/\\/g, "/"),
			path.relative(contractsDir, path.resolve(contractsDir, importPath)).replace(/\\/g, "/"),
		];
		
		for (const possiblePath of possiblePaths) {
			if (sources[possiblePath]) {
				return { contents: sources[possiblePath].content };
			}
		}
		
		return { error: `Import not found: ${importPath}` };
	};

	// Solidity compiler input
	const input = {
		language: "Solidity",
		sources,
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
			outputSelection: {
				"*": {
					"*": ["abi", "evm.bytecode"],
				},
			},
		},
	};

	// Load specific solc version (0.8.26)
	const solcVersion = "0.8.26";
	const solcPath = path.join(__dirname, "../node_modules/solc");
	
	// Try to use solc.loadRemoteVersion or fallback to local
	let compiler: typeof solc;
	try {
		compiler = await new Promise((resolve, reject) => {
			solc.loadRemoteVersion(solcVersion, (err: Error | null, solcInstance?: typeof solc) => {
				if (err || !solcInstance) {
					reject(err || new Error("Failed to load solc version"));
				} else {
					resolve(solcInstance);
				}
			});
		});
	} catch (e) {
		console.log("Warning: Could not load remote solc version, using local version");
		compiler = solc;
	}
	
	// Compile with import callback
	const compileResult = JSON.parse(compiler.compile(JSON.stringify(input), { import: importCallback }));
	
	if (compileResult.errors) {
		const errors = compileResult.errors.filter((e: any) => e.severity === "error");
		if (errors.length > 0) {
			throw new Error(`Compilation errors:\n${errors.map((e: any) => e.formattedMessage).join("\n")}`);
		}
	}

	// Find the contract in output
	for (const sourcePath in compileResult.contracts) {
		if (sourcePath === contractRelativePath || sourcePath.endsWith(path.basename(contractPath))) {
			const contracts = compileResult.contracts[sourcePath];
			if (contracts[contractName]) {
				const contract = contracts[contractName];
				return {
					abi: contract.abi,
					bytecode: contract.evm.bytecode.object,
				};
			}
		}
	}
	
	throw new Error(`Contract ${contractName} not found in compilation output. Available contracts: ${Object.keys(compileResult.contracts || {}).join(", ")}`);
}

async function deployContractWithRetry(
	factory: ethers.ContractFactory,
	deployArgs: any[],
	contractName: string,
	wallet: ethers.Wallet
): Promise<string> {
	if (!wallet.provider) {
		throw new Error("Wallet provider is not set");
	}
	
	const provider = wallet.provider;
	let attempts = 0;
	const maxAttempts = 3;
	
	while (attempts < maxAttempts) {
		try {
			// Get current nonce
			const nonce = await provider.getTransactionCount(wallet.address, "pending");
			
			// Get fee data for dynamic pricing
			const feeData = await provider.getFeeData();
			
			// Calculate higher gas prices (ensure priority <= max)
			let maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 110n / 100n : undefined;
			let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * 120n / 100n : undefined;
			
			// Ensure maxPriorityFeePerGas doesn't exceed maxFeePerGas
			if (maxFeePerGas && maxPriorityFeePerGas && maxPriorityFeePerGas > maxFeePerGas) {
				maxPriorityFeePerGas = maxFeePerGas * 95n / 100n; // Set to 95% of max to ensure safety
			}
			
			// Deploy with explicit nonce and higher gas price
			const deployOptions: any = { nonce: nonce };
			if (maxFeePerGas) deployOptions.maxFeePerGas = maxFeePerGas;
			if (maxPriorityFeePerGas) deployOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
			
			const contract = await factory.deploy(...deployArgs, deployOptions);
			
			await contract.waitForDeployment();
			const address = await contract.getAddress();
			return address;
		} catch (error: any) {
			attempts++;
			if (error.code === "REPLACEMENT_UNDERPRICED" || error.code === "NONCE_EXPIRED") {
				console.log(`⚠️  Attempt ${attempts}/${maxAttempts}: ${error.code}, retrying with higher gas price...`);
				if (attempts < maxAttempts) {
					// Wait a bit and retry
					await new Promise(resolve => setTimeout(resolve, 2000));
					continue;
				}
			}
			throw error;
		}
	}
	throw new Error(`Failed to deploy ${contractName} after ${maxAttempts} attempts`);
}

async function flattenContract(contractPath: string, contractsDir: string, openZeppelinPath: string): Promise<string> {
	// Simple flattening: read contract and replace imports with actual content
	const fullContractPath = path.join(contractsDir, contractPath);
	let source = fs.readFileSync(fullContractPath, "utf-8");
	
	// Replace pragma to allow range
	source = source.replace(/pragma solidity 0\.8\.26;/g, "pragma solidity ^0.8.26;");
	
	// Replace @openzeppelin imports with actual content
	const openzeppelinImportRegex = /import\s+["']@openzeppelin\/contracts\/([^"']+)["'];/g;
	let match;
	while ((match = openzeppelinImportRegex.exec(source)) !== null) {
		const importPath = match[1];
		const filePath = path.join(openZeppelinPath, "contracts", importPath);
		if (fs.existsSync(filePath)) {
			let importedSource = fs.readFileSync(filePath, "utf-8");
			// Remove pragma and other imports from imported file (they're already in our source)
			importedSource = importedSource.replace(/pragma solidity[^;]+;/g, "");
			importedSource = importedSource.replace(/import\s+["'][^"']+["'];/g, "");
			source = source.replace(match[0], `\n// Imported: @openzeppelin/contracts/${importPath}\n${importedSource}`);
		}
	}
	
	// Replace relative imports
	const relativeImportRegex = /import\s+["']\.\.\/([^"']+)["'];/g;
	while ((match = relativeImportRegex.exec(source)) !== null) {
		const importPath = match[1];
		const filePath = path.join(contractsDir, path.dirname(contractPath), importPath);
		if (fs.existsSync(filePath)) {
			let importedSource = fs.readFileSync(filePath, "utf-8");
			importedSource = importedSource.replace(/pragma solidity[^;]+;/g, "");
			importedSource = importedSource.replace(/import\s+["'][^"']+["'];/g, "");
			source = source.replace(match[0], `\n// Imported: ${importPath}\n${importedSource}`);
		}
	}
	
	return source;
}

async function verifyContract(
	address: string,
	contractPath: string,
	contractName: string,
	constructorArgs: any[],
	constructorArgTypes: string[],
	etherscanApiKey?: string
): Promise<void> {
	if (!etherscanApiKey) {
		console.log(`⚠️  ETHERSCAN_API_KEY not found. Skipping verification for ${contractName}.`);
		return;
	}
	
	console.log(`\n🔍 Verifying ${contractName} on Etherscan...`);
	
	try {
		const contractsDir = path.join(__dirname, "../contracts");
		const openZeppelinPath = path.join(__dirname, "../node_modules/@openzeppelin");
		
		// Flatten the contract
		const flattenedSource = await flattenContract(contractPath, contractsDir, openZeppelinPath);
		
		// Use Etherscan API V2 format
		const verifyUrl = "https://api-sepolia.etherscan.io/api/v2/contracts/verify";
		
		// Build constructor args string (ABI-encoded)
		let constructorArgsString = "";
		if (constructorArgs && constructorArgs.length > 0 && constructorArgTypes && constructorArgTypes.length === constructorArgs.length) {
			const coder = ethers.AbiCoder.defaultAbiCoder();
			const encoded = coder.encode(constructorArgTypes, constructorArgs);
			constructorArgsString = encoded.replace("0x", "");
		}
		
		// Use V2 API format (JSON body)
		const requestBody = {
			apikey: etherscanApiKey,
			address: address,
			sourceCode: flattenedSource,
			contractName: contractName,
			compilerversion: "v0.8.26+commit.73712a01",
			optimizationUsed: "1",
			runs: "200",
			...(constructorArgsString ? { constructorArgu: constructorArgsString } : {}),
		};
		
		const response = await fetch(verifyUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});
		
		const result = await response.json();
		
		if (result.status === "1" || result.status === "OK") {
			console.log(`✅ Verification submitted! GUID: ${result.result || result.guid}`);
			console.log(`   Check status: https://sepolia.etherscan.io/address/${address}#code`);
		} else {
			// Fallback to note manual verification needed
			console.log(`⚠️  Verification API error: ${result.result || result.message || "Unknown error"}`);
			console.log(`   Note: You can manually verify contracts at:`);
			console.log(`   https://sepolia.etherscan.io/address/${address}#code`);
		}
	} catch (error: any) {
		console.log(`⚠️  Verification error: ${error.message}`);
		console.log(`   You can manually verify at: https://sepolia.etherscan.io/address/${address}#code`);
	}
}

async function main() {
	console.log("\n🚀 Starting custom deployment...");
	
	// Check environment variables
	const rpcUrl = process.env.SEPOLIA_RPC_URL;
	const privateKey = process.env.PRIVATE_KEY;
	const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
	
	if (!rpcUrl) {
		throw new Error("SEPOLIA_RPC_URL not found in .env file");
	}
	if (!privateKey) {
		throw new Error("PRIVATE_KEY not found in .env file");
	}
	
	// Setup provider and wallet
	const provider = new ethers.JsonRpcProvider(rpcUrl);
	const wallet = new ethers.Wallet(privateKey, provider);
	
	console.log("Deployer address:", wallet.address);
	
	// Check balance
	const balance = await provider.getBalance(wallet.address);
	console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
	
	if (balance < ethers.parseEther("0.01")) {
		console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
	}
	
	// Check for pending transactions
	const pendingNonce = await provider.getTransactionCount(wallet.address, "pending");
	const latestNonce = await provider.getTransactionCount(wallet.address, "latest");
	if (pendingNonce > latestNonce) {
		console.log(`⚠️  Warning: ${pendingNonce - latestNonce} pending transaction(s). Waiting for confirmation...`);
		// Wait a bit for pending transactions
		await new Promise(resolve => setTimeout(resolve, 5000));
	}
	
	// Compile and deploy VPOOracleChainlink
	console.log("\n📦 Compiling VPOOracleChainlink...");
	const oracleArtifact = await compileContract("oracle/VPOOracleChainlink.sol", "VPOOracleChainlink");
	console.log("✅ VPOOracleChainlink compiled");
	
	console.log("\n📦 Deploying VPOOracleChainlink...");
	const OracleFactory = new ethers.ContractFactory(oracleArtifact.abi, oracleArtifact.bytecode, wallet);
	const oracleAddress = await deployContractWithRetry(
		OracleFactory,
		[wallet.address],
		"VPOOracleChainlink",
		wallet
	);
	console.log("✅ VPOOracleChainlink deployed at:", oracleAddress);
	
	// Wait for confirmation before next deployment
	await new Promise(resolve => setTimeout(resolve, 3000));
	
	// Compile and deploy MarketFactory
	const flatFee = 500000n; // $0.50 for 6-decimal collateral
	const feeRecipient = wallet.address;
	
	console.log("\n📦 Compiling MarketFactory...");
	const factoryArtifact = await compileContract("market/MarketFactory.sol", "MarketFactory");
	console.log("✅ MarketFactory compiled");
	
	console.log("\n📦 Deploying MarketFactory...");
	const FactoryFactory = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, wallet);
	const factoryAddress = await deployContractWithRetry(
		FactoryFactory,
		[wallet.address, oracleAddress, feeRecipient, flatFee],
		"MarketFactory",
		wallet
	);
	console.log("✅ MarketFactory deployed at:", factoryAddress);
	
	// Wait for confirmation before next deployment
	await new Promise(resolve => setTimeout(resolve, 3000));
	
	// Compile and deploy VPOAdapter
	console.log("\n📦 Compiling VPOAdapter...");
	const adapterArtifact = await compileContract("adapter/VPOAdapter.sol", "VPOAdapter");
	console.log("✅ VPOAdapter compiled");
	
	console.log("\n📦 Deploying VPOAdapter...");
	const AdapterFactory = new ethers.ContractFactory(adapterArtifact.abi, adapterArtifact.bytecode, wallet);
	const adapterAddress = await deployContractWithRetry(
		AdapterFactory,
		[wallet.address],
		"VPOAdapter",
		wallet
	);
	console.log("✅ VPOAdapter deployed at:", adapterAddress);
	
	// Verify contracts on Etherscan
	if (etherscanApiKey) {
		console.log("\n⏳ Waiting for block confirmations before verification...");
		await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for Etherscan to index
		
		await verifyContract(oracleAddress, "oracle/VPOOracleChainlink.sol", "VPOOracleChainlink", [wallet.address], ["address"], etherscanApiKey);
		await verifyContract(factoryAddress, "market/MarketFactory.sol", "MarketFactory", [wallet.address, oracleAddress, feeRecipient, flatFee], ["address", "address", "address", "uint256"], etherscanApiKey);
		await verifyContract(adapterAddress, "adapter/VPOAdapter.sol", "VPOAdapter", [wallet.address], ["address"], etherscanApiKey);
	}
	
	// Save deployment info
	const config: DeploymentConfig = {
		network: "sepolia",
		deployedAt: new Date().toISOString(),
		oracle: oracleAddress,
		factory: factoryAddress,
		adapter: adapterAddress,
		deployer: wallet.address,
		flatFee: flatFee.toString(),
	};
	
	const configPath = path.join(__dirname, "..", "deployments", "sepolia.json");
	const deploymentsDir = path.dirname(configPath);
	if (!fs.existsSync(deploymentsDir)) {
		fs.mkdirSync(deploymentsDir, { recursive: true });
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
	
	console.log("\n📝 Deployment info saved to:", configPath);
	console.log("\n🎉 Deployment complete!");
	console.log("\nContract addresses:");
	console.log(`   - Oracle: https://sepolia.etherscan.io/address/${oracleAddress}`);
	console.log(`   - Factory: https://sepolia.etherscan.io/address/${factoryAddress}`);
	console.log(`   - Adapter: https://sepolia.etherscan.io/address/${adapterAddress}`);
	
	if (etherscanApiKey) {
		console.log("\n✅ Contracts submitted for verification on Etherscan!");
		console.log("   Check verification status on the contract pages above.");
	} else {
		console.log("\n⚠️  ETHERSCAN_API_KEY not set. Contracts were not automatically verified.");
		console.log("   You can manually verify them using the Etherscan UI.");
	}
	
	console.log("\nNext steps:");
	console.log("2. Register AVS nodes:");
	console.log(`   adapter.setAVSNode(avsNodeAddress, true)`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


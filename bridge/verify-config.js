/**
 * Verify bridge service configuration
 * Run: node verify-config.js
 */

require('dotenv').config();

const required = [
	'SEPOLIA_RPC_URL',
	'VPO_ADAPTER_ADDRESS',
	'UMA_ADAPTER_ADDRESS',
	'GNOSIS_ADAPTER_ADDRESS',
	'UMA_ORACLE_ADDRESS',
	'GNOSIS_CONDITIONAL_TOKENS',
	'BRIDGE_PRIVATE_KEY',
];

const optional = [
	'POLYMARKET_API_KEY',
	'POLYMARKET_SECRET',
	'POLYMARKET_PASSPHRASE',
	'POLYMARKET_ADDRESS',
];

console.log('🔍 Verifying bridge service configuration...\n');

let allValid = true;

// Check required variables
console.log('Required variables:');
for (const key of required) {
	const value = process.env[key];
	if (!value || value.trim() === '') {
		console.log(`  ❌ ${key}: MISSING`);
		allValid = false;
	} else {
		const displayValue = key.includes('PRIVATE_KEY') 
			? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
			: value;
		console.log(`  ✅ ${key}: ${displayValue}`);
	}
}

// Check optional variables
console.log('\nOptional variables:');
for (const key of optional) {
	const value = process.env[key];
	if (!value || value.trim() === '') {
		console.log(`  ⚠️  ${key}: Not set (optional)`);
	} else {
		const displayValue = key.includes('SECRET') || key.includes('PASSPHRASE')
			? '***'
			: value;
		console.log(`  ✅ ${key}: ${displayValue}`);
	}
}

// Validate addresses format
console.log('\nAddress format validation:');
const addressKeys = [
	'VPO_ADAPTER_ADDRESS',
	'UMA_ADAPTER_ADDRESS',
	'GNOSIS_ADAPTER_ADDRESS',
	'UMA_ORACLE_ADDRESS',
	'GNOSIS_CONDITIONAL_TOKENS',
];

for (const key of addressKeys) {
	const value = process.env[key];
	if (value) {
		const isValid = /^0x[a-fA-F0-9]{40}$/.test(value);
		if (isValid) {
			console.log(`  ✅ ${key}: Valid format`);
		} else {
			console.log(`  ❌ ${key}: Invalid format (should be 0x followed by 40 hex chars)`);
			allValid = false;
		}
	}
}

// Validate private key format
console.log('\nPrivate key validation:');
const privateKey = process.env.BRIDGE_PRIVATE_KEY;
if (privateKey) {
	const isValid = /^0x[a-fA-F0-9]{64}$/.test(privateKey);
	if (isValid) {
		console.log(`  ✅ BRIDGE_PRIVATE_KEY: Valid format`);
	} else {
		console.log(`  ❌ BRIDGE_PRIVATE_KEY: Invalid format (should be 0x followed by 64 hex chars)`);
		allValid = false;
	}
}

console.log('\n' + '='.repeat(50));
if (allValid) {
	console.log('✅ Configuration is valid! Ready to start bridge service.');
	console.log('\nNext steps:');
	console.log('  1. Ensure bridge wallet has ETH for gas');
	console.log('  2. Ensure adapters have bridge wallet as admin');
	console.log('  3. Run: npm run dev');
} else {
	console.log('❌ Configuration has errors. Please fix the issues above.');
	process.exit(1);
}


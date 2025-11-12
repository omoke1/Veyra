/**
 * Setup script to create .env file for bridge service
 * Run: node setup-env.js
 */

const fs = require('fs');
const path = require('path');

const envContent = `# Bridge Service Configuration
# Sepolia Testnet

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/qeff-6z-mCp_Qu2G6LWfa
POLYGON_RPC_URL=https://polygon-rpc.com

# VPOAdapter (deployed on Sepolia)
VPO_ADAPTER_ADDRESS=0xF260b47178D5345A06039DaEd8c27cB68a0639d1

# UMA Adapter (deployed on Sepolia)
UMA_ADAPTER_ADDRESS=0x1529a4eA084bf94729C8a403CAb3D136516D705c

# Gnosis Adapter (deployed on Sepolia)
GNOSIS_ADAPTER_ADDRESS=0xd28869739586024B7efB3e6247A35D0729fc6A27

# External Oracle Addresses (Mainnet addresses - used for testing)
UMA_ORACLE_ADDRESS=0xA0aE660944944Ee6D4C27B4BBb4a3B64e5D8b0d1
GNOSIS_CONDITIONAL_TOKENS=0x4D97DCd97eC945f40cF65F87097ACe5EA0476045

# Bridge Service Private Key (for signing transactions)
# IMPORTANT: Use a dedicated wallet with minimal funds for the bridge service
# This key should be different from your deployer key
BRIDGE_PRIVATE_KEY=0x57b9edc2d522b266f34a325f17d0d771e1319185fdd200f6910feac271b5e1b3

# Polymarket API (Optional - for enhanced market data)
# Get API keys from: https://polymarket.com/api
# POLYMARKET_API_KEY=your_api_key_here
# POLYMARKET_SECRET=your_secret_here
# POLYMARKET_PASSPHRASE=your_passphrase_here
# POLYMARKET_ADDRESS=your_polymarket_address_here
`;

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
	console.log('⚠️  .env file already exists. Backing up to .env.backup');
	fs.copyFileSync(envPath, path.join(__dirname, '.env.backup'));
}

fs.writeFileSync(envPath, envContent);
console.log('✅ .env file created successfully!');
console.log('\n📝 Next steps:');
console.log('1. Review the .env file and update BRIDGE_PRIVATE_KEY if needed');
console.log('2. Add Polymarket API credentials (optional)');
console.log('3. Run: npm run dev');


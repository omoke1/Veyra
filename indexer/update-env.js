/**
 * Update indexer .env with adapter addresses
 * Run: node update-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deploymentsPath = path.join(__dirname, '..', 'protocol', 'deployments', 'sepolia.json');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(deploymentsPath)) {
	console.error('Deployment file not found:', deploymentsPath);
	process.exit(1);
}

const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

// Read existing .env or create new
let envContent = '';
if (fs.existsSync(envPath)) {
	envContent = fs.readFileSync(envPath, 'utf8');
} else {
	// Create basic .env if it doesn't exist
	envContent = `SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/qeff-6z-mCp_Qu2G6LWfa
FACTORY=${deployments.factory || ''}
ADAPTER_ADDRESS=${deployments.adapter || ''}
ORACLE_ADDRESS=${deployments.oracle || ''}
`;
}

// Update or add adapter addresses
const lines = envContent.split('\n');
const newLines = [];
const seen = new Set();

for (const line of lines) {
	if (line.trim() === '' || line.startsWith('#')) {
		newLines.push(line);
		continue;
	}
	
	const [key] = line.split('=');
	if (key) {
		seen.add(key.trim());
		
		if (key.trim() === 'UMA_ADAPTER_ADDRESS') {
			newLines.push(`UMA_ADAPTER_ADDRESS=${deployments.umaAdapter || ''}`);
		} else if (key.trim() === 'GNOSIS_ADAPTER_ADDRESS') {
			newLines.push(`GNOSIS_ADAPTER_ADDRESS=${deployments.gnosisAdapter || ''}`);
		} else {
			newLines.push(line);
		}
	} else {
		newLines.push(line);
	}
}

// Add adapter addresses if not present
if (!seen.has('UMA_ADAPTER_ADDRESS')) {
	newLines.push(`UMA_ADAPTER_ADDRESS=${deployments.umaAdapter || ''}`);
}
if (!seen.has('GNOSIS_ADAPTER_ADDRESS')) {
	newLines.push(`GNOSIS_ADAPTER_ADDRESS=${deployments.gnosisAdapter || ''}`);
}

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('✅ Updated indexer .env with adapter addresses:');
console.log(`   UMA_ADAPTER_ADDRESS=${deployments.umaAdapter || ''}`);
console.log(`   GNOSIS_ADAPTER_ADDRESS=${deployments.gnosisAdapter || ''}`);


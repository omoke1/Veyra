# 🚀 Complete Setup Guide - Required API Keys & Configuration

This guide lists all API keys and environment variables needed to test the Veyra platform end-to-end.

---

## 📋 Quick Checklist

### Minimum Required (Free):
- [ ] **Sepolia RPC URL** - Use free public RPC or get Infura/Alchemy key
- [ ] **Deployer Private Key** - Test account with Sepolia ETH
- [ ] **AVS Private Key** - Another test account with Sepolia ETH

### Optional (Recommended):
- [ ] **Etherscan API Key** - For contract verification (free)

---

## 🔑 Required API Keys & Config

### 1. **Ethereum Sepolia RPC URL** ⭐ REQUIRED

**Purpose:** Connect to Sepolia testnet

**Options (choose one):**

#### Option A: Public RPC (Free, No API Key)
```bash
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```
- ✅ Free
- ⚠️ Rate-limited
- ✅ No registration needed

#### Option B: Infura (Recommended)
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```
- **Get key:** https://infura.io/register (free)
- **Free tier:** 100,000 requests/day
- **Better reliability**

#### Option C: Alchemy (Alternative)
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```
- **Get key:** https://www.alchemy.com/ (free)
- **Free tier:** 300M compute units/month

---

### 2. **Ethereum Private Keys** ⭐ REQUIRED

**You need TWO different private keys:**

#### **A. Deployer Private Key** (for contract deployment)
- Deploys: VPOOracleChainlink, MarketFactory, VPOAdapter
- Needs Sepolia ETH for gas fees

#### **B. AVS Node Private Key** (for AVS service)
- Must be different from deployer
- Will be registered as AVS node
- Needs small amount of Sepolia ETH for gas

**Get Sepolia ETH:**
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia
- https://sepolia-faucet.pk910.de/

**⚠️ Security:** Never commit private keys to git! Use test accounts only.

---

### 3. **Etherscan API Key** (Optional - for verification)

**Purpose:** Verify deployed contracts on Etherscan

**Get key:** https://sepolia.etherscan.io/myapikey (free)

**Not required** - contracts work without verification, but helpful for transparency.

---

## 📁 Environment Files Setup

### **1. protocol/.env** (Contract Deployment)

Create `protocol/.env`:
```bash
# Sepolia RPC (choose one option)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# OR
# SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Deployer private key (starts with 0x)
PRIVATE_KEY=0xYourDeployerPrivateKeyHere

# Etherscan API key (optional)
ETHERSCAN_API_KEY=YourEtherscanKey
```

---

### **2. avs/.env** (AVS Service)

Create `avs/.env`:
```bash
# Sepolia RPC (same as protocol/.env)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Deployed VPOAdapter address (get after running deploy script)
ADAPTER_ADDRESS=0x...

# AVS node private key (different from deployer, starts with 0x)
AVS_PRIVATE_KEY=0xYourAVSPrivateKeyHere
```

---

### **3. indexer/.env** (Indexer Service)

Create `indexer/.env`:
```bash
# Sepolia RPC (same as protocol/.env)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Deployed MarketFactory address (get after running deploy script)
FACTORY=0x...

# Port for indexer API (optional, defaults to 4001)
PORT=4001

# Run indexer automatically (set to "1" to enable)
RUN_INDEXER=1
```

---

### **4. web/.env.local** (Frontend)

Create `web/.env.local`:
```bash
# Sepolia RPC (same as protocol/.env)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Deployed contract addresses (get after running deploy script)
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_ADAPTER_ADDRESS=0x...

# Indexer API URL (if running indexer separately)
NEXT_PUBLIC_INDEXER_URL=http://localhost:4001
```

---

## 🚀 Step-by-Step Testing Workflow

### Step 1: Get API Keys & Test Accounts

1. **Get Sepolia RPC:**
   - Option A: Use `https://rpc.sepolia.org` (no key needed)
   - Option B: Sign up for Infura/Alchemy (recommended)

2. **Create test accounts:**
   - Use MetaMask or `ethers.Wallet.createRandom()`
   - Get Sepolia ETH from faucets for both accounts
   - Save private keys securely

3. **(Optional) Get Etherscan API key**

---

### Step 2: Deploy Contracts

```bash
cd protocol

# Create .env file with:
# SEPOLIA_RPC_URL=...
# PRIVATE_KEY=0x... (deployer key)

npm run deploy:sepolia
```

**Output will show:**
```
✅ VPOOracleChainlink deployed at: 0x...
✅ MarketFactory deployed at: 0x...
✅ VPOAdapter deployed at: 0x...
```

**Save these addresses!** You'll need them for other services.

---

### Step 3: Configure Services

#### Configure AVS:
```bash
cd avs

# Create .env with:
# SEPOLIA_RPC_URL=... (same as protocol)
# ADAPTER_ADDRESS=0x... (from deployment)
# AVS_PRIVATE_KEY=0x... (AVS node key)

npm install
```

#### Configure Indexer:
```bash
cd indexer

# Create .env with:
# SEPOLIA_RPC_URL=... (same as protocol)
# FACTORY=0x... (from deployment)
# RUN_INDEXER=1

npm install
```

#### Configure Frontend:
```bash
cd web

# Create .env.local with:
# NEXT_PUBLIC_SEPOLIA_RPC_URL=... (same as protocol)
# NEXT_PUBLIC_FACTORY_ADDRESS=0x... (from deployment)
# NEXT_PUBLIC_ORACLE_ADDRESS=0x... (from deployment)
# NEXT_PUBLIC_ADAPTER_ADDRESS=0x... (from deployment)
# NEXT_PUBLIC_INDEXER_URL=http://localhost:4001
```

---

### Step 4: Register AVS Node

After deployment, register the AVS node in the adapter:

**Using Hardhat console:**
```bash
cd protocol
npx hardhat console --network sepolia

# In console:
const Adapter = await ethers.getContractFactory("VPOAdapter");
const adapter = Adapter.attach("0x...ADAPTER_ADDRESS...");
const avsAddress = "0x...AVS_NODE_ADDRESS...";
await adapter.setAVSNode(avsAddress, true);
```

**Or create a script:**
```typescript
// scripts/registerAVS.ts
const adapter = await ethers.getContractAt("VPOAdapter", ADAPTER_ADDRESS);
await adapter.setAVSNode(process.env.AVS_ADDRESS, true);
```

---

### Step 5: Start Services & Test

**Terminal 1 - Indexer:**
```bash
cd indexer
npm run dev
```

**Terminal 2 - AVS Service:**
```bash
cd avs
npm start
```

**Terminal 3 - Frontend:**
```bash
cd web
npm run dev
```

**Test flow:**
1. Open http://localhost:3000
2. Connect wallet (deployer account)
3. Create a market
4. Trade in markets
5. Test adapter (create verification request)

---

## 💰 Cost Breakdown

**All Free:**
- ✅ Sepolia RPC (public or free tier)
- ✅ Sepolia ETH (from faucets)
- ✅ Etherscan verification (free API key)
- ✅ No IPFS costs (mock implementation)
- ✅ No external API costs (mock data)

**Total:** $0 for testing

---

## 🔐 Security Checklist

- [ ] All `.env` files in `.gitignore` (verify with `git check-ignore .env`)
- [ ] Using test accounts only (never mainnet keys)
- [ ] Private keys stored securely (password manager)
- [ ] Sepolia ETH only (no mainnet ETH in test accounts)

---

## ❓ Troubleshooting

### "Insufficient funds"
- Get more Sepolia ETH from faucets
- Check account balances on https://sepolia.etherscan.io/

### "RPC rate limit"
- Switch to Infura/Alchemy with API key
- Or wait and retry

### "Contract not found"
- Verify contract addresses in `.env` files
- Check deployment output saved addresses correctly

### "AVS node not registered"
- Make sure you called `adapter.setAVSNode(address, true)`
- Verify AVS address matches private key

---

## 📝 Summary

**Minimum to test:**
1. Sepolia RPC URL (free public or Infura/Alchemy key)
2. Two private keys (deployer + AVS) with Sepolia ETH
3. Deployed contract addresses (from deployment script)

**That's it!** Everything else is optional or mocked.


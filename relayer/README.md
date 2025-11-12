# Veyra Relayer Service

Off-chain service that listens for `ResolveRequested` events, fetches market data, signs attestations using EIP-712, and submits them to the `VPOOracleRelayer` contract.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Authorize relayer:**
   - Deploy or connect to `VPOOracleRelayer` contract
   - Call `setSigner(relayerAddress, true)` as admin
   - Use the same address that corresponds to `RELAYER_PRIVATE_KEY`

## Usage

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## How It Works

1. **Listen for Events:** Listens for `ResolveRequested` events from the contract
2. **Fetch Data:** Fetches market outcome from data sources
3. **Sign Attestation:** Creates and signs EIP-712 attestation
4. **Upload Proof:** (Optional) Uploads proof to IPFS
5. **Submit:** Submits signed attestation to contract

## Configuration

- `RPC_URL`: Blockchain RPC endpoint
- `RELAYER_CONTRACT`: VPOOracleRelayer contract address
- `RELAYER_PRIVATE_KEY`: Private key of authorized signer
- `CHAIN_ID`: Network chain ID

## Next Steps

- [ ] Add real data source integrations
- [ ] Implement IPFS proof upload
- [ ] Add retry logic
- [ ] Add monitoring and logging
- [ ] Support multiple data sources


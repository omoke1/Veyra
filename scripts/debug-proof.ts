
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ADAPTER_ADDRESS = process.env.ADAPTER_ADDRESS || "0xCAa29E6c737b33434e54479e4691Ee7E0E71b203";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const AVS_ABI = [
    "function eigenVerify() external view returns (address)"
];

const EIGEN_VERIFY_ABI = [
    "function verify(bytes calldata proof, bytes calldata dataSpec) external view returns (bool valid, string memory result)"
];

// --- Proof Generator Logic (Copied) ---
async function generateEigenVerifyProof(
    dataSources: string[],
    queryLogic: string,
    result: string,
    timestamp: number,
    signer: ethers.Wallet
) {
    const dataSourceId = dataSources.join(",");
    const dataSourceHash = ethers.keccak256(
        ethers.solidityPacked(["string", "uint256"], [dataSourceId, timestamp])
    );
    const computationCodeHash = ethers.keccak256(ethers.toUtf8Bytes(queryLogic));
    const outputResultHash = ethers.keccak256(ethers.toUtf8Bytes(result));

    const proofHeader = ethers.concat([
        ethers.getBytes(dataSourceHash),
        ethers.getBytes(computationCodeHash),
        ethers.getBytes(outputResultHash),
    ]);

    const proofHeaderHash = ethers.keccak256(proofHeader);
    const signature = await signer.signMessage(ethers.getBytes(proofHeaderHash));

    const proofBytes = ethers.concat([
        ethers.getBytes(dataSourceHash),
        ethers.getBytes(computationCodeHash),
        ethers.getBytes(outputResultHash),
        ethers.getBytes(signature),
    ]);

    const abiCoder = new ethers.AbiCoder();
    const dataSpec = abiCoder.encode(
        ["string", "string", "uint256", "string"],
        [dataSourceId, queryLogic, timestamp, result]
    );

    return {
        proof: ethers.getBytes(proofBytes),
        dataSpec: ethers.getBytes(dataSpec),
    };
}

async function main() {
    console.log(`Debugging Proof on ${ADAPTER_ADDRESS}`);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const avs = new ethers.Contract(ADAPTER_ADDRESS, AVS_ABI, provider);

    const eigenVerifyAddress = await avs.eigenVerify();
    console.log(`EigenVerify Address: ${eigenVerifyAddress}`);
    const eigenVerify = new ethers.Contract(eigenVerifyAddress, EIGEN_VERIFY_ABI, wallet);

    // Test Data
    const source = "gemini";
    const question = "is magnus carlsen best player 2025?";
    const result = "NO";
    const timestamp = Math.floor(Date.now() / 1000);

    console.log("Generating proof...");
    const { proof, dataSpec } = await generateEigenVerifyProof(
        [source],
        question,
        result,
        timestamp,
        wallet
    );

    console.log(`Proof length: ${proof.length}`);
    console.log(`DataSpec length: ${dataSpec.length}`);

    try {
        console.log("Calling verify() on-chain...");
        const [valid, res] = await eigenVerify.verify(proof, dataSpec);
        console.log(`✅ Verification Result: ${valid}`);
        console.log(`Returned Result: ${res}`);
    } catch (error: any) {
        console.error("❌ Verification failed (reverted):");
        if (error.data) {
             console.error(`Revert data: ${error.data}`);
        } else {
             console.error(error.message);
        }
    }
}

main().catch(console.error);

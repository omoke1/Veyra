// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IEigenVerify} from "../interfaces/IEigenVerify.sol";
import {Errors} from "../security/Errors.sol";

/// @title EigenVerify
/// @notice Verifies proofs of correctness for computations used in market resolution
/// @dev Each proof includes: data source hash, computation code hash, output result hash, and signature
contract EigenVerify is IEigenVerify {
	/// @dev Structure for decoded proof
	struct Proof {
		bytes32 dataSourceHash; // Hash of the data source(s) used
		bytes32 computationCodeHash; // Hash of the computation logic/code
		bytes32 outputResultHash; // Hash of the output result
		bytes signature; // Signature from the proof generator
		address signer; // Address that generated the signature
	}

	/// @dev Structure for decoded data specification
	struct DataSpec {
		string dataSourceId; // Identifier for the data source
		bytes queryLogic; // Encoded query logic/computation code
		uint256 timestamp; // Timestamp for data snapshot
		string expectedResult; // Expected result format (e.g., "YES", "NO")
	}

	/// @dev Mapping to track authorized verifiers (operators that can generate proofs)
	mapping(address => bool) public authorizedVerifiers;

	address public admin;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	constructor(address admin_) {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;
	}

	/// @notice Add or remove an authorized verifier (operator)
	function setAuthorizedVerifier(address verifier, bool enabled) external onlyAdmin {
		if (verifier == address(0)) revert Errors.ZeroAddress();
		authorizedVerifiers[verifier] = enabled;
		emit VerifierUpdated(verifier, enabled);
	}

	/// @notice Verify a proof of correctness for a computation
	/// @param proof Encoded proof: 32 bytes (dataSourceHash) + 32 bytes (computationCodeHash) + 32 bytes (outputResultHash) + 65 bytes (signature)
	/// @param dataSpec Encoded data specification
	/// @return valid Whether the proof is valid
	/// @return result The resolved result as a string
	function verify(bytes calldata proof, bytes calldata dataSpec)
		external
		view
		override
		returns (bool valid, string memory result)
	{
		// Decode proof structure
		if (proof.length < 96) revert Errors.InvalidParameter(); // Minimum: 3 hashes (32 bytes each)
		
		Proof memory proofData;
		proofData.dataSourceHash = bytes32(proof[0:32]);
		proofData.computationCodeHash = bytes32(proof[32:64]);
		proofData.outputResultHash = bytes32(proof[64:96]);

		// Extract signature if present (last 65 bytes for ECDSA)
		if (proof.length >= 161) {
			proofData.signature = proof[96:161];
			// Hash the proof header (96 bytes) to get 32 bytes for signature recovery
			// signMessage in ethers.js signs: keccak256("\x19Ethereum Signed Message:\n32" + keccak256(proofHeader))
			bytes memory proofHeader = proof[0:96];
			bytes32 proofHeaderHash = keccak256(proofHeader);
			// Recover signer from signature (pass bytes32 directly)
			proofData.signer = _recoverSigner(proofHeaderHash, proofData.signature);
		} else {
			// If no signature, proof is invalid
			return (false, "");
		}

		// Verify signer is authorized
		if (!authorizedVerifiers[proofData.signer]) {
			return (false, "");
		}

		// Decode data specification (simplified for MVP)
		DataSpec memory spec = _decodeDataSpec(dataSpec);

		// Verify proof components:
		// 1. Data source hash must match dataSpec
		bytes32 computedDataSourceHash = keccak256(abi.encodePacked(spec.dataSourceId, spec.timestamp));
		if (proofData.dataSourceHash != computedDataSourceHash) {
			return (false, "");
		}

		// 2. Computation code hash must match queryLogic in dataSpec
		bytes32 computedCodeHash = keccak256(spec.queryLogic);
		if (proofData.computationCodeHash != computedCodeHash) {
			return (false, "");
		}

		// 3. Output result hash must match expected result
		bytes32 computedResultHash = keccak256(bytes(spec.expectedResult));
		if (proofData.outputResultHash != computedResultHash) {
			return (false, "");
		}

		// 4. Signature must be valid
		bytes memory message = new bytes(96);
		for (uint256 i = 0; i < 96; i++) {
			message[i] = proof[i];
		}
		if (!_verifySignature(message, proofData.signature, proofData.signer)) {
			return (false, "");
		}

		// If all checks pass, proof is valid
		return (true, spec.expectedResult);
	}

	/// @dev Decode data specification (simplified for MVP)
	/// @param dataSpec Encoded data specification
	/// @return spec Decoded data specification
	function _decodeDataSpec(bytes calldata dataSpec) internal pure returns (DataSpec memory spec) {
		(
			string memory dataSourceId,
			string memory queryLogic,
			uint256 timestamp,
			string memory expectedResult
		) = abi.decode(dataSpec, (string, string, uint256, string));

		spec.dataSourceId = dataSourceId;
		spec.queryLogic = bytes(queryLogic);
		spec.timestamp = timestamp;
		spec.expectedResult = expectedResult;
	}

	/// @dev Recover signer from signature
	/// @param messageHash The 32-byte hash of the message that was signed (proof header hash)
	/// @param signature The signature
	/// @return signer The address that signed the message
	function _recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address signer) {
		if (signature.length != 65) revert Errors.InvalidSignature();

		// signMessage in ethers.js creates: keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
		// where messageHash is 32 bytes. We need to match this exactly.
		// abi.encodePacked with string and bytes32 concatenates them
		bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
		
		bytes32 r;
		bytes32 s;
		uint8 v;

		if (signature.length != 65) revert Errors.InvalidSignature();
		
		assembly {
			r := mload(add(signature, 32))
			s := mload(add(signature, 64))
			v := byte(0, mload(add(signature, 96)))
		}

		if (v < 27) v += 27;
		if (v != 27 && v != 28) revert Errors.InvalidSignature();

		signer = ecrecover(hash, v, r, s);
		if (signer == address(0)) revert Errors.InvalidSignature();
	}

	/// @dev Verify signature is valid
	/// @param message The message that was signed (can be 96 bytes proofHeader or other)
	/// @param signature The signature
	/// @param expectedSigner The expected signer address
	/// @return valid Whether the signature is valid
	function _verifySignature(
		bytes memory message,
		bytes memory signature,
		address expectedSigner
	) internal pure returns (bool valid) {
		// Hash the message first (signMessage signs the hash of the message)
		bytes32 messageHash = keccak256(message);
		address signer = _recoverSigner(messageHash, signature);
		return signer == expectedSigner;
	}

	/// @notice Event emitted when a verifier is added or removed
	event VerifierUpdated(address indexed verifier, bool enabled);
}


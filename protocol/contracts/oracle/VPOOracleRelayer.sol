// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IVPOOracle} from "../interfaces/IVPOOracle.sol";
import {Errors} from "../security/Errors.sol";

/// @title VPO Oracle (Custom Relayer)
/// @notice Phase 2 oracle that accepts EIP-712 signed attestations from off-chain relayers.
/// @dev Supports multiple signers, replay protection, and expiry handling.
contract VPOOracleRelayer is IVPOOracle {
	struct Result {
		bool resolved;
		bytes data; // outcome + proof data
		bytes metadata; // IPFS CID, sourceId, timestamp, etc.
	}

	struct Attestation {
		bytes32 marketId;
		bytes32 questionHash;
		uint8 outcome;
		string sourceId;
		uint256 expiresAt;
		uint256 nonce;
	}

	/// @dev EIP-712 domain separator
	bytes32 public immutable DOMAIN_SEPARATOR;
	/// @dev EIP-712 type hash for Attestation
	bytes32 public constant ATTESTATION_TYPEHASH =
		keccak256(
			"Attestation(bytes32 marketId,bytes32 questionHash,uint8 outcome,string sourceId,uint256 expiresAt,uint256 nonce)"
		);

	/// @dev marketId => result
	mapping(bytes32 => Result) private _results;

	/// @dev signer => enabled
	mapping(address => bool) public signers;

	/// @dev nonce => used (for replay protection)
	mapping(uint256 => bool) private _usedNonces;

	address public admin;

	modifier onlyAdmin() {
		if (msg.sender != admin) revert Errors.OnlyAdmin();
		_;
	}

	modifier onlySigner() {
		if (!signers[msg.sender]) revert Errors.Unauthorized();
		_;
	}

	constructor(address admin_) {
		if (admin_ == address(0)) revert Errors.ZeroAddress();
		admin = admin_;

		// EIP-712 domain separator
		DOMAIN_SEPARATOR = keccak256(
			abi.encode(
				keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
				keccak256("VPOOracleRelayer"),
				keccak256("1"),
				block.chainid,
				address(this)
			)
		);
	}

	/// @notice Add or remove an authorized signer
	function setSigner(address signer, bool enabled) external onlyAdmin {
		if (signer == address(0)) revert Errors.ZeroAddress();
		signers[signer] = enabled;
		emit SignerUpdated(signer, enabled);
	}

	/// @notice Request resolution (emits event for off-chain relayer to process)
	function requestResolve(bytes32 marketId, bytes calldata extraData) external override {
		emit ResolveRequested(marketId, msg.sender, extraData);
	}

	/// @notice Submit a signed attestation to resolve a market
	/// @param attestation The attestation data
	/// @param signature ECDSA signature of the attestation
	/// @param ipfsCid IPFS CID where full proof is stored (optional, can be empty)
	function fulfillAttestation(
		Attestation calldata attestation,
		bytes calldata signature,
		string calldata ipfsCid
	) external {
		// Check expiry
		if (attestation.expiresAt < block.timestamp) revert Errors.Expired();

		// Check replay protection
		if (_usedNonces[attestation.nonce]) revert Errors.AlreadyUsed();

		// Verify signature
		address signer = _recoverSigner(attestation, signature);
		if (!signers[signer]) revert Errors.InvalidSignature();

		// Mark nonce as used
		_usedNonces[attestation.nonce] = true;

		// Encode result data (outcome as uint8)
		bytes memory resultData = abi.encode(attestation.outcome);

		// Encode metadata (IPFS CID, sourceId, timestamp)
		bytes memory metadata = abi.encode(ipfsCid, attestation.sourceId, block.timestamp);

		// Store result
		_results[attestation.marketId] = Result({
			resolved: true,
			data: resultData,
			metadata: metadata
		});

		emit ResolveFulfilled(attestation.marketId, resultData, metadata);
		emit AttestationFulfilled(attestation.marketId, signer, attestation.outcome, ipfsCid);
	}

	/// @notice Get result for a market
	function getResult(bytes32 marketId)
		external
		view
		override
		returns (bool resolved, bytes memory resultData, bytes memory metadata)
	{
		Result memory r = _results[marketId];
		return (r.resolved, r.data, r.metadata);
	}

	/// @notice Check if a nonce has been used
	function isNonceUsed(uint256 nonce) external view returns (bool) {
		return _usedNonces[nonce];
	}

	/// @dev Recover signer from EIP-712 signature
	function _recoverSigner(Attestation calldata attestation, bytes calldata signature)
		internal
		view
		returns (address)
	{
		// Hash the sourceId string
		bytes32 sourceIdHash = keccak256(bytes(attestation.sourceId));

		// Create the struct hash
		bytes32 structHash = keccak256(
			abi.encode(
				ATTESTATION_TYPEHASH,
				attestation.marketId,
				attestation.questionHash,
				attestation.outcome,
				sourceIdHash,
				attestation.expiresAt,
				attestation.nonce
			)
		);

		// Create the final hash with domain separator
		bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

		// Recover signer from signature
		if (signature.length != 65) revert Errors.InvalidSignature();
		
		bytes32 r;
		bytes32 s;
		uint8 v;
		
		assembly {
			// Copy signature data from calldata to memory
			let sigOffset := signature.offset
			r := calldataload(sigOffset)
			s := calldataload(add(sigOffset, 0x20))
			v := byte(0, calldataload(add(sigOffset, 0x40)))
		}

		if (v < 27) v += 27;
		if (v != 27 && v != 28) revert Errors.InvalidSignature();

		return ecrecover(hash, v, r, s);
	}

	/// @notice Emitted when a signer is added or removed
	event SignerUpdated(address indexed signer, bool enabled);

	/// @notice Emitted when an attestation is fulfilled
	event AttestationFulfilled(
		bytes32 indexed marketId,
		address indexed signer,
		uint8 outcome,
		string ipfsCid
	);
}


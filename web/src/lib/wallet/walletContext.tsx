"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface WalletContextType {
	address: string | null;
	isConnected: boolean;
	connect: () => Promise<void>;
	disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }): React.ReactElement {
	const [address, setAddress] = useState<string | null>(null);
	const [isExplicitlyDisconnected, setIsExplicitlyDisconnected] = useState(false);

	// Check if wallet is already connected (only if not explicitly disconnected)
	useEffect(() => {
		// Skip auto-connection if user explicitly disconnected
		if (isExplicitlyDisconnected) {
			return;
		}

		const checkConnection = async () => {
			if (typeof window !== "undefined" && window.ethereum) {
				try {
					const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
					if (accounts && accounts.length > 0) {
						setAddress(accounts[0]);
						setIsExplicitlyDisconnected(false); // Reset flag when wallet is reconnected
					}
				} catch (error) {
					console.error("Error checking wallet connection:", error);
				}
			}
		};

		checkConnection();

		// Listen for account changes
		if (typeof window !== "undefined" && window.ethereum) {
			const handleAccountsChanged = (accounts: unknown) => {
				const accountList = accounts as string[];
				if (accountList && accountList.length > 0) {
					setAddress(accountList[0]);
					setIsExplicitlyDisconnected(false); // Reset flag when account changes
				} else {
					setAddress(null);
				}
			};

			window.ethereum.on("accountsChanged", handleAccountsChanged);

			return () => {
				window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
			};
		}
	}, [isExplicitlyDisconnected]);

	const connect = useCallback(async () => {
		if (typeof window === "undefined" || !window.ethereum) {
			alert("Please install MetaMask or another Ethereum wallet");
			return;
		}

		try {
			// Reset the disconnect flag when connecting
			setIsExplicitlyDisconnected(false);
			
			const accounts = (await window.ethereum.request({
				method: "eth_requestAccounts",
			})) as string[];
			if (accounts && accounts.length > 0) {
				setAddress(accounts[0]);
			}
		} catch (error) {
			console.error("Error connecting wallet:", error);
			if ((error as Error).message.includes("User rejected")) {
				alert("Wallet connection rejected");
			}
		}
	}, []);

	const disconnect = useCallback(() => {
		setAddress(null);
		setIsExplicitlyDisconnected(true); // Set flag to prevent auto-reconnection
		
		// Try to revoke permissions if MetaMask supports it
		if (typeof window !== "undefined" && window.ethereum) {
			try {
				// Some wallets support wallet_revokePermissions, but it's not standard
				// We'll just clear our local state and prevent auto-reconnection
			} catch (error) {
				console.error("Error disconnecting wallet:", error);
			}
		}
	}, []);

	return (
		<WalletContext.Provider
			value={{
				address,
				isConnected: !!address,
				connect,
				disconnect,
			}}
		>
			{children}
		</WalletContext.Provider>
	);
}

export function useWallet(): WalletContextType {
	const context = useContext(WalletContext);
	if (context === undefined) {
		throw new Error("useWallet must be used within a WalletProvider");
	}
	return context;
}

// Extend Window interface for TypeScript
declare global {
	interface Window {
		ethereum?: {
			request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
			on: (event: string, handler: (args: unknown) => void) => void;
			removeListener: (event: string, handler: (args: unknown) => void) => void;
			isMetaMask?: boolean;
		};
	}
}


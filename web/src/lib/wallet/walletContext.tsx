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

	// Check if wallet is already connected
	useEffect(() => {
		const checkConnection = async () => {
			if (typeof window !== "undefined" && window.ethereum) {
				try {
					const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
					if (accounts && accounts.length > 0) {
						setAddress(accounts[0]);
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
				} else {
					setAddress(null);
				}
			};

			window.ethereum.on("accountsChanged", handleAccountsChanged);

			return () => {
				window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
			};
		}
	}, []);

	const connect = useCallback(async () => {
		if (typeof window === "undefined" || !window.ethereum) {
			alert("Please install MetaMask or another Ethereum wallet");
			return;
		}

		try {
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


"use client";

import React from "react";
import { WalletProvider } from "@/lib/wallet/walletContext";

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
	return <WalletProvider>{children}</WalletProvider>;
}



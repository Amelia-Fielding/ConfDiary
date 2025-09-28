"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { useEip6963 } from "./useEip6963";

export function useMetaMaskProvider() {
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>(undefined);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  const providers = useEip6963();

  // Find MetaMask provider
  const metaMaskProvider = providers.find(p => 
    p.info.rdns === "io.metamask" || p.info.name.toLowerCase().includes("metamask")
  )?.provider;

  const connect = useCallback(async () => {
    if (!metaMaskProvider) {
      setError(new Error("MetaMask not found"));
      return;
    }

    try {
      setError(undefined);
      
      // Request account access
      const accounts = await metaMaskProvider.request({
        method: "eth_requestAccounts",
      }) as string[];

      setAccounts(accounts);
      setIsConnected(accounts.length > 0);
      setProvider(metaMaskProvider);

      // Get chain ID
      const chainIdHex = await metaMaskProvider.request({
        method: "eth_chainId",
      }) as string;
      
      setChainId(parseInt(chainIdHex, 16));

    } catch (error) {
      console.error("Failed to connect to MetaMask:", error);
      setError(error as Error);
      setIsConnected(false);
      setAccounts([]);
    }
  }, [metaMaskProvider]);

  const disconnect = useCallback(() => {
    setProvider(undefined);
    setIsConnected(false);
    setAccounts([]);
    setChainId(undefined);
    setError(undefined);
  }, []);

  // Handle account changes
  useEffect(() => {
    if (!metaMaskProvider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAccounts(accounts);
      setIsConnected(accounts.length > 0);
      
      if (accounts.length === 0) {
        disconnect();
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setChainId(parseInt(chainIdHex, 16));
    };

    const handleDisconnect = () => {
      disconnect();
    };

    (metaMaskProvider as any).on("accountsChanged", handleAccountsChanged);
    (metaMaskProvider as any).on("chainChanged", handleChainChanged);
    (metaMaskProvider as any).on("disconnect", handleDisconnect);

    return () => {
      (metaMaskProvider as any).removeListener("accountsChanged", handleAccountsChanged);
      (metaMaskProvider as any).removeListener("chainChanged", handleChainChanged);
      (metaMaskProvider as any).removeListener("disconnect", handleDisconnect);
    };
  }, [metaMaskProvider, disconnect]);

  // Auto-connect if already connected
  useEffect(() => {
    if (!metaMaskProvider) return;

    const checkConnection = async () => {
      try {
        const accounts = await metaMaskProvider.request({
          method: "eth_accounts",
        }) as string[];

        if (accounts.length > 0) {
          setAccounts(accounts);
          setIsConnected(true);
          setProvider(metaMaskProvider);

          const chainIdHex = await metaMaskProvider.request({
            method: "eth_chainId",
          }) as string;
          
          setChainId(parseInt(chainIdHex, 16));
        }
      } catch (error) {
        console.error("Failed to check MetaMask connection:", error);
      }
    };

    checkConnection();
  }, [metaMaskProvider]);

  return {
    provider,
    isConnected,
    accounts,
    chainId,
    error,
    connect,
    disconnect,
    isMetaMaskAvailable: !!metaMaskProvider,
  };
}




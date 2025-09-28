"use client";

import { ethers } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMetaMaskProvider } from "./useMetaMaskProvider";

interface MetaMaskEthersSignerState {
  provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  connect: () => Promise<void>;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.JsonRpcProvider | undefined;
  sameChain: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
  initialMockChains: Record<number, string>;
}

const MetaMaskEthersSignerContext = createContext<MetaMaskEthersSignerState | undefined>(undefined);

export const useMetaMaskEthersSigner = () => {
  const context = useContext(MetaMaskEthersSignerContext);
  if (!context) {
    throw new Error("useMetaMaskEthersSigner must be used within a MetaMaskEthersSignerProvider");
  }
  return context;
};

interface MetaMaskEthersSignerProviderProps {
  children: React.ReactNode;
  initialMockChains?: Record<number, string>;
}

export const MetaMaskEthersSignerProvider: React.FC<MetaMaskEthersSignerProviderProps> = ({
  children,
  initialMockChains = { 31337: "http://localhost:8545" }
}) => {
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
  } = useMetaMaskProvider();

  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [ethersReadonlyProvider, setEthersReadonlyProvider] = useState<ethers.JsonRpcProvider | undefined>(undefined);

  // Refs for stable comparisons
  const chainIdRef = useRef<number | undefined>(chainId);
  const ethersSignerRef = useRef<ethers.JsonRpcSigner | undefined>(ethersSigner);

  // Update refs when values change
  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  useEffect(() => {
    ethersSignerRef.current = ethersSigner;
  }, [ethersSigner]);

  // Comparison functions
  const sameChain = useRef<(chainId: number | undefined) => boolean>((newChainId) => {
    return chainIdRef.current === newChainId;
  });

  const sameSigner = useRef<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>((newSigner) => {
    return ethersSignerRef.current === newSigner;
  });

  // Create ethers signer when provider and accounts are available
  useEffect(() => {
    if (!provider || !accounts || accounts.length === 0) {
      setEthersSigner(undefined);
      return;
    }

    const createSigner = async () => {
      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        setEthersSigner(signer);
      } catch (error) {
        console.error("Failed to create ethers signer:", error);
        setEthersSigner(undefined);
      }
    };

    createSigner();
  }, [provider, accounts]);

  // Create readonly provider based on chain
  useEffect(() => {
    if (!chainId) {
      setEthersReadonlyProvider(undefined);
      return;
    }

    let rpcUrl: string;
    
    if (chainId in initialMockChains) {
      // Use mock chain RPC URL
      rpcUrl = initialMockChains[chainId];
    } else if (chainId === 11155111) {
      // Sepolia testnet
      rpcUrl = "https://eth-sepolia.public.blastapi.io";
    } else if (chainId === 1) {
      // Ethereum mainnet
      rpcUrl = "https://eth-mainnet.public.blastapi.io";
    } else {
      // Default to localhost for unknown chains
      rpcUrl = "http://localhost:8545";
    }

    try {
      const readonlyProvider = new ethers.JsonRpcProvider(rpcUrl);
      setEthersReadonlyProvider(readonlyProvider);
    } catch (error) {
      console.error("Failed to create readonly provider:", error);
      setEthersReadonlyProvider(undefined);
    }
  }, [chainId, initialMockChains]);

  const contextValue: MetaMaskEthersSignerState = useMemo(() => ({
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  }), [
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    initialMockChains,
  ]);

  return (
    <MetaMaskEthersSignerContext.Provider value={contextValue}>
      {children}
    </MetaMaskEthersSignerContext.Provider>
  );
};




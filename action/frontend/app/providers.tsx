"use client";

import { MetaMaskEthersSignerProvider } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <MetaMaskEthersSignerProvider
      initialMockChains={{ 31337: "http://localhost:8545" }}
    >
      <InMemoryStorageProvider>
        {children}
      </InMemoryStorageProvider>
    </MetaMaskEthersSignerProvider>
  );
}




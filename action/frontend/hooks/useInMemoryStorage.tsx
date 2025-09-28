"use client";

import { createContext, useContext, useState } from "react";
import { GenericStringStorage, GenericStringInMemoryStorage } from "@/fhevm/GenericStringStorage";

interface UseInMemoryStorageState {
  storage: GenericStringStorage;
}

const InMemoryStorageContext = createContext<UseInMemoryStorageState | undefined>(undefined);

export const useInMemoryStorage = () => {
  const context = useContext(InMemoryStorageContext);
  if (!context) {
    throw new Error("useInMemoryStorage must be used within a InMemoryStorageProvider");
  }
  return context;
};

interface InMemoryStorageProviderProps {
  children: React.ReactNode;
}

export const InMemoryStorageProvider: React.FC<InMemoryStorageProviderProps> = ({ children }) => {
  const [storage] = useState<GenericStringStorage>(() => new GenericStringInMemoryStorage());

  return (
    <InMemoryStorageContext.Provider value={{ storage }}>
      {children}
    </InMemoryStorageContext.Provider>
  );
};




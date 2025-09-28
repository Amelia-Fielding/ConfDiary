"use client";

import { useState, useCallback } from "react";

interface DecryptedEntry {
  entryId: string;
  contentHash: string;
  authorHash: string;
  moodValue?: string; // 🎯 解密的心情值
  localContent?: string;
  decryptedAt: number;
}

export const useDecryptedEntries = () => {
  const [decryptedEntries, setDecryptedEntries] = useState<Record<string, DecryptedEntry>>({});

  const addDecryptedEntry = useCallback((entryId: string, data: Omit<DecryptedEntry, 'entryId' | 'decryptedAt'>) => {
    setDecryptedEntries(prev => ({
      ...prev,
      [entryId]: {
        ...data,
        entryId,
        decryptedAt: Date.now()
      }
    }));
  }, []);

  const getDecryptedEntry = useCallback((entryId: string) => {
    return decryptedEntries[entryId];
  }, [decryptedEntries]);

  const isDecrypted = useCallback((entryId: string) => {
    return entryId in decryptedEntries;
  }, [decryptedEntries]);

  return {
    decryptedEntries,
    addDecryptedEntry,
    getDecryptedEntry,
    isDecrypted
  };
};

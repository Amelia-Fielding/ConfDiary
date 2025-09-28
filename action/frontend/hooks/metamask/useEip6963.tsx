"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  EIP6963ProviderDetail,
  EIP6963AnnounceProviderEvent,
} from "./Eip6963Types";

export function useEip6963() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);

  const handleAnnouncement = useCallback((event: EIP6963AnnounceProviderEvent) => {
    setProviders((currentProviders) => {
      const exists = currentProviders.some(p => p.info.uuid === event.detail.info.uuid);
      if (exists) return currentProviders;
      return [...currentProviders, event.detail];
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for provider announcements
    window.addEventListener("eip6963:announceProvider", handleAnnouncement as EventListener);

    // Request providers to announce themselves
    const requestEvent = new Event("eip6963:requestProvider");
    window.dispatchEvent(requestEvent);

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement as EventListener);
    };
  }, [handleAnnouncement]);

  return providers;
}




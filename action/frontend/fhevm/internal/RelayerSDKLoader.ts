type Trace = (...args: any[]) => void;

import { SDK_CDN_URL } from "./constants";

export class RelayerSDKLoader {
  #trace?: Trace;

  constructor(parameters?: { trace?: Trace }) {
    this.#trace = parameters?.trace;
  }

  load(): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("RelayerSDKLoader.load must run in a browser environment"));
    }

    // Already loaded
    if ((window as any).relayerSDK) {
      this.#trace?.("relayerSDK already present on window");
      return Promise.resolve();
    }

    // If a script with the same id already exists, wait for it to finish loading
    const existing = document.getElementById("relayer-sdk-js");
    if (existing) {
      this.#trace?.("relayerSDK script already in DOM, waiting for onload");
      return new Promise<void>((resolve, reject) => {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load relayer SDK")));
      });
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const script = document.createElement("script");
        script.id = "relayer-sdk-js";
        script.async = true;
        script.src = SDK_CDN_URL;
        script.onload = () => {
          if ((window as any).relayerSDK) {
            this.#trace?.("relayerSDK loaded successfully from CDN");
            resolve();
          } else {
            reject(new Error("relayerSDK global not found after script load"));
          }
        };
        script.onerror = () => reject(new Error("Failed to load relayer SDK from CDN"));
        document.head.appendChild(script);
      } catch (error) {
        reject(error as Error);
      }
    });
  }
}



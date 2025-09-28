import { ethers } from "ethers";
import { RelayerSDKLoader } from "./RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "./PublicKeyStorage";
import {
  FHEVM_HARDHAT_NODE_RELAYER_METADATA_RPC_METHOD,
  WEB3_CLIENT_VERSION_RPC_METHOD,
} from "./constants";
import type {
  FhevmInstance,
  FhevmInstanceConfig,
  FhevmRelayerStatusType,
  TraceType,
} from "../fhevmTypes";

// Error classes
export class FhevmReactError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message);
    this.code = code;
    this.name = "FhevmReactError";
  }
}

export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";
  }
}

// Window type for RelayerSDK
interface FhevmWindowType extends Window {
  relayerSDK: {
    initSDK: (options?: any) => Promise<boolean>;
    createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
    SepoliaConfig: {
      aclContractAddress: string;
      kmsContractAddress: string;
      inputVerifierContractAddress: string;
      chainId: number;
      gatewayChainId: number;
      network: string;
      relayerUrl: string;
    };
    __initialized__?: boolean;
  };
}

// Type guards
function isFhevmWindowType(window: Window, trace?: TraceType): window is FhevmWindowType {
  const win = window as any;
  if (!win.relayerSDK) {
    trace?.("window.relayerSDK is undefined");
    return false;
  }
  return true;
}

function isFhevmInitialized(): boolean {
  const win = window as any;
  return Boolean(win.relayerSDK?.__initialized__);
}

// SDK loading and initialization
const fhevmLoadSDK = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK = async (options?: any) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }

  const result = await window.relayerSDK.initSDK(options);
  window.relayerSDK.__initialized__ = result;

  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }

  return true;
};

// Provider resolution
async function resolve(
  providerOrUrl: ethers.Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<{
  isMock: boolean;
  rpcUrl: string;
  chainId: number;
}> {
  let rpcUrl: string;
  let chainId: number;

  if (typeof providerOrUrl === "string") {
    rpcUrl = providerOrUrl;
    // Get chainId from RPC
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);
  } else {
    // Get chainId from provider
    const chainIdHex = await providerOrUrl.request({ method: "eth_chainId" });
    chainId = parseInt(chainIdHex as string, 16);
    
    // Check if this is a mock chain
    if (mockChains && chainId in mockChains) {
      rpcUrl = mockChains[chainId];
    } else {
      // Use the provider as RPC URL (this is a simplification)
      rpcUrl = `http://localhost:8545`; // Default for local development
    }
  }

  // Check if this is a mock/local environment
  const isMock = mockChains ? chainId in mockChains : chainId === 31337;

  return { isMock, rpcUrl, chainId };
}

// Hardhat node metadata fetching
async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Check if it's a Hardhat node
    const clientVersion = await provider.send(WEB3_CLIENT_VERSION_RPC_METHOD, []);
    if (!clientVersion.toLowerCase().includes("hardhat")) {
      return null;
    }

    // For local development, return mock metadata
    // In a real FHEVM node, this would come from the actual RPC call
    const mockMetadata = {
      ACLAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D",
      InputVerifierAddress: "0x901F8942346f7AB3a01F6D7613119Bca447Bb030", 
      KMSVerifierAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC"
    };

    // Try to fetch real FHEVM metadata, but fall back to mock if not available
    try {
      const metadata = await provider.send(FHEVM_HARDHAT_NODE_RELAYER_METADATA_RPC_METHOD, []);
      return metadata;
    } catch (fhevmError) {
      console.log("Using mock FHEVM metadata for local development");
      return mockMetadata;
    }
  } catch (error) {
    console.warn("Failed to fetch FHEVM Hardhat node metadata:", error);
    return null;
  }
}

// Main instance creation function
export const createFhevmInstance = async (parameters: {
  provider: ethers.Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (parameters.signal.aborted) {
      console.log("[createFhevmInstance] Operation was aborted, stopping...");
      throw new FhevmAbortError();
    }
  };

  const { provider: providerOrUrl, mockChains, signal, onStatusChange } = parameters;

  onStatusChange?.("sdk-loading");

  // 1. Resolve chain ID and RPC URL
  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);
  throwIfAborted();

  // 2. Handle Mock environment (development)
  if (isMock) {
    const fhevmRelayerMetadata = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
    if (fhevmRelayerMetadata) {
      onStatusChange?.("creating");
      const fhevmMock = await import("./mock/fhevmMock");
      const mockInstance = await fhevmMock.fhevmMockCreateInstance({
        rpcUrl,
        chainId,
        metadata: fhevmRelayerMetadata,
      });
      throwIfAborted();
      onStatusChange?.("ready");
      return mockInstance;
    }
  }

  // 3. Production environment handling
  if (!isFhevmWindowType(window, console.log)) {
    await fhevmLoadSDK();
    throwIfAborted();
  }

  if (!isFhevmInitialized()) {
    onStatusChange?.("sdk-initializing");
    await fhevmInitSDK();
    throwIfAborted();
  }

  // 4. Get stored public key
  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;
  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress as `0x${string}`;
  const pub = await publicKeyStorageGet(aclAddress);
  throwIfAborted();

  // 5. Create instance configuration
  const config = {
    ...relayerSDK.SepoliaConfig,
    network: providerOrUrl,
    publicKey: pub.publicKey,
    publicParams: pub.publicParams || undefined,
  } as FhevmInstanceConfig;

  onStatusChange?.("creating");

  // 6. Create and return instance
  const instance = await relayerSDK.createInstance(config);

  // 7. Save public key (async, don't block)
  await publicKeyStorageSet(
    aclAddress,
    instance.getPublicKey(),
    instance.getPublicParams(2048)
  );

  throwIfAborted();
  onStatusChange?.("ready");
  return instance;
};

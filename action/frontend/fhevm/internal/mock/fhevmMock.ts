//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAYS USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  console.log("[fhevmMock] Creating MockFhevmInstance with parameters:", parameters);
  
  try {
    const provider = new JsonRpcProvider(parameters.rpcUrl);
    
    // Test provider connection
    const network = await provider.getNetwork();
    console.log("[fhevmMock] Connected to network:", network.chainId.toString());
    
    const instance = await MockFhevmInstance.create(provider, provider, {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId: 55815,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption:
        "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification:
        "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
    });
    
    console.log("[fhevmMock] MockFhevmInstance created successfully");
    return instance;
  } catch (error) {
    console.error("[fhevmMock] Failed to create MockFhevmInstance:", error);
    throw error;
  }
};

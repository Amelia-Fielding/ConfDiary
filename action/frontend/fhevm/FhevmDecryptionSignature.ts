import { ethers } from "ethers";
import type { FhevmInstance, EIP712Type } from "./fhevmTypes";
import type { GenericStringStorage } from "./GenericStringStorage";

export interface FhevmDecryptionSignatureType {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
}

class FhevmDecryptionSignatureStorageKey {
  #key: string;

  constructor(
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    // Create a unique key based on instance, contracts, user, and optionally public key
    const contractsHash = ethers.keccak256(
      ethers.toUtf8Bytes(contractAddresses.sort().join(","))
    );
    
    const keyComponents = [
      "fhevm_decryption_signature",
      userAddress.toLowerCase(),
      contractsHash,
    ];

    if (publicKey) {
      keyComponents.push(ethers.keccak256(ethers.toUtf8Bytes(publicKey)));
    }

    this.#key = keyComponents.join("_");
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number;
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];
  #eip712: EIP712Type;

  constructor(parameters: FhevmDecryptionSignatureType) {
    this.#publicKey = parameters.publicKey;
    this.#privateKey = parameters.privateKey;
    this.#signature = parameters.signature;
    this.#startTimestamp = parameters.startTimestamp;
    this.#durationDays = parameters.durationDays;
    this.#userAddress = parameters.userAddress;
    this.#contractAddresses = parameters.contractAddresses;
    this.#eip712 = parameters.eip712;
  }

  // Getters
  get publicKey(): string {
    return this.#publicKey;
  }

  get privateKey(): string {
    return this.#privateKey;
  }

  get signature(): string {
    return this.#signature;
  }

  get startTimestamp(): number {
    return this.#startTimestamp;
  }

  get durationDays(): number {
    return this.#durationDays;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get eip712(): EIP712Type {
    return this.#eip712;
  }

  // Check if signature is still valid
  isValid(): boolean {
    const now = Math.floor(Date.now() / 1000);
    const expirationTime = this.#startTimestamp + this.#durationDays * 24 * 60 * 60;
    return now < expirationTime;
  }

  // Serialize to JSON
  toJSON(): string {
    return JSON.stringify({
      publicKey: this.#publicKey,
      privateKey: this.#privateKey,
      signature: this.#signature,
      startTimestamp: this.#startTimestamp,
      durationDays: this.#durationDays,
      userAddress: this.#userAddress,
      contractAddresses: this.#contractAddresses,
      eip712: this.#eip712,
    });
  }

  // Deserialize from JSON
  static fromJSON(json: string): FhevmDecryptionSignature {
    const data = JSON.parse(json);
    return new FhevmDecryptionSignature(data);
  }

  // Save to storage
  async saveToGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    includePublicKey: boolean = false
  ): Promise<void> {
    const storageKey = new FhevmDecryptionSignatureStorageKey(
      instance,
      this.#contractAddresses,
      this.#userAddress,
      includePublicKey ? this.#publicKey : undefined
    );

    await storage.setItem(storageKey.key, this.toJSON());
  }

  // Load from storage
  static async loadFromGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        contractAddresses,
        userAddress,
        publicKey
      );

      const result = await storage.getItem(storageKey.key);
      if (!result) return null;

      const signature = FhevmDecryptionSignature.fromJSON(result);
      return signature.isValid() ? signature : null;
    } catch (error) {
      console.warn("Failed to load decryption signature from storage:", error);
      return null;
    }
  }

  // Create new signature
  static async new(
    instance: FhevmInstance,
    contractAddresses: string[],
    publicKey: string,
    privateKey: string,
    signer: ethers.Signer
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const userAddress = (await signer.getAddress()) as `0x${string}`;
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 365; // 1 year validity

      // Create EIP712 signature data
      const eip712 = instance.createEIP712(
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      // Sign the data
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        contractAddresses: contractAddresses as `0x${string}`[],
        startTimestamp,
        durationDays,
        signature,
        eip712: eip712 as EIP712Type,
        userAddress,
      });
    } catch (error) {
      console.error("Failed to create decryption signature:", error);
      return null;
    }
  }

  // Load existing signature or create new one
  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: ethers.Signer,
    storage: GenericStringStorage,
    keyPair?: { publicKey: string; privateKey: string }
  ): Promise<FhevmDecryptionSignature | null> {
    const userAddress = (await signer.getAddress()) as `0x${string}`;

    // Try to load from cache
    const cached = await FhevmDecryptionSignature.loadFromGenericStringStorage(
      storage,
      instance,
      contractAddresses,
      userAddress,
      keyPair?.publicKey
    );

    if (cached) {
      console.log("Using cached decryption signature");
      return cached;
    }

    console.log("Creating new decryption signature");

    // Create new signature
    const { publicKey, privateKey } = keyPair ?? instance.generateKeypair();
    const signature = await FhevmDecryptionSignature.new(
      instance,
      contractAddresses,
      publicKey,
      privateKey,
      signer
    );

    if (!signature) return null;

    // Save to storage
    await signature.saveToGenericStringStorage(storage, instance, Boolean(keyPair?.publicKey));

    return signature;
  }
}




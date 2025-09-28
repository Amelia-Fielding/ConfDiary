"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

// 导入生成的ABI和地址
import { ConfDiaryAddresses } from "@/abi/ConfDiaryAddresses";
import { ConfDiaryABI } from "@/abi/ConfDiaryABI";

export type DiaryEntry = {
  entryId: string;
  encryptedContentHash: string;
  encryptedAuthorHash: string;
  timestamp: number;
  isDeleted: boolean;
};

export type ClearDiaryEntry = {
  entryId: string;
  contentHash: string;
  authorHash: string;
  timestamp: number;
  content?: string; // 解密后的实际内容
};

type ConfDiaryInfoType = {
  abi: typeof ConfDiaryABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

/**
 * 根据链ID获取ConfDiary合约信息
 */
function getConfDiaryByChainId(chainId: number | undefined): ConfDiaryInfoType {
  if (!chainId) {
    return { abi: ConfDiaryABI.abi };
  }

  const entry = ConfDiaryAddresses[chainId.toString() as keyof typeof ConfDiaryAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: ConfDiaryABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: ConfDiaryABI.abi,
  };
}

export const useConfDiary = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // 状态管理
  const [recentEntries, setRecentEntries] = useState<string[]>([]);
  const [userEntries, setUserEntries] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Refs for avoiding stale closures
  const confDiaryRef = useRef<ConfDiaryInfoType | undefined>(undefined);
  const isCreatingRef = useRef<boolean>(isCreating);
  const isLoadingRef = useRef<boolean>(isLoading);

  // 获取合约信息
  const confDiary = useMemo(() => {
    const c = getConfDiaryByChainId(chainId);
    confDiaryRef.current = c;

    if (!c.address) {
      setMessage(`ConfDiary deployment not found for chainId=${chainId}.`);
    } else {
      console.log("ConfDiary contract found:", c.address, "on chain", chainId);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!confDiary) {
      return undefined;
    }
    return Boolean(confDiary.address) && confDiary.address !== ethers.ZeroAddress;
  }, [confDiary]);

  // 检查是否可以执行操作
  const canCreateEntry = useMemo(() => {
    return (
      confDiary.address &&
      instance &&
      ethersSigner &&
      !isCreating &&
      !isLoading
    );
  }, [confDiary.address, instance, ethersSigner, isCreating, isLoading]);

  const canLoadEntries = useMemo(() => {
    return confDiary.address && ethersReadonlyProvider && !isLoading;
  }, [confDiary.address, ethersReadonlyProvider, isLoading]);

  // 创建日记条目
  const createDiaryEntry = useCallback(
    async (content: string, mood: number = 5) => {
      if (isCreatingRef.current || isLoadingRef.current) return;
      if (!confDiary.address || !instance || !ethersSigner || !content.trim()) return;

      const thisChainId = chainId;
      const thisConfDiaryAddress = confDiary.address;
      const thisEthersSigner = ethersSigner;

      isCreatingRef.current = true;
      setIsCreating(true);
      setMessage("Creating diary entry...");

      const run = async () => {
        const isStale = () =>
          thisConfDiaryAddress !== confDiaryRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          if (isStale()) {
            setMessage("Ignore create diary entry");
            return;
          }

          setMessage("Encrypting content...");

          // 1. 创建内容和作者的哈希
          const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));
          const authorHash = ethers.keccak256(ethers.toUtf8Bytes(thisEthersSigner.address));

          // 2. 创建加密输入
          const input = instance.createEncryptedInput(
            thisConfDiaryAddress,
            thisEthersSigner.address
          );

          // 添加内容哈希、作者哈希和心情值
          input.add256(BigInt(contentHash));
          input.add256(BigInt(authorHash));
          input.add8(mood); // 🎯 添加心情值 (1-10)

          // 3. 执行加密（CPU密集型操作）
          await new Promise(resolve => setTimeout(resolve, 100));
          const enc = await input.encrypt();

          if (isStale()) return;

          // 4. 创建合约实例
          const confDiaryContract = new ethers.Contract(
            thisConfDiaryAddress,
            confDiary.abi,
            thisEthersSigner
          );

          setMessage("Calling contract...");

          // 5. 调用智能合约
          const tx = await confDiaryContract.createDiaryEntry(
            enc.handles[0], // 加密的内容哈希
            enc.handles[1], // 加密的作者哈希
            enc.handles[2], // 🎯 加密的心情值
            enc.inputProof, // 内容哈希证明
            enc.inputProof, // 作者哈希证明
            enc.inputProof  // 心情值证明
          );

          setMessage(`Waiting for transaction: ${tx.hash}...`);

          // 6. 等待交易确认
          const receipt = await tx.wait();

          setMessage(`Diary entry created! Status: ${receipt?.status}`);

          if (isStale()) return;

          // 7. 刷新条目列表
          loadRecentEntries();
          loadUserEntries();

          // 8. 存储本地内容映射（用于解密后显示）
          const entryId = await getLatestEntryId();
          if (entryId) {
            localStorage.setItem(`diary_content_${entryId}`, content);
          }

        } catch (error: any) {
          console.error("Create diary entry failed:", error);
          setMessage(`Failed to create entry: ${error.message}`);
        } finally {
          isCreatingRef.current = false;
          setIsCreating(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      confDiary.address,
      confDiary.abi,
      instance,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  // 获取最新的条目ID
  const getLatestEntryId = useCallback(async () => {
    if (!confDiary.address || !ethersReadonlyProvider) return null;

    try {
      const contract = new ethers.Contract(
        confDiary.address,
        confDiary.abi,
        ethersReadonlyProvider
      );
      const totalEntries = await contract.getTotalEntries();
      return totalEntries.toString();
    } catch (error) {
      console.error("Failed to get latest entry ID:", error);
      return null;
    }
  }, [confDiary.address, confDiary.abi, ethersReadonlyProvider]);

  // 加载最近的条目
  const loadRecentEntries = useCallback(() => {
    if (isLoadingRef.current) return;
    if (!confDiary.address || !ethersReadonlyProvider) {
      setRecentEntries([]);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    const thisChainId = chainId;
    const thisConfDiaryAddress = confDiary.address;

    const contract = new ethers.Contract(
      thisConfDiaryAddress,
      confDiary.abi,
      ethersReadonlyProvider
    );

    contract
      .getRecentEntries(10) // 获取最近10条
      .then((entryIds: bigint[]) => {
        if (sameChain.current(thisChainId) && 
            thisConfDiaryAddress === confDiaryRef.current?.address) {
          setRecentEntries(entryIds.map(id => id.toString()));
          console.log("Loaded recent entries:", entryIds.length);
        }
        isLoadingRef.current = false;
        setIsLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load recent entries:", e);
        // 如果是因为没有条目导致的解码错误，设置为空数组
        if (e.message.includes("could not decode result data")) {
          console.log("No recent entries found (empty result)");
          setRecentEntries([]);
        } else {
          setMessage("Failed to load recent entries: " + e.message);
        }
        isLoadingRef.current = false;
        setIsLoading(false);
      });
  }, [confDiary.address, confDiary.abi, ethersReadonlyProvider, chainId, sameChain]);

  // 加载用户的条目
  const loadUserEntries = useCallback(() => {
    if (isLoadingRef.current) return;
    if (!confDiary.address || !ethersReadonlyProvider || !ethersSigner) {
      setUserEntries([]);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    const thisChainId = chainId;
    const thisConfDiaryAddress = confDiary.address;
    const thisEthersSigner = ethersSigner;

    const contract = new ethers.Contract(
      thisConfDiaryAddress,
      confDiary.abi,
      ethersReadonlyProvider
    );

    contract
      .getUserEntries(thisEthersSigner.address)
      .then((entryIds: bigint[]) => {
        if (sameChain.current(thisChainId) && 
            sameSigner.current(thisEthersSigner) &&
            thisConfDiaryAddress === confDiaryRef.current?.address) {
          setUserEntries(entryIds.map(id => id.toString()));
          console.log("Loaded user entries for", thisEthersSigner.address, ":", entryIds.length, "entries");
          console.log("Entry IDs:", entryIds.map(id => id.toString()));
        }
        isLoadingRef.current = false;
        setIsLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load user entries:", e);
        // 如果是因为没有条目导致的解码错误，设置为空数组
        if (e.message.includes("could not decode result data")) {
          console.log("No user entries found (empty result)");
          setUserEntries([]);
        } else {
          setMessage("Failed to load user entries: " + e.message);
        }
        isLoadingRef.current = false;
        setIsLoading(false);
      });
  }, [confDiary.address, confDiary.abi, ethersReadonlyProvider, ethersSigner, chainId, sameChain, sameSigner]);

  // 自动加载条目
  useEffect(() => {
    if (canLoadEntries) {
      loadRecentEntries();
    }
  }, [confDiary.address, ethersReadonlyProvider]); // 只依赖稳定的值

  useEffect(() => {
    console.log("useEffect for loadUserEntries triggered:", {
      address: confDiary.address,
      provider: !!ethersReadonlyProvider,
      signer: !!ethersSigner,
      signerAddress: ethersSigner?.address
    });
    
    if (confDiary.address && ethersReadonlyProvider && ethersSigner) {
      console.log("Calling loadUserEntries...");
      loadUserEntries();
    } else {
      console.log("Prerequisites not met for loadUserEntries");
    }
  }, [confDiary.address, ethersReadonlyProvider, ethersSigner, loadUserEntries]); // 添加loadUserEntries依赖

  // 添加一个强制刷新的effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (confDiary.address && ethersReadonlyProvider && ethersSigner && userEntries.length === 0) {
        console.log("Force calling loadUserEntries after delay...");
        loadUserEntries();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [confDiary.address, ethersReadonlyProvider, ethersSigner, userEntries.length, loadUserEntries]);

  return {
    contractAddress: confDiary.address,
    abi: confDiary.abi, // 添加abi
    isDeployed,
    canCreateEntry,
    canLoadEntries,
    isCreating,
    isLoading,
    message,
    recentEntries,
    userEntries,
    createDiaryEntry,
    loadRecentEntries,
    loadUserEntries,
    instance, // 添加instance到返回值中
  };
};

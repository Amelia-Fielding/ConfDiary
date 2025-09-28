"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

interface DiaryTestProps {
  confDiary: any;
  fhevmInstance: any;
  ethersSigner: any;
}

export const DiaryTest: React.FC<DiaryTestProps> = ({
  confDiary,
  fhevmInstance,
  ethersSigner
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  const createTestEntry = async () => {
    if (!fhevmInstance || !ethersSigner || !confDiary.contractAddress) {
      setMessage("Prerequisites not met");
      return;
    }

    setIsCreating(true);
    setMessage("Creating test diary entry...");

    try {
      console.log("=== Creating Test Diary Entry ===");
      console.log("Contract Address:", confDiary.contractAddress);
      console.log("User Address:", ethersSigner.address);
      console.log("FHEVM Instance:", !!fhevmInstance);

      // 1. 准备测试内容
      const testContent = `Test diary entry created at ${new Date().toLocaleString()}`;
      console.log("Content:", testContent);

      // 2. 创建哈希
      const { ethers } = await import("ethers");
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(testContent));
      const authorHash = ethers.keccak256(ethers.toUtf8Bytes(ethersSigner.address));
      
      console.log("Content Hash:", contentHash);
      console.log("Author Hash:", authorHash);

      // 3. 使用FHEVM加密
      setMessage("Encrypting with FHEVM...");
      const input = fhevmInstance.createEncryptedInput(
        confDiary.contractAddress,
        ethersSigner.address
      );

      input.add256(BigInt(contentHash));
      input.add256(BigInt(authorHash));

      console.log("Starting encryption...");
      const enc = await input.encrypt();
      console.log("Encryption completed:", enc);

      // 4. 调用合约
      setMessage("Calling smart contract...");
      const contract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersSigner
      );

      console.log("Calling createDiaryEntry...");
      const tx = await contract.createDiaryEntry(
        enc.handles[0],
        enc.handles[1], 
        enc.inputProof,
        enc.inputProof
      );

      setMessage(`Transaction sent: ${tx.hash}`);
      console.log("Transaction hash:", tx.hash);

      // 5. 等待确认
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // 6. 保存本地内容映射
      const totalEntries = await contract.getTotalEntries();
      localStorage.setItem(`diary_content_${totalEntries}`, testContent);

      setMessage(`✅ Test entry created successfully! Entry ID: ${totalEntries}`);
      
      // 7. 刷新条目列表
      setTimeout(() => {
        confDiary.loadRecentEntries();
        confDiary.loadUserEntries();
      }, 1000);

    } catch (error: any) {
      console.error("Failed to create test entry:", error);
      setMessage(`❌ Failed: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🧪 FHEVM 测试面板</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <div>Contract: {confDiary.contractAddress || "Not found"}</div>
          <div>User: {ethersSigner?.address || "Not connected"}</div>
          <div>FHEVM Instance: {fhevmInstance ? "Ready" : "Not ready"}</div>
          <div>Recent Entries: {confDiary.recentEntries?.length || 0}</div>
          <div>User Entries: {confDiary.userEntries?.length || 0}</div>
        </div>

        <Button
          onClick={createTestEntry}
          disabled={!fhevmInstance || !ethersSigner || !confDiary.contractAddress || isCreating}
          isLoading={isCreating}
          className="w-full"
        >
          {isCreating ? "Creating..." : "🔐 Create Test Diary Entry"}
        </Button>

        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};




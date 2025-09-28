"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

interface AccountDebugProps {
  confDiary: any;
  ethersSigner: any;
  ethersReadonlyProvider: any;
}

export const AccountDebug: React.FC<AccountDebugProps> = ({
  confDiary,
  ethersSigner,
  ethersReadonlyProvider
}) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAccountEntries = async () => {
    if (!confDiary.contractAddress || !ethersReadonlyProvider || !ethersSigner) {
      setDebugInfo({ error: "Missing prerequisites" });
      return;
    }

    setIsLoading(true);
    
    try {
      const { ethers } = await import("ethers");
      const contract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersReadonlyProvider
      );

      // 1. 检查总条目数
      const totalEntries = await contract.getTotalEntries();
      console.log("Total entries:", totalEntries.toString());

      // 2. 检查当前用户的条目
      const userEntries = await contract.getUserEntries(ethersSigner.address);
      console.log("User entries for", ethersSigner.address, ":", userEntries);

      // 3. 检查最近的条目
      const recentEntries = await contract.getRecentEntries(10);
      console.log("Recent entries:", recentEntries);

      // 4. 检查每个recent entry的详情
      const entryDetails = [];
      for (let i = 0; i < Math.min(recentEntries.length, 5); i++) {
        const entryId = recentEntries[i];
        try {
          const entry = await contract.getDiaryEntry(entryId);
          entryDetails.push({
            id: entryId.toString(),
            timestamp: entry.timestamp.toString(),
            isDeleted: entry.isDeleted
          });
        } catch (error) {
          console.log(`Failed to get entry ${entryId}:`, error);
        }
      }

      setDebugInfo({
        currentUser: ethersSigner.address,
        totalEntries: totalEntries.toString(),
        userEntries: userEntries.map((id: bigint) => id.toString()),
        recentEntries: recentEntries.map((id: bigint) => id.toString()),
        entryDetails
      });

    } catch (error: any) {
      console.error("Debug check failed:", error);
      setDebugInfo({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔍 账户调试面板</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={checkAccountEntries}
          disabled={isLoading}
          isLoading={isLoading}
          size="sm"
        >
          检查账户条目
        </Button>

        {debugInfo && (
          <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};




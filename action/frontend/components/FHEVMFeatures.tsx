"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

interface FHEVMFeaturesProps {
  confDiary: any;
  fhevmInstance: any;
  ethersSigner: any;
  ethersReadonlyProvider: any;
  currentUserAddress: string;
}

export const FHEVMFeatures: React.FC<FHEVMFeaturesProps> = ({
  confDiary,
  fhevmInstance,
  ethersSigner,
  ethersReadonlyProvider,
  currentUserAddress
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [compareAddress, setCompareAddress] = useState("");

  // 🎯 匿名点赞功能
  const likeEntry = async (entryId: string) => {
    if (!fhevmInstance || !ethersSigner || !confDiary.contractAddress) return;

    setIsLoading(true);
    setMessage(`正在点赞条目 #${entryId}...`);

    try {
      const { ethers } = await import("ethers");
      const contract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersSigner
      );

      // 🔥 FHEVM同态运算：匿名点赞
      const tx = await contract.likeEntry(entryId);
      setMessage(`点赞交易已发送: ${tx.hash}`);

      const receipt = await tx.wait();
      setMessage(`✅ 匿名点赞成功！使用FHEVM同态加法更新了点赞数`);

      console.log("🎯 FHEVM匿名点赞完成:", receipt);

    } catch (error: any) {
      console.error("点赞失败:", error);
      setMessage(`❌ 点赞失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 心情比较功能
  const compareMood = async () => {
    if (!fhevmInstance || !ethersSigner || !confDiary.contractAddress || !compareAddress) {
      setMessage("请输入要比较的用户地址");
      return;
    }

    setIsLoading(true);
    setMessage("正在进行FHEVM同态心情比较...");

    try {
      const { ethers } = await import("ethers");
      const contract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersSigner
      );

      // 🔥 FHEVM同态比较：比较心情
      const result = await contract.amIHappierThan(compareAddress);
      console.log("🎯 FHEVM心情比较结果（加密）:", result);

      // 这里我们得到的是加密的布尔值，需要解密才能看到结果
      setMessage(`✅ 心情比较完成！结果已加密存储（句柄: ${result}）`);

      // 可以选择解密结果
      const shouldDecrypt = confirm("是否解密比较结果？（需要签名和Gas费用）");
      if (shouldDecrypt) {
        // 解密比较结果的逻辑...
        setMessage("解密比较结果功能待实现...");
      }

    } catch (error: any) {
      console.error("心情比较失败:", error);
      setMessage(`❌ 心情比较失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 解密点赞数
  const decryptLikes = async (entryId: string) => {
    if (!fhevmInstance || !ethersSigner || !confDiary.contractAddress) return;

    setIsLoading(true);
    setMessage(`正在解密条目 #${entryId} 的点赞数...`);

    try {
      const { ethers } = await import("ethers");
      const contract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersReadonlyProvider
      );

      // 获取加密的点赞数
      const encryptedLikes = await contract.getEntryLikes(entryId);
      console.log("获取到加密点赞数:", encryptedLikes);

      // 创建解密签名
      const { FhevmDecryptionSignature } = await import("@/fhevm/FhevmDecryptionSignature");
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [confDiary.contractAddress],
        ethersSigner,
        confDiary.storage // 假设有存储
      );

      if (!sig) {
        setMessage("❌ 解密签名创建失败");
        return;
      }

      // 🔥 FHEVM解密点赞数
      const res = await fhevmInstance.userDecrypt(
        [{ handle: encryptedLikes, contractAddress: confDiary.contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const likesCount = res[encryptedLikes];
      setMessage(`✅ 条目 #${entryId} 的点赞数: ${likesCount}`);

    } catch (error: any) {
      console.error("解密点赞数失败:", error);
      setMessage(`❌ 解密失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🎯 FHEVM 同态运算功能</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* 匿名点赞测试 */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-800 mb-3">👍 匿名点赞系统</h4>
          <p className="text-sm text-gray-600 mb-3">
            使用FHEVM同态加法统计点赞，防止重复点赞，保护点赞者隐私
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => likeEntry("1")} 
              size="sm" 
              disabled={isLoading}
            >
              👍 点赞条目#1
            </Button>
            <Button 
              onClick={() => decryptLikes("1")} 
              size="sm" 
              variant="outline"
              disabled={isLoading}
            >
              🔓 解密点赞数
            </Button>
          </div>
        </div>

        {/* 心情比较测试 */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-800 mb-3">😊 隐私心情比较</h4>
          <p className="text-sm text-gray-600 mb-3">
            使用FHEVM同态运算比较两个用户的平均心情，不暴露具体数值
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入要比较的用户地址"
              value={compareAddress}
              onChange={(e) => setCompareAddress(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              disabled={isLoading}
            />
            <Button 
              onClick={compareMood} 
              size="sm"
              disabled={isLoading || !compareAddress}
            >
              🔥 比较心情
            </Button>
          </div>
        </div>

        {/* 当前用户信息 */}
        <div>
          <h4 className="font-medium text-gray-800 mb-2">📊 当前用户</h4>
          <div className="text-sm text-gray-600 font-mono">
            {currentUserAddress}
          </div>
        </div>

        {/* 状态消息 */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        {/* 功能说明 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-800 mb-2">🔥 FHEVM同态运算特性</h4>
          <div className="text-sm text-purple-700 space-y-1">
            <div>✅ <strong>同态加法</strong>: 点赞数统计（不暴露个人点赞）</div>
            <div>✅ <strong>同态乘法</strong>: 心情加权比较</div>
            <div>✅ <strong>同态比较</strong>: 心情排行榜（不暴露具体分数）</div>
            <div>✅ <strong>条件选择</strong>: 防重复点赞逻辑</div>
            <div>✅ <strong>隐私保护</strong>: 所有运算结果都是加密的</div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};




"use client";

import { useState } from "react";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useConfDiary } from "@/hooks/useConfDiary";
import { useDecryptedEntries } from "@/hooks/useDecryptedEntries";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { WriteEntry } from "@/components/WriteEntry";
import { DiaryList } from "@/components/DiaryList";
import { DebugPanel } from "@/components/DebugPanel";
import { DiaryTest } from "@/components/DiaryTest";
import { AccountDebug } from "@/components/AccountDebug";
import { StorageDebug } from "@/components/StorageDebug";
import { FHEVMFeatures } from "@/components/FHEVMFeatures";

type PageView = "home" | "write" | "myDiary" | "publicTimeline";

export default function HomePage() {
  const [currentView, setCurrentView] = useState<PageView>("home");
  
  // 解密状态管理
  const { addDecryptedEntry, getDecryptedEntry, isDecrypted } = useDecryptedEntries();
  const [decryptingEntries, setDecryptingEntries] = useState<Set<string>>(new Set());
  
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  // Initialize FHEVM instance
  const { 
    instance: fhevmInstance, 
    status: fhevmStatus, 
    error: fhevmError 
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  // Initialize ConfDiary business logic
  const confDiary = useConfDiary({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  // 处理写日记完成
  const handleEntrySubmit = async (content: string, mood: number) => {
    await confDiary.createDiaryEntry(content, mood);
    setCurrentView("home"); // 创建成功后返回首页
  };

  // 处理解密
  const handleDecrypt = async (entryId: string) => {
    if (!fhevmInstance || !ethersSigner || !confDiary.contractAddress) {
      alert("❌ 解密条件不满足：请确保钱包已连接且FHEVM实例已就绪");
      return;
    }

    // 防止重复解密
    if (decryptingEntries.has(entryId)) {
      alert("⏳ 该条目正在解密中，请稍候...");
      return;
    }

    if (isDecrypted(entryId)) {
      alert("✅ 该条目已经解密过了！");
      return;
    }

    // 确认解密操作
    const confirmDecrypt = confirm(
      `🔐 确定要解密条目 #${entryId} 吗？\n\n` +
      `这将会：\n` +
      `1. 链上请求解密权限（消耗Gas，需要MetaMask签名）\n` +
      `2. 生成FHEVM解密签名\n` +
      `3. 使用FHEVM解密加密内容（保持隐私）\n` +
      `4. 显示解密后的日记内容\n\n` +
      `注意：第一步会消耗Gas费用，但解密过程保持隐私。`
    );

    if (!confirmDecrypt) {
      console.log("用户取消了解密操作");
      return;
    }

    // 添加到解密中的集合
    setDecryptingEntries(prev => new Set([...prev, entryId]));

    console.log("🔓 开始解密条目:", entryId);

    try {
      // 步骤1: 链上请求解密权限（消耗Gas）
      console.log("💰 步骤1: 链上请求解密权限（消耗Gas）...");
      const { ethers } = await import("ethers");
      const writeContract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersSigner  // 使用签名者进行写操作
      );

      alert("💰 即将发起链上解密请求交易，这会消耗Gas费用");

      // 调用链上解密请求函数
      const requestTx = await writeContract.requestDecryption(entryId);
      console.log("📤 解密请求交易已发送:", requestTx.hash);
      
      alert(`📤 解密请求已发送！\n交易哈希: ${requestTx.hash}\n等待区块确认...`);

      // 等待交易确认
      const receipt = await requestTx.wait();
      console.log("✅ 解密请求交易已确认:", receipt);
      
      alert("✅ 链上解密请求已确认！现在开始FHEVM解密...");

      // 步骤2: 获取加密的日记条目
      console.log("📖 步骤2: 从合约获取加密条目...");
      const readContract = new ethers.Contract(
        confDiary.contractAddress,
        confDiary.abi,
        ethersReadonlyProvider
      );

      const entry = await readContract.getDiaryEntry(entryId);
      console.log("✅ 获取到加密条目:", entry);

      // 步骤3: 创建FHEVM解密签名
      console.log("🔑 步骤3: 创建FHEVM解密签名...");
      const { FhevmDecryptionSignature } = await import("@/fhevm/FhevmDecryptionSignature");
      
      alert("🔑 现在需要生成FHEVM解密签名（EIP-712签名）");
      
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [confDiary.contractAddress],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        alert("❌ FHEVM解密签名创建失败");
        return;
      }

      console.log("✅ FHEVM解密签名就绪");
      alert("✅ FHEVM签名成功！开始执行同态解密...");

      // 步骤4: FHEVM解密（保持隐私）
      console.log("🔐 步骤4: 使用MockFhevmInstance进行同态解密...");
      const res = await fhevmInstance.userDecrypt(
        [
          { handle: entry.encryptedContentHash, contractAddress: confDiary.contractAddress },
          { handle: entry.encryptedAuthorHash, contractAddress: confDiary.contractAddress },
          { handle: entry.encryptedMood, contractAddress: confDiary.contractAddress } // 🎯 解密心情值
        ],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      console.log("✅ FHEVM同态解密完成:", res);

      const contentHash = res[entry.encryptedContentHash];
      const authorHash = res[entry.encryptedAuthorHash];
      const moodValue = res[entry.encryptedMood]; // 🎯 解密的心情值

      console.log("📄 解密的内容哈希:", contentHash);
      console.log("👤 解密的作者哈希:", authorHash);
      console.log("😊 解密的心情值:", moodValue); // 🎯 心情值日志

      // 步骤5: 获取原始内容
      console.log("📂 步骤5: 获取原始内容...");
      const localContent = localStorage.getItem(`diary_content_${entryId}`);
      
      // 步骤6: 保存解密结果
      addDecryptedEntry(entryId, {
        contentHash: contentHash.toString(),
        authorHash: authorHash.toString(),
        moodValue: moodValue.toString(), // 🎯 保存心情值
        localContent: localContent || undefined
      });

      console.log("💾 解密结果已保存到状态!");
      
      // 步骤6: 显示成功消息
      alert(
        `🎉 解密成功！\n\n` +
        `条目 #${entryId} 已解密\n` +
        `内容: ${localContent ? localContent.substring(0, 50) + (localContent.length > 50 ? '...' : '') : '哈希: ' + contentHash.toString().substring(0, 20) + '...'}\n\n` +
        `解密后的内容现在会显示在界面上。`
      );
      
      // 强制刷新UI
      setTimeout(() => {
        confDiary.loadUserEntries();
      }, 100);

    } catch (error: any) {
      console.error("❌ 解密失败:", error);
      alert(`❌ 解密失败: ${error.message}`);
    } finally {
      // 从解密中的集合移除
      setDecryptingEntries(prev => {
        const newSet = new Set(prev);
        newSet.delete(entryId);
        return newSet;
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ConfDiary
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Anonymous encrypted diary powered by FHEVM
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={connect} 
              size="lg"
              className="w-full"
            >
              Connect Wallet
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Connect your MetaMask wallet to get started
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confDiary.isDeployed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Contract Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              ConfDiary contract is not deployed on chain {chainId}
            </p>
            <p className="text-sm text-gray-500">
              Please make sure you're connected to the correct network and the contract is deployed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button 
                onClick={() => setCurrentView("home")}
                className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                ConfDiary
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {accounts?.[0]?.slice(0, 6)}...{accounts?.[0]?.slice(-4)}
              </span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug current view - 开发时可以取消注释 */}
        {process.env.NODE_ENV === 'development' && false && (
          <div className="mb-4 p-2 bg-yellow-100 text-xs">
            当前视图: {currentView} | 当前账户: {accounts?.[0]?.slice(0, 10)}... | 用户条目: {confDiary.userEntries?.length || 0}
          </div>
        )}

        {currentView === "home" && (
          <HomeView 
            fhevmStatus={fhevmStatus}
            fhevmError={fhevmError}
            chainId={chainId}
            confDiary={confDiary}
            fhevmInstance={fhevmInstance}
            ethersSigner={ethersSigner}
            ethersReadonlyProvider={ethersReadonlyProvider}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === "write" && (
          <WriteEntry
            onSubmit={handleEntrySubmit}
            onCancel={() => setCurrentView("home")}
            isCreating={confDiary.isCreating}
          />
        )}

        {currentView === "myDiary" && (
          <div>
            {/* MyDiary 调试信息 - 开发时可以取消注释 */}
            {process.env.NODE_ENV === 'development' && false && (
              <div className="mb-4 p-2 bg-blue-100 text-xs">
                MyDiary 组件已加载 | 用户条目: {JSON.stringify(confDiary.userEntries)} | isLoading: {confDiary.isLoading.toString()}
              </div>
            )}
            <DiaryList
              entries={confDiary.userEntries}
              title="My Diary Entries"
              isLoading={confDiary.isLoading}
              showDecryptButton={true}
              onDecrypt={handleDecrypt}
              onRefresh={confDiary.loadUserEntries}
              getDecryptedEntry={getDecryptedEntry}
              isDecrypted={isDecrypted}
              decryptingEntries={decryptingEntries}
              onBack={() => setCurrentView("home")}
            />
          </div>
        )}

        {currentView === "publicTimeline" && (
          <DiaryList
            entries={confDiary.recentEntries}
            title="Public Timeline"
            isLoading={confDiary.isLoading}
            showDecryptButton={false}
            onBack={() => setCurrentView("home")}
          />
        )}

        {/* 状态消息 */}
        {confDiary.message && (
          <div className="fixed bottom-4 right-4 max-w-sm">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">{confDiary.message}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// 首页视图组件
interface HomeViewProps {
  fhevmStatus: string;
  fhevmError: Error | undefined;
  chainId: number | undefined;
  confDiary: any;
  fhevmInstance: any;
  ethersSigner: any;
  ethersReadonlyProvider: any;
  onNavigate: (view: PageView) => void;
}

const HomeView: React.FC<HomeViewProps> = ({
  fhevmStatus,
  fhevmError,
  chainId,
  confDiary,
  fhevmInstance,
  ethersSigner,
  ethersReadonlyProvider,
  onNavigate
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Status Panel */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Chain ID:</span>
              <span className="font-mono">{chainId || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">FHEVM Status:</span>
              <span className={`font-medium ${
                fhevmStatus === 'ready' ? 'text-green-600' : 
                fhevmStatus === 'error' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {fhevmStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contract:</span>
              <span className="font-medium text-green-600">
                {confDiary.contractAddress ? 'Deployed' : 'Not Found'}
              </span>
            </div>
            {fhevmError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {fhevmError.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to ConfDiary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Your Anonymous Diary</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Write your thoughts privately with end-to-end encryption. 
                Only you can decrypt and read your entries.
              </p>
              
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full max-w-xs"
                  onClick={() => {
                    console.log("Button clicked! Navigating to write page...");
                    onNavigate("write");
                  }}
                  disabled={false}
                >
                  Write New Entry
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full max-w-xs"
                  onClick={() => onNavigate("myDiary")}
                  disabled={fhevmStatus !== 'ready' || !confDiary.contractAddress}
                >
                  View My Diary ({confDiary.userEntries.length})
                </Button>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="w-full max-w-xs"
                  onClick={() => onNavigate("publicTimeline")}
                  disabled={fhevmStatus !== 'ready' || !confDiary.contractAddress}
                >
                  Public Timeline ({confDiary.recentEntries.length})
                </Button>
                
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-4 space-y-1">
                  <div>FHEVM Status: {fhevmStatus}</div>
                  <div>Contract: {confDiary.contractAddress || 'Not found'}</div>
                  <div>Can Create: {confDiary.canCreateEntry ? 'Yes' : 'No'}</div>
                  <div>Instance: {confDiary.instance ? 'Ready' : 'Not ready'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 调试面板 - 开发时可以取消注释 */}
        {process.env.NODE_ENV === 'development' && false && (
          <>
            {/* FHEVM 测试面板 */}
            <DiaryTest
              confDiary={confDiary}
              fhevmInstance={fhevmInstance}
              ethersSigner={ethersSigner}
            />

            {/* 账户调试面板 */}
            <AccountDebug
              confDiary={confDiary}
              ethersSigner={ethersSigner}
              ethersReadonlyProvider={ethersReadonlyProvider}
            />

            {/* 存储调试面板 */}
            <StorageDebug />

            {/* FHEVM 同态运算功能 */}
            <FHEVMFeatures
              confDiary={confDiary}
              fhevmInstance={fhevmInstance}
              ethersSigner={ethersSigner}
              ethersReadonlyProvider={ethersReadonlyProvider}
              currentUserAddress={ethersSigner?.address || ""}
            />
          </>
        )}
      </div>
    </div>
  );
};

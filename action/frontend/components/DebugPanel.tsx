"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";

interface DebugPanelProps {
  fhevmInstance: any;
  fhevmStatus: string;
  confDiary: any;
  ethersSigner: any;
  chainId: number | undefined;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  fhevmInstance,
  fhevmStatus,
  confDiary,
  ethersSigner,
  chainId
}) => {
  const testCreateEntry = async () => {
    console.log("=== Test Create Entry ===");
    console.log("FHEVM Instance:", !!fhevmInstance);
    console.log("Ethers Signer:", !!ethersSigner);
    console.log("Contract Address:", confDiary.contractAddress);
    console.log("Can Create Entry:", confDiary.canCreateEntry);
    
    if (fhevmInstance && ethersSigner && confDiary.contractAddress) {
      try {
        console.log("Attempting to create test entry...");
        await confDiary.createDiaryEntry("Test diary entry from debug panel");
        console.log("✅ Test entry created successfully!");
      } catch (error) {
        console.error("❌ Failed to create test entry:", error);
      }
    } else {
      console.log("❌ Prerequisites not met for creating entry");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Chain ID:</span>
              <span className="font-mono">{chainId}</span>
            </div>
            <div className="flex justify-between">
              <span>FHEVM Status:</span>
              <span className={fhevmStatus === 'ready' ? 'text-green-600' : 'text-red-600'}>
                {fhevmStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span>FHEVM Instance:</span>
              <span className={fhevmInstance ? 'text-green-600' : 'text-red-600'}>
                {fhevmInstance ? 'Ready' : 'Not Ready'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ethers Signer:</span>
              <span className={ethersSigner ? 'text-green-600' : 'text-red-600'}>
                {ethersSigner ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Contract Address:</span>
              <span className="font-mono text-xs">
                {confDiary.contractAddress || 'Not found'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Is Deployed:</span>
              <span className={confDiary.isDeployed ? 'text-green-600' : 'text-red-600'}>
                {confDiary.isDeployed ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Can Create Entry:</span>
              <span className={confDiary.canCreateEntry ? 'text-green-600' : 'text-red-600'}>
                {confDiary.canCreateEntry ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recent Entries:</span>
              <span>{confDiary.recentEntries?.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={testCreateEntry}
            size="sm"
            className="w-full"
            disabled={!fhevmInstance || !ethersSigner || !confDiary.contractAddress}
          >
            🧪 Test Create Entry
          </Button>
        </div>

        {confDiary.message && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">{confDiary.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};




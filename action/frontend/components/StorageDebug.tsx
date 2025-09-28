"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export const StorageDebug: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<any>(null);

  const checkStorage = () => {
    if (typeof window === 'undefined') return;

    const allKeys = Object.keys(localStorage);
    const diaryKeys = allKeys.filter(k => k.startsWith('diary_content_'));
    
    const diaryContents: Record<string, string> = {};
    diaryKeys.forEach(key => {
      const content = localStorage.getItem(key);
      if (content) {
        diaryContents[key] = content;
      }
    });

    setStorageInfo({
      totalKeys: allKeys.length,
      diaryKeys: diaryKeys,
      diaryContents: diaryContents,
      allKeys: allKeys.slice(0, 10) // 只显示前10个key
    });

    console.log("LocalStorage 调试信息:", {
      totalKeys: allKeys.length,
      diaryKeys,
      diaryContents
    });
  };

  const clearDiaryStorage = () => {
    if (typeof window === 'undefined') return;
    
    const diaryKeys = Object.keys(localStorage).filter(k => k.startsWith('diary_content_'));
    diaryKeys.forEach(key => localStorage.removeItem(key));
    
    alert(`已清除 ${diaryKeys.length} 个日记内容缓存`);
    checkStorage();
  };

  const addTestContent = () => {
    if (typeof window === 'undefined') return;
    
    // 添加一些测试内容
    localStorage.setItem('diary_content_1', '# 测试日记 1\n\n这是第一篇测试日记的内容。');
    localStorage.setItem('diary_content_2', '# 测试日记 2\n\n这是第二篇测试日记的内容。');
    localStorage.setItem('diary_content_3', '# su\n\nsu');
    
    alert('已添加测试内容到localStorage');
    checkStorage();
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🗄️ 存储调试面板</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkStorage} size="sm" variant="outline">
            检查存储
          </Button>
          <Button onClick={addTestContent} size="sm" variant="ghost">
            添加测试内容
          </Button>
          <Button onClick={clearDiaryStorage} size="sm" variant="outline">
            清除日记缓存
          </Button>
        </div>

        {storageInfo && (
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <h4 className="font-medium mb-2">存储信息:</h4>
            <div className="space-y-2">
              <div>总Key数量: {storageInfo.totalKeys}</div>
              <div>日记Key数量: {storageInfo.diaryKeys.length}</div>
              
              {storageInfo.diaryKeys.length > 0 && (
                <div>
                  <h5 className="font-medium mt-3 mb-1">日记内容:</h5>
                  {Object.entries(storageInfo.diaryContents).map(([key, content]: [string, any]) => (
                    <div key={key} className="bg-white p-2 rounded border text-xs">
                      <div className="font-mono text-blue-600">{key}:</div>
                      <div className="text-gray-700 mt-1">{content.substring(0, 100)}...</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};




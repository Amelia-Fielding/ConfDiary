"use client";

import { Card, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";

// 心情值辅助函数
const getMoodEmoji = (mood: number): string => {
  const moods = ["", "😢", "😔", "😐", "🙂", "😊", "😄", "😆", "🤗", "🥳", "🚀"];
  return moods[mood] || "😐";
};

const getMoodLabel = (mood: number): string => {
  const labels = ["", "很难过", "难过", "一般", "还好", "开心", "很开心", "兴奋", "非常开心", "狂欢", "超级棒"];
  return labels[mood] || "一般";
};

interface DiaryListProps {
  entries: string[];
  title: string;
  isLoading: boolean;
  showDecryptButton?: boolean;
  onDecrypt?: (entryId: string) => void;
  onBack: () => void;
  onRefresh?: () => void;
  getDecryptedEntry?: (entryId: string) => any;
  isDecrypted?: (entryId: string) => boolean;
  decryptingEntries?: Set<string>;
}

export const DiaryList: React.FC<DiaryListProps> = ({
  entries,
  title,
  isLoading,
  showDecryptButton = false,
  onDecrypt,
  onBack,
  onRefresh,
  getDecryptedEntry,
  isDecrypted,
  decryptingEntries
}) => {
  // console.log("DiaryList render:", { entries, title, isLoading, entriesLength: entries?.length });
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h2>
        <div className="flex gap-2">
          {onRefresh && (
            <Button onClick={onRefresh} variant="ghost" size="sm">
              🔄 重新加载
            </Button>
          )}
          <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
            🔄 刷新页面
          </Button>
          <Button onClick={onBack} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No entries found</h3>
            <p className="text-gray-600">
              {title.includes("My") 
                ? "You haven't written any diary entries yet. Start by creating your first entry!"
                : "No public entries available at the moment."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entryId) => (
            <DiaryEntryCard 
              key={entryId}
              entryId={entryId}
              showDecryptButton={showDecryptButton}
              onDecrypt={onDecrypt}
              getDecryptedEntry={getDecryptedEntry}
              isDecrypted={isDecrypted}
              isDecrypting={decryptingEntries?.has(entryId) || false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DiaryEntryCardProps {
  entryId: string;
  showDecryptButton: boolean;
  onDecrypt?: (entryId: string) => void;
  getDecryptedEntry?: (entryId: string) => any;
  isDecrypted?: (entryId: string) => boolean;
  isDecrypting?: boolean;
}

const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({
  entryId,
  showDecryptButton,
  onDecrypt,
  getDecryptedEntry,
  isDecrypted,
  isDecrypting = false
}) => {
  // 获取解密后的内容
  const decryptedEntry = getDecryptedEntry?.(entryId);
  const isEntryDecrypted = isDecrypted?.(entryId) || false;
  
  // 尝试从本地存储获取内容（仅用于演示）
  const localContent = decryptedEntry?.localContent || 
    (typeof window !== 'undefined' ? localStorage.getItem(`diary_content_${entryId}`) : null);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">
                {isEntryDecrypted ? "🔓" : isDecrypting ? "⏳" : "🔒"}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {isEntryDecrypted && localContent && localContent.startsWith('#') ? (
                    // 如果解密后的内容以#开头，提取标题
                    localContent.split('\n')[0].replace('#', '').trim() || `Entry #${entryId}`
                  ) : localContent && !isEntryDecrypted ? (
                    // 未解密但有本地内容，显示预览标题
                    localContent.startsWith('#') 
                      ? localContent.split('\n')[0].replace('#', '').trim() + " (预览)"
                      : `Entry #${entryId} (预览)`
                  ) : (
                    // 完全加密状态
                    showDecryptButton ? `My Entry #${entryId}` : `Anonymous Entry #${entryId}`
                  )}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>条目ID: {entryId}</span>
                  {isEntryDecrypted && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                      已解密
                    </span>
                  )}
                  {isDecrypting && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                      解密中...
                    </span>
                  )}
                  {!isEntryDecrypted && !isDecrypting && localContent && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                      有预览
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isEntryDecrypted ? (
              // 解密后：显示完整内容
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-green-800 mb-2">✅ 解密内容:</h4>
                
                {localContent ? (
                  // 有本地内容：显示真实日记内容
                  <div className="bg-white rounded-lg p-4 mb-3">
                    <div className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
                      {localContent}
                    </div>
                  </div>
                ) : (
                  // 没有本地内容：显示解密提示
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <p className="text-yellow-800 text-sm">
                      📝 内容已解密，但本地未找到原文。显示解密后的哈希值：
                    </p>
                  </div>
                )}
                
                {/* 解密的心情显示 */}
                {decryptedEntry?.moodValue && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMoodEmoji(parseInt(decryptedEntry.moodValue))}</span>
                      <div>
                        <p className="font-medium text-purple-800">
                          当时心情: {getMoodLabel(parseInt(decryptedEntry.moodValue))} ({decryptedEntry.moodValue}/10)
                        </p>
                        <p className="text-xs text-purple-600">
                          🔐 通过FHEVM同态加密解密
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 解密详情 */}
                {decryptedEntry && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-green-700 hover:text-green-800">
                      🔍 查看FHEVM解密详情
                    </summary>
                    <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-600 space-y-1">
                      <div className="font-mono">内容哈希: {decryptedEntry.contentHash}</div>
                      <div className="font-mono">作者哈希: {decryptedEntry.authorHash}</div>
                      {decryptedEntry.moodValue && (
                        <div className="font-mono">心情值: {decryptedEntry.moodValue}/10 🎯</div>
                      )}
                      <div>解密时间: {new Date(decryptedEntry.decryptedAt).toLocaleString()}</div>
                      <div className="text-green-500">✅ 通过FHEVM同态解密验证</div>
                    </div>
                  </details>
                )}
              </div>
            ) : localContent && !isEntryDecrypted ? (
              // 未解密但有本地内容：显示预览
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-yellow-800 mb-2">📝 内容预览（未验证）:</h4>
                <div className="text-yellow-700 text-sm">
                  {localContent.length > 100 
                    ? localContent.substring(0, 100) + "..." 
                    : localContent
                  }
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  💡 点击解密验证内容完整性
                </p>
              </div>
            ) : (
              // 完全加密状态：显示占位符
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <p className="text-gray-600 font-medium">加密的日记条目</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {showDecryptButton ? "点击解密查看完整内容" : "内容已加密保护"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Created: {new Date().toLocaleDateString()} {/* 这里应该从合约获取实际时间戳 */}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {showDecryptButton && onDecrypt && (
              <Button
                onClick={() => onDecrypt(entryId)}
                size="sm"
                variant={isEntryDecrypted ? "ghost" : "outline"}
                disabled={isDecrypting}
                isLoading={isDecrypting}
              >
                {isDecrypting ? "解密中..." : isEntryDecrypted ? "已解密" : "🔓 解密"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

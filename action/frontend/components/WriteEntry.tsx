"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Textarea } from "./ui/Input";
import { MoodSelector } from "./MoodSelector";

interface WriteEntryProps {
  onSubmit: (content: string, mood: number) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export const WriteEntry: React.FC<WriteEntryProps> = ({
  onSubmit,
  onCancel,
  isCreating
}) => {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState(5); // 默认心情5分

  const handleSubmit = () => {
    const fullContent = title ? `# ${title}\n\n${content}` : content;
    if (fullContent.trim() && mood > 0) {
      onSubmit(fullContent.trim(), mood);
      setContent("");
      setTitle("");
      setMood(5);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Write New Diary Entry
          </CardTitle>
          <p className="text-gray-600">
            Your thoughts will be encrypted and stored securely on-chain
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 标题输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your entry a title..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              disabled={isCreating}
            />
          </div>

          {/* 内容输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts here... You can use Markdown formatting."
              className="min-h-[300px] text-base leading-relaxed resize-none"
              disabled={isCreating}
            />
            <p className="text-sm text-gray-500 mt-2">
              Supports Markdown formatting. Your content will be encrypted before storing.
            </p>
          </div>

          {/* 心情选择器 */}
          <div>
            <MoodSelector
              value={mood}
              onChange={setMood}
              disabled={isCreating}
            />
          </div>

          {/* 字数统计 */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              Characters: {(title + content).length}
            </span>
            <span>
              Words: {(title + " " + content).trim().split(/\s+/).filter(w => w.length > 0).length}
            </span>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isCreating}
              isLoading={isCreating}
              className="flex-1"
              size="lg"
            >
              {isCreating ? "Encrypting & Saving..." : "Save Entry"}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isCreating}
              size="lg"
            >
              Cancel
            </Button>
          </div>

          {/* 隐私提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-600 text-xl">🔒</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  🎯 FHEVM 加密 & 同态运算
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  你的日记内容和心情值都会使用FHEVM技术加密存储。
                  同时，合约会使用<strong>同态加法</strong>更新你的心情统计，
                  在不暴露个人心情的情况下计算总分和平均值。
                </p>
                <div className="mt-2 text-xs text-blue-600 space-y-1">
                  <div>🔐 内容哈希: FHEVM加密</div>
                  <div>😊 心情值: FHEVM加密 + 同态加法统计</div>
                  <div>👤 作者身份: FHEVM加密</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

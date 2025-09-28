"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

interface MoodSelectorProps {
  value: number;
  onChange: (mood: number) => void;
  disabled?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const moods = [
    { value: 1, emoji: "😢", label: "很难过", color: "text-red-500" },
    { value: 2, emoji: "😔", label: "难过", color: "text-red-400" },
    { value: 3, emoji: "😐", label: "一般", color: "text-gray-500" },
    { value: 4, emoji: "🙂", label: "还好", color: "text-gray-400" },
    { value: 5, emoji: "😊", label: "开心", color: "text-yellow-500" },
    { value: 6, emoji: "😄", label: "很开心", color: "text-yellow-400" },
    { value: 7, emoji: "😆", label: "兴奋", color: "text-green-500" },
    { value: 8, emoji: "🤗", label: "非常开心", color: "text-green-400" },
    { value: 9, emoji: "🥳", label: "狂欢", color: "text-blue-500" },
    { value: 10, emoji: "🚀", label: "超级棒", color: "text-purple-500" },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        今天的心情如何？(1-10分)
      </label>
      
      <div className="grid grid-cols-5 gap-2">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105
              ${value === mood.value 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">{mood.emoji}</div>
              <div className="text-xs text-gray-600">{mood.value}</div>
              <div className={`text-xs font-medium ${mood.color}`}>
                {mood.label}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {value > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{moods[value - 1].emoji}</span>
            <div>
              <p className="font-medium text-blue-800">
                已选择: {moods[value - 1].label} ({value}/10)
              </p>
              <p className="text-sm text-blue-600">
                心情值将被FHEVM加密后存储在链上
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




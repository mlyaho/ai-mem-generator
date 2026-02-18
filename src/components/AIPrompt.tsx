"use client";

import { useState } from "react";

interface AIPromptProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  "😂 Придумай что-то смешное про дедлайны",
  "🐱 Коты и работа в офисе",
  "💀 Когда код работает, но ты не знаешь почему",
  "🎯 Понедельник vs Пятница",
];

export default function AIPrompt({ onGenerate, isLoading }: AIPromptProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) onGenerate(prompt);
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опиши мем своей мечты..."
          disabled={isLoading}
          className="w-full px-6 py-4 pr-32 text-lg rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 
                     bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                     focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 
                     px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 
                     text-white font-semibold rounded-xl
                     hover:from-purple-700 hover:to-pink-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-300"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Ждём...
            </span>
          ) : (
            "✨ AI"
          )}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onGenerate(suggestion.replace(/^.\s/, ""))}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 
                       text-zinc-700 dark:text-zinc-300
                       hover:bg-purple-100 dark:hover:bg-purple-900/30 
                       hover:text-purple-700 dark:hover:text-purple-300
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

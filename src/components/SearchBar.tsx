import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Memo { id: string; content: string; description: string | null; tags: string[]; category: string; created_at: string; }

export default function SearchBar({ theme }: { theme: "dark" | "light" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Memo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (query.trim()) doSearch(); else { setResults([]); setSearched(false); } }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const doSearch = async () => {
    setSearching(true);
    try { setResults(await invoke<Memo[]>("search_memos", { query: query.trim() })); setSearched(true); }
    catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const inputStyle = {
    background: isDark ? "rgba(15, 18, 25, 0.6)" : "rgba(255, 255, 255, 0.7)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
    color: isDark ? "#e5e7eb" : "#1f2937",
  };
  const cardStyle = { background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}` };

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full animate-fade-in">
      <div className="relative">
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索记忆... (关键词、标签、分类)"
          className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all" style={inputStyle} />
        <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searching && <span className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 rounded-full animate-spin ${isDark ? "border-white/20 border-t-blue-400" : "border-gray-300 border-t-blue-500"}`} />}
      </div>

      {searched && <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>找到 {results.length} 条结果</p>}

      {results.map((memo) => (
        <div key={memo.id} className="rounded-lg p-3 transition-colors" style={cardStyle}>
          <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{memo.content}</div>
          {memo.description && <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{memo.description}</div>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)", color: isDark ? "#93c5fd" : "#2563eb" }}>{memo.category}</span>
            {memo.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#9ca3af" : "#6b7280" }}>#{tag}</span>
            ))}
            <span className={`text-xs ml-auto ${isDark ? "text-gray-600" : "text-gray-300"}`}>{new Date(memo.created_at).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>
      ))}

      {searched && results.length === 0 && <p className={`text-center text-sm mt-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>没找到相关内容</p>}
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Memo { id: string; content: string; description: string | null; tags: string[]; category: string; created_at: string; source_path: string; image_data: string | null; }

export default function MemoList({ theme }: { theme: "dark" | "light" }) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isDark = theme === "dark";

  useEffect(() => { invoke<Memo[]>("list_memos").then(setMemos).catch(console.error).finally(() => setLoading(false)); }, []);

  const handleCopy = async (memo: Memo) => {
    try {
      if (memo.image_data) {
        // Copy image to clipboard
        const binary = atob(memo.image_data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/png" });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } else {
        await navigator.clipboard.writeText(memo.content);
      }
      setCopiedId(memo.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      // Fallback: try writeText
      try { await navigator.clipboard.writeText(memo.content); setCopiedId(memo.id); setTimeout(() => setCopiedId(null), 1500); } catch { console.error(e); }
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await invoke("delete_memo", { id });
      setMemos(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  const getDisplayContent = (memo: Memo) => {
    if (memo.image_data && memo.content === "[图片]") return null;
    if (memo.image_data && memo.content.startsWith("[图片]")) return memo.content.replace("[图片]", "").trim() || null;
    return memo.content;
  };

  if (loading) return <div className="flex items-center justify-center h-full"><span className={`w-5 h-5 border-2 rounded-full animate-spin ${isDark ? "border-white/20 border-t-blue-400" : "border-gray-300 border-t-blue-500"}`} /></div>;

  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full animate-fade-in">
      {memos.length === 0 ? (
        <p className={`text-center text-sm mt-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>还没有记录，去丢点东西吧</p>
      ) : memos.map((memo) => {
        const displayContent = getDisplayContent(memo);
        return (
          <div key={memo.id} className="rounded-lg p-3 transition-colors group relative"
            style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}` }}>
            {memo.image_data && (
              <div className="mb-2 rounded-md overflow-hidden">
                <img src={`data:image/png;base64,${memo.image_data}`} alt="" className="w-full h-auto rounded-md" style={{ maxHeight: "200px", objectFit: "cover" }} />
              </div>
            )}
            {displayContent && (
              <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"} line-clamp-3 whitespace-pre-wrap break-all`}>{displayContent}</div>
            )}
            {memo.description && <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{memo.description}</div>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)", color: isDark ? "#93c5fd" : "#2563eb" }}>{memo.category}</span>
              {memo.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#9ca3af" : "#6b7280" }}>#{tag}</span>
              ))}
              <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-300"}`}>{new Date(memo.created_at).toLocaleDateString("zh-CN")}</span>
              <button onClick={() => handleCopy(memo)}
                className={`text-xs px-2 py-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${
                  copiedId === memo.id ? "bg-green-500/20 text-green-400"
                    : isDark ? "bg-white/[0.06] text-gray-400 hover:text-gray-200 hover:bg-white/[0.1]" : "bg-black/[0.04] text-gray-500 hover:text-gray-700 hover:bg-black/[0.08]"
                }`} title={memo.image_data ? "复制图片" : "复制内容"}>
                {copiedId === memo.id ? "✓ 已复制" : memo.image_data ? "🖼️ 复制" : "📋 复制"}
              </button>
              <button onClick={() => handleDelete(memo.id)}
                className={`text-xs px-2 py-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${
                  deletingId === memo.id ? "bg-red-500/20 text-red-400"
                    : isDark ? "bg-white/[0.06] text-gray-400 hover:text-red-400 hover:bg-red-500/10" : "bg-black/[0.04] text-gray-500 hover:text-red-500 hover:bg-red-500/10"
                }`} title="删除">
                {deletingId === memo.id ? "..." : "🗑️"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

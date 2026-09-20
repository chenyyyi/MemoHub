import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Todo { id: string; content: string; due_date: string | null; completed: boolean; created_at: string; memo_id: string | null; }

export default function TodoList({ theme }: { theme: "dark" | "light" }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = theme === "dark";

  useEffect(() => { invoke<Todo[]>("list_todos").then(setTodos).catch(console.error).finally(() => setLoading(false)); }, []);

  const toggleComplete = async (id: string) => {
    try { await invoke("toggle_todo", { id }); setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)); } catch (e) { console.error(e); }
  };

  const active = todos.filter(t => !t.completed);
  const done = todos.filter(t => t.completed);
  const cardStyle = { background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}` };

  if (loading) return <div className="flex items-center justify-center h-full"><span className={`w-5 h-5 border-2 rounded-full animate-spin ${isDark ? "border-white/20 border-t-blue-400" : "border-gray-300 border-t-blue-500"}`} /></div>;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full animate-fade-in">
      {active.length === 0 && done.length === 0 ? (
        <p className={`text-center text-sm mt-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>没有待办事项</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              <h3 className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-400"}`}>待完成 ({active.length})</h3>
              {active.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 rounded-lg p-3 transition-colors" style={cardStyle}>
                  <button onClick={() => toggleComplete(todo.id)} className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${isDark ? "border-white/20 hover:border-blue-400" : "border-gray-300 hover:border-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{todo.content}</div>
                    {todo.due_date && <div className={`text-xs mt-0.5 ${isDark ? "text-amber-400/70" : "text-amber-600"}`}>⏰ {new Date(todo.due_date).toLocaleString("zh-CN")}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <h3 className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-gray-600" : "text-gray-300"}`}>已完成 ({done.length})</h3>
              {done.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 rounded-lg p-3 opacity-50" style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", border: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"}` }}>
                  <button onClick={() => toggleComplete(todo.id)} className="w-4 h-4 rounded bg-blue-600 border border-blue-600 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <div className={`text-sm line-through ${isDark ? "text-gray-500" : "text-gray-400"}`}>{todo.content}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

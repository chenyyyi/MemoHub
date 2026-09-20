import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { enable as enableAutostart } from "@tauri-apps/plugin-autostart";
import MemoList from "./components/MemoList";
import TodoList from "./components/TodoList";
import SearchBar from "./components/SearchBar";
import SettingsPage from "./components/SettingsPage";
import Onboarding from "./components/Onboarding";

type View = "input" | "list" | "todo" | "search" | "settings";

function App() {
  const [view, setView] = useState<View>("input");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [opacity, setOpacity] = useState(0.92);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const draggingRef = useRef(false);
  const notifiedRef = useRef(new Set<string>());

  const refreshApiKey = useCallback(async () => {
    try { const s = await invoke<any>("get_settings"); setHasApiKey(!!s.api_key); }
    catch { setHasApiKey(false); }
  }, []);

  useEffect(() => {
    enableAutostart().catch(console.error);

    register("CommandOrControl+Shift+M", async (e) => {
      if (e.state === "Pressed") {
        const win = getCurrentWindow();
        await win.show();
        await win.setFocus();
        setView("input");
        setTimeout(() => contentRef.current?.focus(), 100);
      }
    }).catch(console.error);

    invoke<any>("get_settings").then((s) => {
      if (s.theme) setTheme(s.theme);
      if (s.opacity) setOpacity(s.opacity);
      setHasApiKey(!!s.api_key);
      if (!s.onboarding_done) setShowOnboarding(true);
      if (s.obsidian_vault) invoke("init_obsidian_dirs", { vaultPath: s.obsidian_vault }).catch(console.error);
    }).catch(() => setShowOnboarding(true));

    const interval = setInterval(async () => {
      try {
        const todos = await invoke<any[]>("list_todos");
        const now = Date.now();
        for (const todo of todos) {
          if (!todo.completed && todo.due_date) {
            const due = new Date(todo.due_date).getTime();
            // Within next 60s, not past due, and not already notified
            if (due > now && due - now < 60000 && !notifiedRef.current.has(todo.id)) {
              notifiedRef.current.add(todo.id);
              sendNotification({ title: "MemoHub 待办提醒", body: todo.content });
            }
          }
        }
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Blur to hide — skip during drag (detect via window move)
  useEffect(() => {
    if (pinned) return;
    const win = getCurrentWindow();
    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    let posSaveTimer: ReturnType<typeof setTimeout> | null = null;

    // Listen for window move events (dragging causes these, NOT resize)
    let justStoppedDragging = false;
    const unlistenMove = win.onMoved(() => {
      if (moveTimer) clearTimeout(moveTimer);
      draggingRef.current = true;
      moveTimer = setTimeout(() => {
        draggingRef.current = false;
        justStoppedDragging = true;
        setTimeout(() => { justStoppedDragging = false; }, 500);
      }, 300);

      // Debounce save position (500ms after last move)
      if (posSaveTimer) clearTimeout(posSaveTimer);
      posSaveTimer = setTimeout(async () => {
        try {
          const pos = await win.outerPosition();
          const size = await win.outerSize();
          const scale = await win.scaleFactor();
          const lx = pos.toLogical(scale).x;
          const ly = pos.toLogical(scale).y;
          const lw = size.toLogical(scale).width;
          const lh = size.toLogical(scale).height;
          invoke("save_window_position", { x: lx, y: ly, width: lw, height: lh });
        } catch {}
      }, 500);
    });

    const unlistenFocus = win.onFocusChanged(({ payload }) => {
      // Show = payload=true; Hide window when payload=false (lost focus)
      if (!payload && !draggingRef.current && !justStoppedDragging && !pinnedRef.current) {
        setTimeout(() => {
          if (!draggingRef.current && !justStoppedDragging && !pinnedRef.current) win.hide();
        }, 300);
      }
    });

    return () => {
      unlistenMove.then(fn => fn());
      unlistenFocus.then(fn => fn());
      if (moveTimer) clearTimeout(moveTimer);
      if (posSaveTimer) clearTimeout(posSaveTimer);
    };
  }, []);

  const pinnedRef = useRef(false);
  useEffect(() => { pinnedRef.current = pinned; getCurrentWindow().setAlwaysOnTop(pinned).catch(console.error); }, [pinned]);

  const togglePin = useCallback(() => setPinned(p => !p), []);
  const toggleTheme = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => { setPastedImage(reader.result as string); setContent(reader.result as string); };
        reader.readAsDataURL(blob);
        return;
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && !pastedImage) return;
    setProcessing(true); setResult(null);
    try {
      const payload = pastedImage || content.trim();
      const res = await invoke<{ tags: string[]; category: string; path: string; source: string }>(
        "process_memo", { content: payload, description: description.trim() || null }
      );
      const hint = res.source === "fallback" ? " (基础分类)" : "";
      const msg = `已归档到 ${res.category}${hint}\n标签: ${res.tags.join(", ")}`;
      setResult(msg);
      sendNotification({ title: "MemoHub", body: msg });
      setContent(""); setDescription(""); setPastedImage(null);
      refreshApiKey();
    } catch (err) {
      setResult(`处理失败: ${err}`);
      sendNotification({ title: "MemoHub", body: `处理失败: ${err}` });
    } finally { setProcessing(false); }
  }, [content, description, pastedImage, refreshApiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape" && !pinned) getCurrentWindow().hide();
  };

  const handleOnboardingComplete = useCallback(async (cfg: any) => {
    try {
      await invoke("save_settings", { config: { ...cfg, onboarding_done: true, theme, opacity } });
      setShowOnboarding(false); setHasApiKey(!!cfg.api_key);
      if (cfg.obsidian_vault) invoke("init_obsidian_dirs", { vaultPath: cfg.obsidian_vault }).catch(console.error);
    } catch (e) { console.error(e); }
  }, [theme, opacity]);

  const handleSettingsSaved = useCallback(async () => {
    refreshApiKey();
    try {
      const s = await invoke<any>("get_settings");
      if (s.obsidian_vault) invoke("init_obsidian_dirs", { vaultPath: s.obsidian_vault }).catch(console.error);
    } catch {}
  }, [refreshApiKey]);

  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} theme={theme} />;

  const isDark = theme === "dark";
  const muted = isDark ? "text-gray-500" : "text-gray-400";
  const btnBg = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]";
  const activeBg = isDark ? "bg-white/[0.1] text-white" : "bg-black/[0.08] text-gray-900";
  // Apply opacity to background alpha
  const bgAlpha = opacity;
  const bg = isDark ? `rgba(10, 12, 18, ${bgAlpha})` : `rgba(255, 255, 255, ${bgAlpha})`;

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: bg, backdropFilter: "blur(24px) saturate(1.2)", WebkitBackdropFilter: "blur(24px) saturate(1.2)", color: isDark ? "#f3f4f6" : "#1f2937" }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 sm:px-4 py-2 shrink-0 select-none"
        style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`, appRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ appRegion: "no-drag" } as React.CSSProperties}>
          <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">MemoHub</span>
          <button onClick={togglePin}
            className={`px-2 py-0.5 text-xs rounded-md transition-all ${pinned ? "bg-blue-600 text-white" : `${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"} ${btnBg}`}`}
            title={pinned ? "取消置顶" : "钉到桌面"}>
            {pinned ? "📌 已置顶" : "📌"}
          </button>
        </div>
        <nav className="flex gap-1" style={{ appRegion: "no-drag" } as React.CSSProperties}>
          {(["input", "list", "todo", "search", "settings"] as View[]).map((v) => (
            <button key={v} onClick={() => { setView(v); if (v === "settings") refreshApiKey(); }}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${view === v ? activeBg : `${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"} ${btnBg}`}`}>
              {{ input: "记录", list: "列表", todo: "待办", search: "搜索", settings: "设置" }[v]}
            </button>
          ))}
        </nav>
      </div>

      {/* API Key hint */}
      {hasApiKey === false && view === "input" && (
        <div className={`mx-4 mt-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between shrink-0 animate-fade-in ${isDark ? "bg-amber-500/10 border border-amber-500/20 text-amber-300/80" : "bg-amber-50/80 border border-amber-200 text-amber-700"}`}>
          <span>未配置 API Key，将使用基础关键词分类。</span>
          <button onClick={() => setView("settings")} className={`ml-2 underline ${isDark ? "text-amber-200" : "text-amber-600"}`}>去设置</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === "input" && (
          <div className="p-4 space-y-3 animate-fade-in min-h-full flex flex-col">
            {pastedImage ? (
              <div className="flex-1 relative">
                <img src={pastedImage} alt="pasted" className="max-h-full max-w-full object-contain rounded-lg mx-auto" />
                <button onClick={() => { setPastedImage(null); setContent(""); }}
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center ${isDark ? "bg-black/50 text-gray-300 hover:text-white" : "bg-white/60 text-gray-600 hover:text-gray-900"}`}>✕</button>
              </div>
            ) : (
              <textarea ref={contentRef} value={content} onChange={(e) => setContent(e.target.value)} onPaste={handlePaste}
                placeholder="丢点什么进来... (文字、链接、或 Ctrl+V 粘贴图片)"
                className="flex-1 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 transition-all"
                style={{ background: isDark ? "rgba(15, 18, 25, 0.6)" : "rgba(255, 255, 255, 0.7)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`, color: isDark ? "#e5e7eb" : "#1f2937" }}
                autoFocus />
            )}
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述 (可选)"
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all"
              style={{ background: isDark ? "rgba(15, 18, 25, 0.6)" : "rgba(255, 255, 255, 0.7)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`, color: isDark ? "#e5e7eb" : "#1f2937" }} />
            <div className="flex items-center justify-between shrink-0">
              <span className={`text-xs ${muted}`}>Ctrl+Enter 发送 · Esc 关闭</span>
              <button onClick={handleSubmit} disabled={processing || (!content.trim() && !pastedImage)}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600/90 hover:bg-blue-500/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white">
                {processing ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />处理中...</span> : "丢进去"}
              </button>
            </div>
            {result && <div className={`text-xs rounded-lg p-2 shrink-0 animate-slide-up ${isDark ? "text-gray-400 bg-white/[0.03]" : "text-gray-500 bg-black/[0.03]"}`}>{result}</div>}
          </div>
        )}
        {view === "list" && <MemoList theme={theme} />}
        {view === "todo" && <TodoList theme={theme} />}
        {view === "search" && <SearchBar theme={theme} />}
        {view === "settings" && <SettingsPage theme={theme} onThemeChange={toggleTheme} opacity={opacity} onOpacityChange={setOpacity} onSaved={handleSettingsSaved} onShowOnboarding={() => setShowOnboarding(true)} />}
      </div>
    </div>
  );
}

export default App;

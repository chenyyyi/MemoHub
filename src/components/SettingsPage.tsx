import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { enable as enableAutostart, disable as disableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";

interface AppConfig {
  api_base: string;
  api_key: string;
  text_model: string;
  vision_model: string;
  obsidian_vault: string;
  theme?: string;
  opacity?: number;
}

interface SettingsProps {
  theme: "dark" | "light";
  onThemeChange: () => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  onSaved?: () => void;
  onShowOnboarding?: () => void;
}

export default function SettingsPage({ theme, onThemeChange, opacity, onOpacityChange, onSaved, onShowOnboarding }: SettingsProps) {
  const [config, setConfig] = useState<AppConfig>({
    api_base: "", api_key: "", text_model: "", vision_model: "", obsidian_vault: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [autostart, setAutostart] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => { invoke<AppConfig>("get_settings").then(setConfig).catch(console.error); }, []);
  useEffect(() => { isAutostartEnabled().then(setAutostart).catch(console.error); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke("save_settings", { config: { ...config, theme, opacity } });
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const update = (key: keyof AppConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setSaved(false); };

  const handleClearMemories = async () => {
    setClearing(true);
    try {
      await invoke("clear_all_memos");
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch (e) { console.error(e); }
    finally { setClearing(false); }
  };

  const handleBrowseObsidian = async () => {
    try {
      const selected = await open({ directory: true, title: "选择 Obsidian 库文件夹" });
      if (selected) { update("obsidian_vault", selected as string); }
    } catch (e) { console.error(e); }
  };

  const handleToggleAutostart = async () => {
    try {
      if (autostart) { await disableAutostart(); setAutostart(false); }
      else { await enableAutostart(); setAutostart(true); }
    } catch (e) { console.error(e); }
  };

  const inputStyle = {
    background: isDark ? "rgba(15, 18, 25, 0.6)" : "rgba(255, 255, 255, 0.7)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
    color: isDark ? "#e5e7eb" : "#1f2937",
  };
  const muted = isDark ? "text-gray-400" : "text-gray-500";
  const hint = isDark ? "text-gray-500" : "text-gray-400";

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full animate-fade-in">
      <h2 className={`text-sm font-medium uppercase tracking-wider ${muted}`}>设置</h2>

      <Section title="外观" isDark={isDark}>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${muted}`}>主题模式</span>
          <button onClick={onThemeChange}
            className={`px-3 py-1 text-xs rounded-md transition-all backdrop-blur ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-black/5 text-gray-700 hover:bg-black/10"}`}>
            {isDark ? "🌙 暗黑" : "☀️ 亮色"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${muted}`}>开机自启</span>
          <button onClick={handleToggleAutostart}
            className={`px-3 py-1 text-xs rounded-md transition-all backdrop-blur ${autostart ? "bg-blue-600 text-white hover:bg-blue-500" : isDark ? "bg-white/10 text-gray-400 hover:bg-white/15" : "bg-black/5 text-gray-500 hover:bg-black/10"}`}>
            {autostart ? "✅ 已开启" : "⬜ 关闭"}
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs ${muted}`}>透明度</span>
            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{Math.round(opacity * 100)}%</span>
          </div>
          <input type="range" min="20" max="100" value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
            style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
          />
        </div>
      </Section>

      <Section title="AI 接口" isDark={isDark}>
        <Field label="API 地址" value={config.api_base} onChange={v => update("api_base", v)} placeholder="https://api.siliconflow.cn/v1" isDark={isDark} inputStyle={inputStyle} />
        <Field label="API Key" value={config.api_key} onChange={v => update("api_key", v)} placeholder="sk-..." type="password" isDark={isDark} inputStyle={inputStyle} />
      </Section>

      <Section title="模型配置" isDark={isDark}>
        <Field label="文字模型" value={config.text_model} onChange={v => update("text_model", v)} placeholder="Qwen/Qwen2.5-7B-Instruct" hint="用于文字内容的分类和标签生成" isDark={isDark} inputStyle={inputStyle} />
        <Field label="视觉模型" value={config.vision_model} onChange={v => update("vision_model", v)} placeholder="Qwen/Qwen2.5-VL-7B-Instruct" hint="用于图片内容识别和OCR" isDark={isDark} inputStyle={inputStyle} />
      </Section>

      <Section title="存储" isDark={isDark}>
        <div>
          <label className={`block text-xs mb-1 ${muted}`}>Obsidian 库路径</label>
          <div className="flex gap-2">
            <input value={config.obsidian_vault} onChange={e => update("obsidian_vault", e.target.value)} placeholder="E:\Obsidian\hermes"
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all" style={inputStyle} />
            <button onClick={handleBrowseObsidian}
              className={`px-3 py-2 text-xs rounded-lg transition-all backdrop-blur ${isDark ? "bg-white/10 text-gray-300 hover:bg-white/15" : "bg-black/5 text-gray-600 hover:bg-black/10"}`}>
              浏览
            </button>
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600/90 hover:bg-blue-500/90 disabled:opacity-40 transition-all text-white backdrop-blur">
          {saving ? "保存中..." : "保存"}
        </button>
        {saved && <span className="text-xs text-green-400 animate-slide-up">✓ 已保存</span>}
      </div>

      <div className={`text-xs pt-2 border-t space-y-1 ${hint}`} style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }}>
        <p>• API Key 本地存储，不会上传到任何服务器。</p>
        <p>• 未配置 API Key 时使用基础关键词匹配分类。</p>
        <p>• 文字模型用于日常文字分类，视觉模型用于图片识别和OCR。</p>
      </div>

      {onShowOnboarding && (
        <button onClick={onShowOnboarding}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${isDark ? "bg-white/[0.06] text-gray-400 hover:text-gray-200 hover:bg-white/[0.1]" : "bg-black/[0.04] text-gray-500 hover:text-gray-700 hover:bg-black/[0.08]"}`}>
          🔄 重新显示引导页
        </button>
      )}

      <button onClick={handleClearMemories} disabled={clearing}
        className={`text-xs px-3 py-1.5 rounded-lg transition-all ${isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"} disabled:opacity-40`}>
        {clearing ? "清空中..." : cleared ? "✓ 已清空" : "🗑️ 清空所有记忆"}
      </button>
    </div>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div className="space-y-3">
      <h3 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint, type = "text", isDark, inputStyle }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string; type?: string; isDark: boolean; inputStyle: React.CSSProperties;
}) {
  const muted = isDark ? "text-gray-400" : "text-gray-500";
  return (
    <div>
      <label className={`block text-xs mb-1 ${muted}`}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all" style={inputStyle} />
      {hint && <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{hint}</p>}
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface AppConfig {
  api_base: string;
  api_key: string;
  text_model: string;
  vision_model: string;
  obsidian_vault: string;
  theme?: string;
  opacity?: number;
}

interface ModelInfo {
  id: string;
  vision: boolean;
}

interface Props {
  onComplete: (config: AppConfig) => void;
  theme: "dark" | "light";
}

export default function Onboarding({ onComplete, theme }: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<AppConfig>({
    api_base: "https://api.siliconflow.cn/v1",
    api_key: "",
    text_model: "Qwen/Qwen2.5-7B-Instruct",
    vision_model: "Qwen/Qwen2.5-VL-7B-Instruct",
    obsidian_vault: "",
  });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [obsidianStatus, setObsidianStatus] = useState<"unknown" | "found" | "not_found">("unknown");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isDark = theme === "dark";
  const cls = {
    bg: isDark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900",
    card: isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm",
    input: isDark
      ? "bg-gray-900/50 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/30",
    muted: isDark ? "text-gray-500" : "text-gray-400",
    hint: isDark ? "text-gray-600" : "text-gray-400",
    btn: isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
  };

  useEffect(() => {
    invoke<any>("get_settings").then((s) => {
      if (s.api_base) setConfig(prev => ({ ...prev, api_base: s.api_base }));
      if (s.api_key) setConfig(prev => ({ ...prev, api_key: s.api_key }));
      if (s.text_model) setConfig(prev => ({ ...prev, text_model: s.text_model }));
      if (s.vision_model) setConfig(prev => ({ ...prev, vision_model: s.vision_model }));
      if (s.obsidian_vault) {
        setConfig(prev => ({ ...prev, obsidian_vault: s.obsidian_vault }));
        invoke<boolean>("check_path_exists", { path: s.obsidian_vault })
          .then(exists => setObsidianStatus(exists ? "found" : "not_found"))
          .catch(() => setObsidianStatus("not_found"));
      } else {
        setObsidianStatus("not_found");
      }
    }).catch(() => {});
  }, []);

  const fetchModels = async () => {
    if (!config.api_base || !config.api_key) return;
    setLoadingModels(true);
    setFetchError(null);
    try {
      const base = config.api_base.replace(/\/+$/, '');
      const resp = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${config.api_key}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const list: ModelInfo[] = (data.data || []).map((m: any) => ({
        id: m.id,
        vision: m.id.toLowerCase().includes("vl") || m.id.toLowerCase().includes("vision") || m.id.toLowerCase().includes("multimodal"),
      }));
      setModels(list);
      if (!config.text_model && list.length > 0) {
        const textM = list.find(m => !m.vision) || list[0];
        setConfig(prev => ({ ...prev, text_model: textM.id }));
      }
      if (!config.vision_model && list.length > 0) {
        const visionM = list.find(m => m.vision);
        if (visionM) setConfig(prev => ({ ...prev, vision_model: visionM.id }));
      }
    } catch (e: any) {
      setFetchError(`获取模型列表失败: ${e.message}。你可以手动输入模型名。`);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleBrowseObsidian = async () => {
    try {
      const selected = await open({ directory: true, title: "选择 Obsidian 库文件夹" });
      if (selected) {
        setConfig(prev => ({ ...prev, obsidian_vault: selected as string }));
        setObsidianStatus("found");
      }
    } catch (e) { console.error(e); }
  };

  const handleSkipObsidian = () => {
    setConfig(prev => ({ ...prev, obsidian_vault: "" }));
    setObsidianStatus("not_found");
  };

  const handleComplete = () => {
    onComplete(config);
  };

  const steps = [
    /* 0: Welcome */
    <div key="welcome" className="space-y-4 text-center animate-fade-in">
      <div className="text-4xl mb-2">📝</div>
      <h2 className="text-xl font-semibold">欢迎使用 MemoHub</h2>
      <p className={`text-sm ${cls.muted} max-w-md mx-auto`}>
        你的智能随手记工具。丢点什么进来，AI 帮你整理归档。
      </p>
      <div className={`text-xs ${cls.hint} space-y-1`}>
        <p>💡 快捷键 <kbd className={`px-1.5 py-0.5 rounded text-xs ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>Ctrl+Shift+M</kbd> 随时呼出</p>
        <p>📌 点标题栏左侧按钮可钉到桌面</p>
      </div>
      <button onClick={() => setStep(1)} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all">
        开始配置
      </button>
      <button onClick={handleComplete} className={`block mx-auto text-xs ${cls.muted} hover:text-gray-300 mt-2`}>
        跳过，直接使用 →
      </button>
    </div>,

    /* 1: API Config */
    <div key="api" className="space-y-4 animate-fade-in max-w-md mx-auto w-full">
      <h2 className="text-lg font-semibold">配置 AI 接口</h2>
      <p className={`text-xs ${cls.muted}`}>配置后可获得 AI 智能分类。不配置也能用，但只有基础关键词匹配。</p>

      <div>
        <label className={`block text-xs ${cls.muted} mb-1`}>API 地址</label>
        <input value={config.api_base} onChange={e => setConfig(p => ({ ...p, api_base: e.target.value }))} onBlur={fetchModels}
          placeholder="https://api.siliconflow.cn/v1"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all ${cls.input}`} />
      </div>

      <div>
        <label className={`block text-xs ${cls.muted} mb-1`}>API Key</label>
        <input type="password" value={config.api_key} onChange={e => setConfig(p => ({ ...p, api_key: e.target.value }))} onBlur={fetchModels}
          placeholder="sk-..."
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all ${cls.input}`} />
      </div>

      {loadingModels && <p className={`text-xs ${cls.muted}`}>正在获取模型列表...</p>}
      {fetchError && <p className="text-xs text-amber-400">{fetchError}</p>}

      {models.length > 0 ? (
        <>
          <div>
            <label className={`block text-xs ${cls.muted} mb-1`}>文字模型</label>
            <select value={config.text_model} onChange={e => setConfig(p => ({ ...p, text_model: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${cls.input}`}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}{m.vision ? " ✓ 多模态" : ""}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs ${cls.muted} mb-1`}>视觉模型 <span className="text-blue-400">（支持图片识别）</span></label>
            <select value={config.vision_model} onChange={e => setConfig(p => ({ ...p, vision_model: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${cls.input}`}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}{m.vision ? " ✓ 多模态" : " (纯文本)"}</option>)}
            </select>
            {!models.find(m => m.id === config.vision_model)?.vision && (
              <p className="text-xs text-amber-400 mt-1">此模型可能不支持图片识别，图片可能无法正确处理。</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={`block text-xs ${cls.muted} mb-1`}>文字模型</label>
            <input value={config.text_model} onChange={e => setConfig(p => ({ ...p, text_model: e.target.value }))}
              placeholder="Qwen/Qwen2.5-7B-Instruct"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all ${cls.input}`} />
          </div>
          <div>
            <label className={`block text-xs ${cls.muted} mb-1`}>视觉模型（支持图片识别）</label>
            <input value={config.vision_model} onChange={e => setConfig(p => ({ ...p, vision_model: e.target.value }))}
              placeholder="Qwen/Qwen2.5-VL-7B-Instruct"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all ${cls.input}`} />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={() => setStep(0)} className={`px-4 py-1.5 text-sm rounded-lg transition-all ${cls.btn}`}>返回</button>
        <button onClick={() => setStep(2)} className="flex-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all">下一步</button>
      </div>
      <button onClick={() => { setConfig(p => ({ ...p, api_key: "" })); setStep(2); }} className={`block mx-auto text-xs ${cls.muted} hover:text-gray-300`}>
        跳过，不配置 AI →
      </button>
    </div>,

    /* 2: Obsidian */
    <div key="obsidian" className="space-y-4 animate-fade-in max-w-md mx-auto w-full">
      <h2 className="text-lg font-semibold">关联 Obsidian</h2>
      <p className={`text-xs ${cls.muted}`}>MemoHub 会把整理好的内容自动写入 Obsidian 库。</p>

      {obsidianStatus === "found" ? (
        <div className={`border rounded-lg p-3 ${cls.card}`}>
          <p className="text-sm">✅ 已检测到 Obsidian 库</p>
          <p className={`text-xs ${cls.muted} mt-1 font-mono break-all`}>{config.obsidian_vault}</p>
          <button onClick={handleBrowseObsidian} className={`text-xs ${cls.muted} hover:text-gray-300 mt-2`}>更换路径</button>
        </div>
      ) : obsidianStatus === "not_found" ? (
        <div className={`border rounded-lg p-3 space-y-3 ${cls.card}`}>
          <p className="text-sm">未关联 Obsidian</p>
          <p className={`text-xs ${cls.muted}`}>数据将存在 MemoHub 本地目录。后续安装 Obsidian 后可在设置中关联并一键迁移。</p>
          <div className="flex gap-2">
            <button onClick={() => window.open("https://obsidian.md/download", "_blank")} className={`px-3 py-1.5 text-xs rounded-lg ${cls.btn}`}>下载 Obsidian</button>
            <button onClick={handleBrowseObsidian} className={`px-3 py-1.5 text-xs rounded-lg ${cls.btn}`}>选择已有库</button>
          </div>
        </div>
      ) : (
        <div className={`border rounded-lg p-3 space-y-3 ${cls.card}`}>
          <p className={`text-sm ${cls.muted}`}>正在检测 Obsidian...</p>
          <div className="flex gap-2">
            <button onClick={handleBrowseObsidian} className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all">选择库文件夹</button>
            <button onClick={handleSkipObsidian} className={`px-3 py-1.5 text-xs rounded-lg ${cls.btn}`}>暂时不用</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={() => setStep(1)} className={`px-4 py-1.5 text-sm rounded-lg transition-all ${cls.btn}`}>返回</button>
        <button onClick={handleComplete} className="flex-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all">开始使用 🚀</button>
      </div>
    </div>,
  ];

  return (
    <div className={`${cls.bg} h-screen overflow-y-auto p-4 sm:p-6`}>
      <div className="w-full max-w-lg mx-auto pt-4 sm:pt-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i <= step ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`} />
          ))}
        </div>
        {steps[step]}
      </div>
    </div>
  );
}

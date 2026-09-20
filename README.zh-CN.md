<div align="center">

<img src="src-tauri/icons/icon.png" alt="MemoHub" width="120" />

# MemoHub

**AI 智能随手记 · 自动整理归档**

*丢点什么进来，AI 帮你整理归档。*

[![Release](https://img.shields.io/github/v/release/chenyyyi/MemoHub?style=flat-square&color=blue)](https://github.com/chenyyyi/MemoHub/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-🦀-dea584?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)

[English](README.md) · [简体中文](README.zh-CN.md)

</div>

---

## ✨ 功能特性

- 🧠 **AI 智能分类** — 支持任意 OpenAI 兼容 API（硅基流动、DeepSeek、OpenAI 等）
- 📝 **快速记录** — `Ctrl+Shift+M` 随时随地呼出
- 📌 **钉到桌面** — 置顶悬浮窗口，支持透明度调节
- 🔍 **全文搜索** — 按内容、标签、分类搜索
- ✅ **智能待办识别** — 从文本中自动提取待办事项和截止时间
- 📸 **图片支持** — Ctrl+V 粘贴截图，视觉模型 OCR 识别
- 🔗 **链接解析** — 自动抓取网页标题
- 📂 **Obsidian 集成** — 自动写入结构化 Markdown 到 Obsidian 知识库
- 🌗 **暗黑/亮色主题** — 适配系统，毛玻璃效果
- 🪟 **任务栏隐藏** — 工具窗体风格，桌面更清爽

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://www.rust-lang.org/tools/install) ≥ 1.77
- [pnpm](https://pnpm.io/)（推荐）或 npm

### 开发运行

```bash
# 克隆
git clone https://github.com/chenyyyi/MemoHub.git
cd MemoHub

# 安装依赖
pnpm install

# 开发模式运行
pnpm tauri dev
```

### 构建发布

```bash
pnpm tauri build
```

安装包输出目录：`src-tauri/target/release/bundle/`

---

## 📖 使用指南

### 首次启动

1. 出现欢迎引导页 → 配置 AI API（可选但推荐）
2. 选择 Obsidian 库文件夹（可选）
3. 完成！使用 `Ctrl+Shift+M` 开始记录

### 输入类型

| 类型 | 操作 | 行为 |
|------|------|------|
| **文字** | 输入或粘贴纯文本 | AI 分析 → 自动打标签 → 存入 Obsidian |
| **链接** | 粘贴 URL | 抓取标题 → 分析 → 保存为 `[标题](url)` |
| **图片** | Ctrl+V 粘贴截图 | 送视觉模型 → OCR 识别 → 保存 |
| **待办** | 含时间/紧急性的文本 | 自动创建待办 + 设置到期提醒 |

### Obsidian 目录结构

```
MemoHub/
├── 0-Inbox/        — 待整理，默认回退
├── 1-Projects/     — 工作与项目相关
├── 2-Areas/        — 生活、健康、财务
├── 3-Resources/    — 学习与参考资料
├── 4-Permanent/    — 永久笔记与想法
├── 5-MOCs/         — 内容地图（Maps of Content）
├── 6-Archives/     — 归档
└── Templates/      — 笔记模板
```

### 配置说明

设置 → AI 接口：
- **API 地址**：你的服务商接口（如 `https://api.siliconflow.cn/v1`）
- **API Key**：你的密钥
- **文字模型**：用于文本分析的模型（如 `Qwen/Qwen2.5-7B-Instruct`）
- **视觉模型**：用于图片识别的模型（如 `Qwen/Qwen2.5-VL-7B-Instruct`）

不配置 AI 时，使用基础关键词匹配分类。

---

## 🏗️ 架构

```
┌─────────────────────────────────────────┐
│  前端 (React + TypeScript + Tailwind)    │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ 输入视图 │ 备忘列表 │   设置页面   │ │
│  └────┬─────┴────┬─────┴──────┬───────┘ │
└───────┼──────────┼────────────┼─────────┘
        │          │            │
   ┌────▼──────────▼────────────▼─────────┐
   │  Tauri Commands (Rust 后端)           │
   │  ┌────────┬────────┬───────────────┐  │
   │  │  AI    │ 存储   │   设置管理    │  │
   │  │ 模块   │ 模块   │   模块        │  │
   │  └────┬───┴────┬───┴───────┬───────┘  │
   └───────┼────────┼───────────┼──────────┘
           │        │           │
   ┌───────▼────────▼───────────▼──────────┐
   │  外部: OpenAI 兼容 API                  │
   └────────────────────────────────────────┘
```

### 技术栈

- **桌面框架**：Tauri 2.0（Rust + WebView2）
- **前端**：React 19、TypeScript 5、TailwindCSS 4、Vite 6
- **后端**：Rust（serde、tokio、reqwest、chrono、uuid）
- **存储**：本地 JSON 文件，位于 `%LOCALAPPDATA%\MemoHub\`

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)。

```bash
# Fork 并克隆
git clone https://github.com/chenyyyi/MemoHub.git

# 创建分支
git checkout -b feature/your-feature

# 热重载开发
pnpm tauri dev

# 提交并推送
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

### 项目结构

```
MemoHub/
├── src/                    # 前端（React + TS）
│   ├── App.tsx             # 主应用壳、路由、全局快捷键
│   ├── components/
│   │   ├── Onboarding.tsx  # 欢迎引导页
│   │   ├── MemoList.tsx    # 浏览与复制备忘
│   │   ├── TodoList.tsx    # 待办管理
│   │   ├── SearchBar.tsx   # 全文搜索
│   │   └── SettingsPage.tsx# 全部设置
│   └── main.tsx            # 入口
├── src-tauri/              # 后端（Rust）
│   ├── src/
│   │   ├── main.rs         # 入口
│   │   ├── lib.rs          # Tauri 构建、托盘、窗口设置
│   │   ├── commands.rs     # Tauri 命令处理
│   │   ├── ai.rs           # AI API 调用、回退逻辑
│   │   ├── settings.rs     # 设置持久化
│   │   └── store.rs        # 备忘/待办存储
│   ├── capabilities/       # Tauri 权限
│   └── icons/              # 应用图标
├── .github/workflows/      # CI/CD
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tauri.conf.json
```

---

## 📋 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)。

---

## 📄 许可证

[MIT](LICENSE) © 2026 chenyyyi

---

<div align="center">

**如果 MemoHub 帮你保持条理，给个 ⭐ Star 吧！**

Made with 🧠 by [chenyyyi](https://github.com/chenyyyi)

</div>

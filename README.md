<div align="center">

<img src="src-tauri/icons/icon.png" alt="MemoHub" width="120" />

# MemoHub

**AI-Powered Quick Capture & Auto-Organize Tool**

*丢点什么进来，AI 帮你整理归档。*

[![Release](https://img.shields.io/github/v/release/chenyyyi/MemoHub?style=flat-square&color=blue)](https://github.com/chenyyyi/MemoHub/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-🦀-dea584?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)

[简体中文](README.zh-CN.md) · [English](README.md)

</div>

---

## ✨ Features

- 🧠 **AI Auto-Classification** — Supports any OpenAI-compatible API (SiliconFlow, DeepSeek, OpenAI, etc.)
- 📝 **Quick Capture** — `Ctrl+Shift+M` anytime, anywhere
- 📌 **Pin to Desktop** — Always-on-top floating window with transparency
- 🔍 **Full-Text Search** — Search by content, tags, categories
- ✅ **Smart Todo Detection** — Automatically extracts tasks with due dates from text
- 📸 **Image Support** — Paste screenshots, OCR recognition via vision models
- 🔗 **Link Parsing** — Auto-fetches page titles for bookmarked URLs
- 📂 **Obsidian Integration** — Auto-writes structured markdown to your Obsidian vault
- 🌗 **Dark/Light Theme** — Adaptive UI with backdrop blur effects
- 🪟 **Windows Taskbar Hide** — Tool-window style, clean desktop

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://www.rust-lang.org/tools/install) ≥ 1.77
- [pnpm](https://pnpm.io/) (recommended) or npm

### Development

```bash
# Clone
git clone https://github.com/chenyyyi/MemoHub.git
cd MemoHub

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

The installer will be at `src-tauri/target/release/bundle/`.

---

## 📖 User Guide

### First Launch

1. A welcome guide appears → configure AI API (optional but recommended)
2. Select Obsidian vault folder (optional)
3. Done! Use `Ctrl+Shift+M` to start capturing

### Input Types

| Type | How | Behavior |
|------|-----|----------|
| **Text** | Type or paste plain text | AI analyzes → auto-tags → saves to Obsidian |
| **Link** | Paste URL | Fetches title → analyzes → saves as `[title](url)` |
| **Image** | Ctrl+V paste screenshot | Sends to vision model → OCR → saves |
| **Task** | Text with time/urgency | Auto-creates todo + sets due date reminder |

### Obsidian Directory Structure

```
MemoHub/
├── 0-Inbox/        — Unsorted, default fallback
├── 1-Projects/     — Work & project-related
├── 2-Areas/        — Life, health, finance
├── 3-Resources/    — Learning & references
├── 4-Permanent/    — Evergreen notes & ideas
├── 5-MOCs/         — Maps of content
├── 6-Archives/     — Completed/outdated
└── Templates/      — Note templates
```

### Configuration

Settings → AI Interface:
- **API Base**: Your provider endpoint (e.g. `https://api.siliconflow.cn/v1`)
- **API Key**: Your secret key
- **Text Model**: Model for text analysis (e.g. `Qwen/Qwen2.5-7B-Instruct`)
- **Vision Model**: Model for image recognition (e.g. `Qwen/Qwen2.5-VL-7B-Instruct`)

Without AI config, falls back to keyword-based classification.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React + TypeScript + Tailwind)│
│  ┌──────────┬──────────┬──────────────┐ │
│  │ InputView│ MemoList │ SettingsPage │ │
│  └────┬─────┴────┬─────┴──────┬───────┘ │
└───────┼──────────┼────────────┼─────────┘
        │          │            │
   ┌────▼──────────▼────────────▼─────────┐
   │  Tauri Commands (Rust Backend)        │
   │  ┌────────┬────────┬───────────────┐  │
   │  │  AI    │ Store  │   Settings    │  │
   │  │ Module │ Module │   Module      │  │
   │  └────┬───┴────┬───┴───────┬───────┘  │
   └───────┼────────┼───────────┼──────────┘
           │        │           │
   ┌───────▼────────▼───────────▼──────────┐
   │  External: OpenAI-compatible API       │
   └────────────────────────────────────────┘
```

### Tech Stack

- **Desktop Framework**: Tauri 2.0 (Rust + WebView2)
- **Frontend**: React 19, TypeScript 5, TailwindCSS 4, Vite 6
- **Backend**: Rust (serde, tokio, reqwest, chrono, uuid)
- **Storage**: Local JSON files in `%LOCALAPPDATA%\MemoHub\`

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
# Fork and clone
git clone https://github.com/chenyyyi/MemoHub.git

# Create branch
git checkout -b feature/your-feature

# Develop with hot-reload
pnpm tauri dev

# Commit and push
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

### Project Structure

```
MemoHub/
├── src/                    # Frontend (React + TS)
│   ├── App.tsx             # Main app shell, routing, global shortcuts
│   ├── components/
│   │   ├── Onboarding.tsx  # Welcome & setup wizard
│   │   ├── MemoList.tsx    # Browse & copy memos
│   │   ├── TodoList.tsx    # Todo management
│   │   ├── SearchBar.tsx   # Full-text search
│   │   └── SettingsPage.tsx# All settings
│   └── main.tsx            # Entry point
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # Tauri builder, tray, window setup
│   │   ├── commands.rs     # Tauri command handlers
│   │   ├── ai.rs           # AI API calls, fallback logic
│   │   ├── settings.rs     # Settings persistence
│   │   └── store.rs        # Memo/todo storage
│   ├── capabilities/       # Tauri permissions
│   └── icons/              # App icons
├── .github/workflows/      # CI/CD
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tauri.conf.json
```

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

[MIT](LICENSE) © 2026 chenyyyi

---

<div align="center">

**Star ⭐ this repo if MemoHub helps you stay organized!**

Made with 🧠 by [chenyyyi](https://github.com/chenyyyi)

</div>

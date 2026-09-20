# 为 MemoHub 做贡献

感谢你的关注！这是一个小而精的项目，每一份贡献都很重要。

## 开发环境搭建

### 环境要求
- Node.js ≥ 18
- Rust ≥ 1.77
- pnpm（推荐）

### 开始

```bash
git clone https://github.com/chenyyyi/MemoHub.git
cd MemoHub
pnpm install
pnpm tauri dev
```

## 贡献流程

1. **Fork** 本仓库
2. **创建** 功能分支（`git checkout -b feature/amazing-feature`）
3. **提交** 变更（`git commit -m 'feat: add amazing feature'`）
4. **推送** 到分支（`git push origin feature/amazing-feature`）
5. **发起** Pull Request

## 代码风格

### 前端（TypeScript/React）
- 使用 TypeScript strict 模式
- 函数式组件 + Hooks
- TailwindCSS 样式
- 2 空格缩进

### 后端（Rust）
- 遵循 `rustfmt` 格式化
- 提交前运行 `cargo clippy`
- 使用 `log::` 宏记录日志（生产代码不要用 `println!`）

## 提交规范

```
feat:     新功能
fix:      修复 bug
docs:     文档变更
refactor: 代码重构
chore:    维护工作
test:     添加测试
```

## 报告 Issue

- 使用 Issue 模板
- 包含操作系统版本、MemoHub 版本、复现步骤
- AI API 相关问题提供服务商名称（不要包含 API Key！）

## 架构提示

- 前端通过 `invoke()` 调用后端命令
- 所有状态持久化在 `%LOCALAPPDATA%\MemoHub\`
- AI 模块支持任意 OpenAI 兼容端点 — 没有硬编码的服务商

---

<div align="center">

编码愉快！🚀

</div>

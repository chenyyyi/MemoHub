# Contributing to MemoHub

Thank you for your interest in contributing! This is a small but passionate project, and every contribution helps.

## Development Setup

### Prerequisites
- Node.js ≥ 18
- Rust ≥ 1.77
- pnpm (recommended)

### Getting Started

```bash
git clone https://github.com/chenyyyi/MemoHub.git
cd MemoHub
pnpm install
pnpm tauri dev
```

## How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to your branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## Code Style

### Frontend (TypeScript/React)
- Use TypeScript strict mode
- Functional components with hooks
- TailwindCSS for styling
- 2-space indentation

### Backend (Rust)
- Follow `rustfmt` formatting
- Run `cargo clippy` before committing
- Use `log::` macros for logging (no `println!` in production code)

## Commit Convention

```
feat:     new feature
fix:      bug fix
docs:     documentation
refactor: code refactor
chore:    maintenance
test:     adding tests
```

## Reporting Issues

- Use the issue template
- Include OS version, MemoHub version, and steps to screenshot/paste
- For AI API issues, include the provider name (no API keys!)

## Architecture Tips

- Frontend communicates with backend via `invoke()` calls
- All state is persisted in `%LOCALAPPDATA%\MemoHub\`
- The AI module supports any OpenAI-compatible endpoint — no hardcoded providers

---

<div align="center">

Happy coding! 🚀

</div>

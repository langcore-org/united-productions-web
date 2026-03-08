# Claude Code Chat UI Documentation

## Document Index

### Claude Code OpenAI Wrapper (Recommended)

| Document | Description |
|----------|-------------|
| [05-claude-code-wrapper-architecture.md](./05-claude-code-wrapper-architecture.md) | Wrapper architecture overview |
| [06-wrapper-setup-guide.md](./06-wrapper-setup-guide.md) | Wrapper installation and configuration |
| [07-chat-ui-integration.md](./07-chat-ui-integration.md) | Connect Next.js UI to wrapper |
| [08-session-management.md](./08-session-management.md) | Session persistence and management |
| [09-tool-reference.md](./09-tool-reference.md) | Complete tool documentation |
| [03-skills-integration.md](./03-skills-integration.md) | Skills system integration (Claude Agent SDK) |
| [10-infographic-skill-design.md](./10-infographic-skill-design.md) | Infographic generation skill design |

### Legacy Documents (Reference Only)

| Document | Description |
|----------|-------------|
| [00-architecture-overview.md](./00-architecture-overview.md) | Original CLIProxyAPI architecture |
| [01-database-design.md](./01-database-design.md) | SQLite schema design |
| [02-api-design.md](./02-api-design.md) | API endpoint design |
| [04-implementation-roadmap.md](./04-implementation-roadmap.md) | Implementation phases |
| [claude-chat-ui-design.md](./claude-chat-ui-design.md) | Original UI design spec |

## Quick Start

### 1. Setup Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

### 2. Start Wrapper

```bash
cd claude-code-openai-wrapper
poetry install
poetry run uvicorn src.main:app --reload --port 8000
```

### 3. Start Chat UI

```bash
cd next-chat-ui-cc-wrapper
npm install
PORT=3007 npm run dev
```

### 4. Access

- Chat UI: http://localhost:3007
- Wrapper API: http://localhost:8000

## Architecture Comparison

### CLIProxyAPI (Not recommended)

```
Chat UI → CLIProxyAPI → Anthropic Messages API
                       (No tools, just text)
```

**Limitations**:
- No tool support (WebSearch, Bash, Read/Write)
- Just a simple API proxy
- Written in Go

### Claude Code OpenAI Wrapper (Recommended)

```
Chat UI → Wrapper → Claude Agent SDK → Claude Code CLI
                   (Full tool support)
```

**Capabilities**:
- Full Claude Code tool access
- WebSearch, file operations, Bash
- Session continuity
- Written in Python (FastAPI)

## Project Structure

```
cli_proxy/
├── docs/                           # This documentation
├── claude-code-openai-wrapper/     # Python wrapper (recommended)
├── next-chat-ui-cc-wrapper/        # Chat UI for wrapper
├── CLIProxyAPI/                    # Go proxy (legacy)
└── next-chat-ui/                   # Chat UI for CLIProxyAPI (legacy)
```

## Key Configuration Files

### Wrapper (claude-code-openai-wrapper)

| File | Purpose |
|------|---------|
| `src/constants.py` | Default tools, models |
| `src/main.py` | API endpoints, max_turns, permission_mode |
| `src/claude_cli.py` | Claude Agent SDK integration |
| `.env` | Environment configuration |

### Chat UI (next-chat-ui-cc-wrapper)

| File | Purpose |
|------|---------|
| `.env.local` | Wrapper URL, model, enable_tools |
| `src/lib/modes.ts` | Agent mode definitions |
| `src/lib/db.ts` | SQLite database functions |
| `src/app/api/chat/route.ts` | Chat API endpoint |

### Available Modes

| Mode | Description |
|------|-------------|
| Default | General-purpose assistant |
| Deep Research | In-depth research and analysis |
| Script Writer | Documentary and video scripts |
| Meeting Notes | Summarize meetings, extract action items |
| Code Review | Review code quality |
| Translator | Translate content between languages |
| Creative Writer | Generate creative content |
| Interior Consultant | Interior design advice (Japanese) |
| ネタリサーチャー | TV番組制作のプロフェッショナルリサーチャー |

## Common Issues

### WebSearch not working

1. Check `src/constants.py` has `"WebSearch"` in `DEFAULT_ALLOWED_TOOLS`
2. Ensure `permission_mode` is `"bypassPermissions"` in `src/main.py`
3. Verify Claude Code auth: `claude auth status`

### Permission prompts appearing

Set `permission_mode="bypassPermissions"` in `src/main.py` (line ~402 and ~657)

### Limited tool calls

Increase `max_turns` in `src/main.py` (default 50)

### Session not persisting

Check SQLite database exists at `next-chat-ui-cc-wrapper/data/chat.db`

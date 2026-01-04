# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLI Proxy is a microservice system that exposes Claude Code as a chat interface. It consists of:

1. **API Wrapper** (`claude-code-openai-wrapper/`): FastAPI Python service providing OpenAI-compatible API on top of Claude Code CLI
2. **Chat UI** (`next-chat-ui-cc-wrapper/`): Next.js 16 React frontend with session management and SQLite storage
3. **Alternative Chat UI** (`up_webapp/`): Newer experimental Next.js chat interface
4. **Agent** (`agent/`): Alternate Python wrapper implementation (same structure as claude-code-openai-wrapper)
5. **Supabase** (`supabase/`): PostgreSQL schema for multi-tenant production deployment

## Architecture

```
Browser → Chat UI (Next.js :3120) → API Wrapper (FastAPI :8120) → Claude Code CLI → Claude Agent SDK
```

The API Wrapper translates OpenAI-format requests to Claude Agent SDK calls, enabling any OpenAI-compatible client to use Claude Code.

## Development Commands

### Full Stack Deployment (PM2)
```bash
./deploy.sh                    # Full deployment with build
pm2 start ecosystem.config.js  # Start services
pm2 logs                       # View all logs
pm2 restart all                # Restart services
```

### API Wrapper (Python/FastAPI)
```bash
cd claude-code-openai-wrapper
poetry install                 # Install dependencies
poetry run uvicorn src.main:app --reload --port 8120  # Development
poetry run pytest              # Run tests
poetry run black src/          # Format code
```

### Chat UI (Next.js)
```bash
cd next-chat-ui-cc-wrapper  # or up_webapp
npm install
npm run dev                 # Development (:3110 for up_webapp, :3120 for cc-wrapper)
npm run build               # Production build
npm run lint                # ESLint
```

### Database Migrations (Supabase)
```bash
cd supabase
supabase db push            # Apply migrations
supabase migration new <name>  # Create migration
```

## Key Configuration

### API Wrapper Environment (.env)
- `PORT`: Server port (default 8120)
- `CLAUDE_CWD`: Working directory for Claude Code
- `MAX_TIMEOUT`: Request timeout in ms (default 600000)
- `API_KEY`: Optional API key for endpoint protection
- `DEBUG_MODE` / `VERBOSE`: Enable detailed logging

### Chat UI Environment (.env.local)
- `CLIPROXY_URL`: API Wrapper URL (default http://localhost:8120/v1)
- `CLIPROXY_API_KEY`: API key if configured
- `DEFAULT_MODEL`: Default Claude model
- `ENABLE_TOOLS`: Enable Claude Code tools (Bash, Read, Write, etc.)

## Code Architecture

### API Wrapper Core (`claude-code-openai-wrapper/src/`)
- `main.py`: FastAPI app, endpoints, SSE streaming
- `claude_cli.py`: Claude Agent SDK integration
- `message_adapter.py`: OpenAI ↔ Claude message conversion
- `session_manager.py`: Conversation session handling
- `session_buffer.py`: Background execution event buffering
- `tool_manager.py`: Claude Code tool configuration
- `mcp_client.py`: MCP server management
- `models.py`: Pydantic request/response models

### Chat UI Core (`next-chat-ui-cc-wrapper/src/` or `up_webapp/src/`)
- `app/api/chat/route.ts`: Chat API proxying to wrapper
- `app/api/sessions/`: Session CRUD endpoints
- `lib/db.ts`: SQLite database operations (better-sqlite3)
- `lib/modes.ts`: Chat mode configurations
- `components/chat/`: Chat UI components

### Key Design Patterns
- **OpenAI Compatibility**: POST /v1/chat/completions accepts OpenAI format
- **SSE Streaming**: Real-time response streaming with keep-alive
- **Background Execution**: Tasks continue if client disconnects
- **Session Persistence**: Conversations stored and resumable
- **Tool Events**: TodoWrite and file creation events streamed to UI

## API Endpoints

### Chat
- `POST /v1/chat/completions`: Main chat endpoint (OpenAI format)
- `GET /v1/models`: List available Claude models
- `POST /v1/compatibility`: Check request compatibility

### Sessions
- `GET /v1/sessions`: List sessions
- `GET /v1/sessions/{id}`: Get session
- `GET /v1/sessions/{id}/status`: Background execution status
- `GET /v1/sessions/{id}/buffer`: Buffered events for reconnection
- `POST /v1/sessions/{id}/stop`: Stop running session

### Tools & MCP
- `GET /v1/tools`: List Claude Code tools
- `POST /v1/tools/config`: Configure allowed/disallowed tools
- `GET /v1/mcp/servers`: List MCP servers
- `POST /v1/mcp/connect`: Connect to MCP server

### System
- `GET /health`: Health check
- `GET /v1/auth/status`: Authentication status

## Testing

### API Wrapper Tests
```bash
cd claude-code-openai-wrapper
poetry run pytest tests/

# Quick endpoint test
curl http://localhost:8120/health
curl http://localhost:8120/v1/models
curl -X POST http://localhost:8120/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-haiku-4-5-20251001", "messages": [{"role": "user", "content": "Hello"}]}'
```

### Webapp Testing
Use the **Claude Code Chrome Extension** for browser-based webapp testing:
- Install from: https://claude.com/chrome
- Enables browser automation, E2E testing, and UI interaction via MCP tools
- Tools available: `read_page`, `find`, `navigate`, `computer`, `form_input`, etc.

## Request Format

Standard OpenAI format with extensions:
```json
{
  "model": "claude-sonnet-4-20250514",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true,
  "session_id": "optional-uuid",
  "enable_tools": true,
  "show_thinking": false
}
```

Custom headers for Claude-specific options:
- `X-Claude-Max-Turns`: Maximum agentic turns
- `X-Claude-Permission-Mode`: bypassPermissions, default
- `X-Claude-Allowed-Tools` / `X-Claude-Disallowed-Tools`: Tool filtering

## Database Schema (Supabase)

Multi-tenant architecture for production deployment:
- `users` / `user_settings`: User management
- `instances` / `instance_members`: Workspace (tenant) management
- `programs` / `program_members`: Content program organization
- `documents` / `document_refs`: Document management
- `artifacts`: Generated content with versioning
- `tags` / `document_tags`: Unified tagging system

Note: Local development uses SQLite in the Chat UI (`data/chat.db`).

## Code Style

- Python: Black formatter, line length 100, target Python 3.10+
- TypeScript: ESLint with Next.js config
- Use Pydantic for Python models, type hints throughout

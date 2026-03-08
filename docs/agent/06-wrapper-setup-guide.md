# Claude Code OpenAI Wrapper Setup Guide

## Prerequisites

### 1. Claude Code CLI Installation

```bash
# Install Claude Code CLI globally
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
# Expected: Claude Code version 2.x.x or higher
```

### 2. Authentication (Choose One)

#### Option A: OAuth Login (Recommended for Claude Max/Pro)

```bash
# Interactive OAuth login
claude auth login

# Verify auth status
claude auth status
```

#### Option B: API Key (Pay-per-use)

```bash
# Set environment variable
export ANTHROPIC_API_KEY=sk-ant-your-api-key

# Or add to shell profile (~/.zshrc or ~/.bashrc)
echo 'export ANTHROPIC_API_KEY=sk-ant-your-api-key' >> ~/.zshrc
```

#### Option C: AWS Bedrock

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

#### Option D: Google Vertex AI

```bash
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=us-central1
export ANTHROPIC_VERTEX_PROJECT_ID=your-project
```

### 3. Python Environment

```bash
# Ensure Python 3.11+ is installed
python --version

# Install Poetry (if not installed)
curl -sSL https://install.python-poetry.org | python3 -
```

## Wrapper Installation

### 1. Clone Repository

```bash
cd /path/to/your/projects
git clone https://github.com/RichardAtCT/claude-code-openai-wrapper.git
cd claude-code-openai-wrapper
```

### 2. Install Dependencies

```bash
# Install with Poetry
poetry install

# Verify installation
poetry run python -c "from claude_agent_sdk import query; print('SDK OK')"
```

### 3. Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env as needed
```

**.env Configuration Options:**

```env
# Claude CLI Configuration
CLAUDE_CLI_PATH=claude

# API Configuration
PORT=8000

# Timeout Configuration (milliseconds)
MAX_TIMEOUT=600000

# Working Directory - IMPORTANT for file operations
# Files created/read by Claude Code will use this directory
# Set this to your chat UI's data/files directory for integration
CLAUDE_CWD=/path/to/next-chat-ui-cc-wrapper/data/files

# CORS Configuration
CORS_ORIGINS=["*"]

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=30
RATE_LIMIT_CHAT_PER_MINUTE=10
```

**CLAUDE_CWD is critical for file integration:**
- Without `CLAUDE_CWD`: Files are saved to a temp directory (lost on restart)
- With `CLAUDE_CWD`: Files are saved to the specified directory

### 4. Start Wrapper Server

```bash
# Start with auto-reload (development)
poetry run uvicorn src.main:app --reload --port 8000

# Or start without auto-reload (production)
poetry run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 5. Verify Installation

```bash
# Health check
curl http://localhost:8000/health
# Expected: {"status":"ok",...}

# List models
curl http://localhost:8000/v1/models
# Expected: {"data":[{"id":"claude-sonnet-4-5-20250929",...}]}

# Check auth status
curl http://localhost:8000/v1/auth/status
# Expected: {"authenticated":true,"method":"oauth",...}
```

## Tool Configuration

### Default Tool Settings

Located in `src/constants.py`:

```python
# Tools enabled by default
DEFAULT_ALLOWED_TOOLS = [
    "Read",       # Read files
    "Glob",       # File pattern matching
    "Grep",       # Search file contents
    "Bash",       # Execute shell commands
    "Write",      # Write files
    "Edit",       # Edit files
    "WebFetch",   # Fetch web content
    "WebSearch",  # Search the web
    "TodoWrite",  # Task management
    "Task",       # Sub-agent spawning
]

# Tools disabled by default (empty = all enabled)
DEFAULT_DISALLOWED_TOOLS = []
```

### Permission Mode

Located in `src/main.py`:

```python
# bypassPermissions: Skip all permission prompts
permission_mode=claude_options.get("permission_mode", "bypassPermissions")

# Other options:
# - "default": Ask for permission on each tool use
# - "acceptEdits": Auto-accept file edits only
# - "plan": Planning mode
```

### Max Turns

Located in `src/main.py`:

```python
# Allow up to 50 tool calls per request
max_turns=claude_options.get("max_turns", 50)
```

## API Usage

### Basic Chat Request

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### With Tools Enabled

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Search the web for latest AI news"}],
    "stream": true,
    "enable_tools": true
  }'
```

### With Session Continuity

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Continue our conversation"}],
    "stream": true,
    "enable_tools": true,
    "session_id": "my-session-123"
  }'
```

## System Prompt Configuration

### How System Prompts Work

The wrapper passes system prompts to Claude Agent SDK. The SDK accepts:

1. **Simple string** - For custom system prompts (replaces Claude Code default)
2. **Preset with append** - For adding to Claude Code's default prompt

```python
# In claude_cli.py

# Custom system prompt (simple string)
if system_prompt:
    options.system_prompt = system_prompt  # String, not dict

# Claude Code preset (default behavior)
else:
    options.system_prompt = {"type": "preset", "preset": "claude_code"}
```

### Important Notes

- **Don't use `{"type": "text", "text": ...}`** - This format is NOT supported by the SDK
- When using custom system prompt, Claude Code's default instructions are replaced
- The custom prompt should include any necessary instructions for tool usage

### System Prompt Flow

```
Chat UI (modes.ts) → /api/chat → Wrapper → Claude CLI → Claude Agent SDK
     ↓                              ↓
  systemPrompt              options.system_prompt = "..."
```

## Troubleshooting

### Common Issues

#### 1. "ModuleNotFoundError: No module named 'slowapi'"

```bash
# Reinstall dependencies
cd claude-code-openai-wrapper
poetry install
```

#### 2. "Claude Code authentication issues detected"

```bash
# Re-authenticate
claude auth logout
claude auth login

# Or set API key
export ANTHROPIC_API_KEY=your-key
```

#### 3. "WebSearch permission required"

Check that `src/constants.py` has WebSearch in `DEFAULT_ALLOWED_TOOLS` and `permission_mode` is set to `bypassPermissions`.

#### 4. "max_turns limit reached"

Increase `max_turns` in `src/main.py`:
```python
max_turns=claude_options.get("max_turns", 100)  # Increase from 50
```

#### 5. "System prompt not applied"

If custom modes (like Interior Consultant) don't work:
1. Check the wrapper logs for `📋 System prompt extracted` message
2. Verify `claude_cli.py` uses simple string format: `options.system_prompt = system_prompt`
3. Restart the wrapper server after changes

### Logs

```bash
# Watch wrapper logs
poetry run uvicorn src.main:app --reload --port 8000 --log-level debug
```

## Production Deployment

### Using Gunicorn

```bash
poetry run gunicorn src.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install poetry && poetry install --no-dev

EXPOSE 8000
CMD ["poetry", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxx  # Or use OAuth

# Optional
CLAUDE_CWD=/path/to/workspace  # Working directory for file ops
LOG_LEVEL=info                 # Logging level
RATE_LIMIT_CHAT=30            # Requests per minute
```

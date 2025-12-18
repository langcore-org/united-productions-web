# Claude Code Tool Reference

## Overview

Claude Code provides a set of built-in tools that can be used through the wrapper API. This document details each tool and its configuration.

## Tool Categories

### File Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| Read | Read files from filesystem | Low |
| Write | Write/overwrite files | Medium |
| Edit | String replacement in files | Medium |
| Glob | File pattern matching | Low |
| Grep | Search file contents | Low |
| NotebookEdit | Edit Jupyter notebooks | Medium |

### System Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| Bash | Execute shell commands | High |
| BashOutput | Get background shell output | Low |
| KillShell | Kill running shell | Low |

### Web Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| WebSearch | Search the web | Low |
| WebFetch | Fetch web page content | Low |

### Productivity

| Tool | Description | Risk Level |
|------|-------------|------------|
| TodoWrite | Create/manage task lists | Low |

### Agent Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| Task | Spawn sub-agents | High |
| Skill | Execute skills | Medium |
| SlashCommand | Execute slash commands | Medium |

## Tool Details

### Read

Read files from the local filesystem.

```yaml
Parameters:
  file_path: string (required) - Absolute path to file
  offset: number (optional) - Line number to start from
  limit: number (optional) - Number of lines to read

Capabilities:
  - Text files
  - Images (PNG, JPG)
  - PDFs
  - Jupyter notebooks (.ipynb)

Example Usage:
  - "Read the file /path/to/config.json"
  - "Show me lines 100-200 of /path/to/large.log"
```

### Write

Write or overwrite files.

```yaml
Parameters:
  file_path: string (required) - Absolute path to file
  content: string (required) - Content to write

Behavior:
  - Creates parent directories if needed
  - Overwrites existing files
  - Preserves file permissions

Example Usage:
  - "Create a new file /path/to/new.txt with content 'Hello'"
  - "Update /path/to/config.json with new settings"
```

### Edit

Perform string replacements in files.

```yaml
Parameters:
  file_path: string (required) - Absolute path to file
  old_string: string (required) - Text to replace
  new_string: string (required) - Replacement text
  replace_all: boolean (optional) - Replace all occurrences (default: false)

Behavior:
  - Fails if old_string is not unique (unless replace_all=true)
  - Preserves file encoding and line endings

Example Usage:
  - "Change 'localhost' to 'production.server.com' in config.js"
  - "Replace all 'TODO' with 'DONE' in the file"
```

### Glob

Fast file pattern matching.

```yaml
Parameters:
  pattern: string (required) - Glob pattern (e.g., "**/*.py")
  path: string (optional) - Base directory to search

Patterns:
  - "*.js" - All JS files in current dir
  - "**/*.ts" - All TS files recursively
  - "src/**/*.{ts,tsx}" - TS/TSX in src/

Example Usage:
  - "Find all Python files in the project"
  - "List all test files matching *.test.js"
```

### Grep

Search file contents using regex.

```yaml
Parameters:
  pattern: string (required) - Regex pattern
  path: string (optional) - Directory or file to search
  output_mode: string (optional) - "content", "files_with_matches", "count"
  glob: string (optional) - Filter by file pattern
  -i: boolean (optional) - Case insensitive
  -C: number (optional) - Context lines

Example Usage:
  - "Search for 'TODO' comments in all Python files"
  - "Find files containing 'async function'"
```

### Bash

Execute shell commands.

```yaml
Parameters:
  command: string (required) - Command to execute
  timeout: number (optional) - Timeout in milliseconds (max 600000)
  run_in_background: boolean (optional) - Run in background

Safety:
  - Commands run in isolated workspace
  - Timeout protection
  - No access to system directories by default

Example Usage:
  - "Run npm install"
  - "Execute git status"
  - "Start the development server in background"
```

### WebSearch

Search the web for information.

```yaml
Parameters:
  query: string (required) - Search query
  allowed_domains: string[] (optional) - Only search these domains
  blocked_domains: string[] (optional) - Exclude these domains

Capabilities:
  - Real-time web search
  - Current events and news
  - Documentation lookup

Limitations:
  - Rate limited by provider
  - Results may be summarized

Example Usage:
  - "Search for latest React 19 features"
  - "Find documentation for fastapi"
```

### WebFetch

Fetch and process web content.

```yaml
Parameters:
  url: string (required) - URL to fetch
  prompt: string (required) - How to process the content

Capabilities:
  - HTML to markdown conversion
  - Content extraction
  - AI-powered summarization

Example Usage:
  - "Fetch and summarize https://example.com/article"
  - "Extract code examples from this documentation page"
```

### TodoWrite

Create and manage task lists.

```yaml
Parameters:
  todos: array (required) - Array of todo items
    - content: string - Task description
    - status: "pending" | "in_progress" | "completed"
    - activeForm: string - Present participle form

Example Usage:
  [
    {"content": "Implement auth", "status": "completed", "activeForm": "Implementing auth"},
    {"content": "Add tests", "status": "in_progress", "activeForm": "Adding tests"},
    {"content": "Deploy to prod", "status": "pending", "activeForm": "Deploying to prod"}
  ]
```

### Task

Launch sub-agents for complex tasks.

```yaml
Parameters:
  description: string (required) - Short task description (3-5 words)
  prompt: string (required) - Detailed instructions
  subagent_type: string (required) - Agent type:
    - "general-purpose" - Multi-step tasks
    - "Explore" - Codebase exploration
    - "Plan" - Implementation planning
    - "claude-code-guide" - Documentation lookup

Risk:
  - Can spawn multiple sub-agents
  - Higher token usage
  - Longer execution time

Example Usage:
  - "Use Explore agent to find all API endpoints"
  - "Use Plan agent to design authentication system"
```

## Tool Configuration

### Default Configuration

In `src/constants.py`:

```python
# All available tools
CLAUDE_TOOLS = [
    "Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write",
    "NotebookEdit", "WebFetch", "TodoWrite", "WebSearch",
    "BashOutput", "KillShell", "Skill", "SlashCommand"
]

# Enabled by default
DEFAULT_ALLOWED_TOOLS = [
    "Read", "Glob", "Grep", "Bash", "Write", "Edit",
    "WebFetch", "WebSearch", "TodoWrite", "Task"
]

# Disabled by default
DEFAULT_DISALLOWED_TOOLS = []
```

### Per-Request Configuration

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [...],
    "enable_tools": true,
    "allowed_tools": ["Read", "WebSearch"],
    "disallowed_tools": ["Bash", "Write"]
  }'
```

### Per-Session Configuration

```bash
# Set session-specific tools
curl -X POST http://localhost:8000/v1/tools/config \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "my-session",
    "allowed_tools": ["Read", "Grep", "Glob"],
    "disallowed_tools": ["Bash", "Write", "Edit"]
  }'
```

## Permission Modes

### bypassPermissions (Default)

Skip all permission prompts. Tools execute immediately.

```python
permission_mode = "bypassPermissions"
```

### acceptEdits

Auto-accept file edits only. Other tools may prompt.

```python
permission_mode = "acceptEdits"
```

### default

Ask for permission on each potentially dangerous tool use.

```python
permission_mode = "default"
```

## Tool Execution Flow

```
User Request
    │
    ▼
┌─────────────────┐
│ Check if tool   │
│ is allowed      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Allowed │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check permission│
│ mode            │
└────────┬────────┘
         │
    ┌────┴────────────┐
    │ bypassPermissions│
    └────┬────────────┘
         │
         ▼
┌─────────────────┐
│ Execute tool    │
└────────┬────────┘
         │
         ▼
    Return result
```

## Security Considerations

### File System Access

- Tools operate within `CLAUDE_CWD` directory
- Default: temporary isolated workspace
- Set `CLAUDE_CWD=/path/to/project` for specific projects

### Command Execution

- Bash commands have timeout protection
- Background processes can be killed
- No sudo/root access by default

### Web Access

- WebSearch uses provider rate limits
- WebFetch respects robots.txt
- No access to localhost/internal networks

### Recommended Production Settings

```python
# For untrusted environments
DEFAULT_ALLOWED_TOOLS = ["Read", "Glob", "Grep", "WebSearch"]
DEFAULT_DISALLOWED_TOOLS = ["Bash", "Write", "Edit", "Task"]

# Use default permission mode for manual approval
permission_mode = "default"
```

# Skills Integration Design Document

Claude Agent SDK を使用した Skills 統合設計書。

---

## 1. Skills Architecture Overview

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skills Integration Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │   Chat UI    │     │   Wrapper    │     │  Claude Agent    │ │
│  │  (Next.js)   │────▶│  (FastAPI)   │────▶│      SDK         │ │
│  │              │     │              │     │                  │ │
│  │ ┌──────────┐ │     │ ┌──────────┐ │     │ ┌──────────────┐ │ │
│  │ │  Mode    │ │     │ │ System   │ │     │ │ Skills Auto  │ │ │
│  │ │ Selector │ │     │ │ Prompt   │ │     │ │  Discovery   │ │ │
│  │ └──────────┘ │     │ └──────────┘ │     │ └──────────────┘ │ │
│  └──────────────┘     └──────────────┘     └──────────────────┘ │
│                                                                   │
│  Skills Sources:                                                  │
│  ├── User Skills    → ~/.claude/skills/                          │
│  ├── Project Skills → .claude/skills/                            │
│  └── Plugin Skills  → Installed plugins                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Concepts

| 概念 | 説明 |
|------|------|
| **Skill** | SKILL.md で定義された特化機能。Claudeが自動判断で呼び出す |
| **Mode** | Chat UIで選択するペルソナ。System promptとして適用 |
| **CLAUDE.md** | プロジェクト全体のコンテキスト。常にロードされる |

### 1.3 Skills vs Modes

| 項目 | Skills | Modes |
|------|--------|-------|
| **定義場所** | `~/.claude/skills/` or `.claude/skills/` | `modes.ts` |
| **呼び出し** | Claude が自動判断 | ユーザーが明示的に選択 |
| **スコープ** | 特定タスクの専門機能 | 会話全体のペルソナ |
| **ロード** | 必要時に動的ロード | セッション開始時に固定 |

---

## 2. Skills File Structure

### 2.1 SKILL.md Format

```yaml
---
name: skill-name                    # lowercase with hyphens, max 64 chars
description: "When to use this skill..."  # Trigger description (max 1024 chars)
allowed-tools: Read, Grep, Write   # Optional: restrict tool access
model: claude-sonnet-4-5           # Optional: specify model
---

# Skill Instructions

Your detailed instructions here...
```

### 2.2 Directory Structure

```
my-skill/
├── SKILL.md              # Required: prompt and metadata
├── scripts/              # Optional: executable scripts
│   └── generate.py
├── references/           # Optional: documentation
│   └── examples.md
└── assets/               # Optional: templates
    └── template.json
```

### 2.3 Storage Locations

| Location | Path | Scope |
|----------|------|-------|
| User Skills | `~/.claude/skills/` | All projects |
| Project Skills | `.claude/skills/` | Current project only |
| Plugin Skills | Plugin bundles | Installed plugins |

---

## 3. Claude Agent SDK Configuration

### 3.1 Python SDK Setup

```python
from claude_agent_sdk import query, ClaudeAgentOptions

options = ClaudeAgentOptions(
    max_turns=50,
    cwd="/path/to/project",

    # Enable Skills loading from filesystem
    setting_sources=["user", "project"],

    # Allow Skill tool
    allowed_tools=["Read", "Write", "Bash", "WebSearch", "Skill"],

    # System prompt (Modes)
    system_prompt="Your custom persona...",
)

async for message in query(prompt="...", options=options):
    print(message)
```

### 3.2 Key Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `setting_sources` | Where to load Skills from | `[]` (disabled) |
| `allowed_tools` | Tools Claude can use (include "Skill") | All tools |
| `system_prompt` | Custom system prompt (for Modes) | Claude Code preset |

### 3.3 Setting Sources

```python
# Load user and project skills
setting_sources=["user", "project"]

# Options:
# - "user": ~/.claude/skills/
# - "project": .claude/skills/ (relative to cwd)
```

---

## 4. Wrapper Implementation

### 4.1 Current claude_cli.py Updates

```python
# src/claude_cli.py

async def run_completion(
    self,
    prompt: str,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    max_turns: int = 50,
    allowed_tools: Optional[List[str]] = None,
    enable_skills: bool = False,  # NEW: Enable Skills
    skill_sources: Optional[List[str]] = None,  # NEW: Skill sources
):
    options = ClaudeAgentOptions(
        max_turns=max_turns,
        cwd=self.cwd,
    )

    # System prompt (for Modes)
    if system_prompt:
        options.system_prompt = system_prompt
    else:
        options.system_prompt = {"type": "preset", "preset": "claude_code"}

    # Enable Skills
    if enable_skills:
        options.setting_sources = skill_sources or ["user", "project"]

        # Ensure Skill tool is allowed
        if allowed_tools:
            if "Skill" not in allowed_tools:
                allowed_tools.append("Skill")
        else:
            allowed_tools = [...DEFAULT_ALLOWED_TOOLS, "Skill"]

    if allowed_tools:
        options.allowed_tools = allowed_tools

    # ... rest of implementation
```

### 4.2 API Endpoint Updates

```python
# src/main.py

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    # Extract skill options from request
    enable_skills = request.get("enable_skills", False)
    skill_sources = request.get("skill_sources", ["user", "project"])

    # ... existing code ...

    async for message in cli.run_completion(
        prompt=prompt,
        system_prompt=system_prompt,
        enable_skills=enable_skills,
        skill_sources=skill_sources,
        # ...
    ):
        yield message
```

---

## 5. Chat UI Integration

### 5.1 Mode vs Skills Strategy

```typescript
// Current: Modes are explicit user choice
// Skills: Auto-discovered and invoked by Claude

// Recommended approach:
// 1. User selects Mode (persona) - applied as system_prompt
// 2. Skills enabled globally - Claude auto-invokes when needed

interface ChatOptions {
  mode?: string;           // User-selected mode
  systemPrompt?: string;   // From mode definition
  enableSkills?: boolean;  // Enable auto skill discovery
  skillSources?: string[]; // ["user", "project"]
}
```

### 5.2 API Request Format

```typescript
// /api/chat/route.ts

const requestBody = {
  model: DEFAULT_MODEL,
  messages: finalMessages,
  stream: true,
  session_id: sessionId,
  enable_tools: true,

  // Skills configuration
  enable_skills: true,
  skill_sources: ["user", "project"],
};
```

### 5.3 Environment Configuration

```env
# .env.local

# Enable Skills (default: false)
ENABLE_SKILLS=true

# Skill sources (comma-separated)
SKILL_SOURCES=user,project
```

---

## 6. Skills Examples

### 6.1 TV Research Skill

```
~/.claude/skills/tv-research/
├── SKILL.md
└── references/
    └── format-examples.md
```

**SKILL.md:**
```yaml
---
name: tv-research
description: "TV番組制作のリサーチ。番組企画、ネタ探し、構成案作成、出演者リサーチに使用。キーワード: TV番組、ネタ、企画、リサーチ、構成"
allowed-tools: WebSearch, WebFetch, Write, Read
---

# TV番組制作リサーチスキル

あなたはTV番組制作の現場を知り尽くしたプロフェッショナルなリサーチャーです。

## 思考プロセス
1. 現状把握: 何が分かっていて、何が足りないか？
2. 戦略立案: 最短ルートは何か？
3. 自己評価: この情報は「画」になるか？

## ワークフロー
1. 情報収集: Web検索で幅広く情報を集める
2. 深掘り: 面白いネタを見つけたら詳細を調査
3. 構成提案: VTRのイメージを含む構成案を作成
4. レポート: final_report.md として保存

## 出力フォーマット
リサーチレポートは以下の形式で作成:
- エグゼクティブサマリー
- 主要インサイト（画像URL含む）
- 構成案
- 参考資料リスト（50件以上）
```

### 6.2 API Design Skill

```
.claude/skills/api-design/
└── SKILL.md
```

**SKILL.md:**
```yaml
---
name: api-design
description: "REST/GraphQL API設計。エンドポイント設計、スキーマ定義、認証設計に使用。キーワード: API, REST, GraphQL, OpenAPI, schema"
allowed-tools: Read, Write, Edit
---

# API Design Expert

You are an API design specialist.

## Capabilities
- RESTful resource naming and HTTP methods
- GraphQL schema design
- OpenAPI/Swagger documentation
- Authentication/Authorization patterns
- Rate limiting and pagination

## Output Format
Always provide complete specifications:

```yaml:openapi.yaml
openapi: 3.0.0
paths:
  /users:
    get:
      summary: List users
```
```

### 6.3 E2E Testing Skill

```
.claude/skills/e2e-testing/
├── SKILL.md
└── scripts/
    └── run-tests.sh
```

**SKILL.md:**
```yaml
---
name: e2e-testing
description: "E2Eテスト作成と実行。Playwright/Cypressテスト、Page Object Pattern、テストデータ管理。キーワード: E2E, テスト, Playwright, Cypress, 自動テスト"
allowed-tools: Read, Write, Edit, Bash
---

# E2E Testing Expert

You are an E2E testing specialist using Playwright.

## Page Object Pattern
```typescript
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }
}
```

## Best Practices
- Use data-testid attributes
- Avoid flaky selectors
- Set up test data fixtures
```

---

## 7. Skills Discovery Flow

### 7.1 How Claude Discovers Skills

```
1. Session Start
   └── SDK scans skill directories
       ├── ~/.claude/skills/**/SKILL.md
       └── .claude/skills/**/SKILL.md

2. Metadata Collection (~100 tokens per skill)
   └── Extracts: name, description from frontmatter

3. User Request
   └── Claude matches request against skill descriptions
       └── Pure LLM reasoning (no embeddings/classifiers)

4. Skill Activation
   └── Full SKILL.md content loaded (~5K tokens max)
       └── Supporting files loaded on-demand

5. Execution
   └── Claude follows skill instructions
       └── Uses allowed-tools specified in skill
```

### 7.2 Description Best Practices

```yaml
# Good: Specific triggers and use cases
description: "TV番組制作のリサーチ。番組企画、ネタ探し、構成案作成、出演者リサーチに使用"

# Bad: Too vague
description: "Research assistant for various tasks"
```

---

## 8. Modes + Skills Strategy

### 8.1 Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Session                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐                                         │
│  │  Mode (選択)    │  ← User explicitly selects              │
│  │  e.g. "ネタ     │    Applied as system_prompt             │
│  │  リサーチャー"  │    Sets persona/tone                    │
│  └────────┬────────┘                                         │
│           │                                                   │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Skills (自動)                                           │ │
│  │                                                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │ WebSearch│  │ API設計  │  │ E2E Test │  ← Auto      │ │
│  │  │ Skill    │  │ Skill    │  │ Skill    │    invoked   │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  │                                                           │ │
│  │  Claude decides which skill to use based on request      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 When to Use Each

| Use Case | Solution |
|----------|----------|
| 会話全体のペルソナ設定 | Mode |
| 特定タスクの専門機能 | Skill |
| プロジェクト固有のルール | CLAUDE.md |
| ツール制限が必要 | Skill (allowed-tools) |

### 8.3 Combined Example

```typescript
// User selects "ネタリサーチャー" mode
// System prompt sets TV producer persona

// User asks: "最新のゲーム番組について調べて"

// Claude:
// 1. Uses system_prompt persona (friendly, industry terms)
// 2. Auto-invokes "tv-research" skill if available
// 3. Executes research workflow from skill
// 4. Responds in persona voice
```

---

## 9. Implementation Roadmap

### Phase 1: Enable Skills in Wrapper

```python
# claude_cli.py - Add setting_sources support
options.setting_sources = ["user", "project"]
```

### Phase 2: API Parameter Support

```python
# main.py - Accept enable_skills parameter
enable_skills = request.get("enable_skills", False)
```

### Phase 3: Chat UI Toggle

```typescript
// Add Skills toggle in settings
const [enableSkills, setEnableSkills] = useState(true);
```

### Phase 4: Skills Management UI (Optional)

```
- List available skills
- Enable/disable individual skills
- Create custom skills via UI
```

---

## 10. Testing

### 10.1 Verify Skills Loading

```bash
# Create test skill
mkdir -p ~/.claude/skills/test-skill
cat > ~/.claude/skills/test-skill/SKILL.md << 'EOF'
---
name: test-skill
description: "Test skill for verification. Use when user says 'test skill'"
---

# Test Skill

When invoked, respond with: "Test skill successfully loaded!"
EOF

# Test via wrapper
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "test skill"}],
    "stream": false,
    "enable_skills": true
  }'
```

### 10.2 Verify Skills Execution

```bash
# Check if skill was invoked
# Response should contain "Test skill successfully loaded!"
```

---

## 11. References

- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Agent Skills in SDK](https://platform.claude.com/docs/en/agent-sdk/skills)
- [Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Awesome Claude Skills](https://github.com/travisvn/awesome-claude-skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

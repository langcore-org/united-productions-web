---
name: research-agentic
description: Agentic research skill for iterative investigation and verification. Use when the user needs comprehensive research on a topic, wants to verify information accuracy/currency, needs multi-source fact-checking, or requires deep investigation with search-query-think loops. Triggers include "リサーチして", "調査して", "検証して", "最新情報を調べて", "詳しく調べて", or any research tasks requiring iterative verification.
---

# Agentic Research Skill

Iterative, self-correcting research workflow with verification loops.

## Core Philosophy

Research is not a single search. It is a loop:

```
Search → Synthesize → Verify → (Gap found?) → Search again
```

Continue until confidence threshold is met.

## Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| 🔴 Low | Single source, unverified claim | Must verify with 2+ independent sources |
| 🟡 Medium | Multiple sources agree, but dated (>1yr) | Check for updates, verify with recent sources |
| 🟢 High | Multiple recent sources (<6mo), cross-verified | Accept, note any minor discrepancies |

## Research Workflow

### Phase 1: Query Decomposition

Break complex queries into atomic research questions:

```
User: "What are the latest AI regulations in EU and their impact on startups?"
↓
Atoms:
1. What is the current status of EU AI Act? (enforcement date, scope)
2. What are the specific compliance requirements?
3. Which startups are affected and how?
4. What are industry reactions/latest changes?
```

### Phase 2: Iterative Search Loop

For each atomic question:

```
1. Search with targeted query
2. Extract key claims/facts
3. Assess confidence level
4. If confidence < HIGH:
   - Identify what needs verification
   - Formulate verification query
   - Repeat from 1
5. If contradictions found:
   - Note all perspectives
   - Identify most authoritative/credible source
   - Flag for user review
```

### Phase 3: Synthesis & Verification

Before finalizing:

```
□ Each key claim has ≥2 sources OR is from authoritative primary source
□ All quantitative data has source + retrieval date
□ Contradictions are explicitly noted with source evaluation
□ Information date is checked (stale? outdated?)
□ No circular references (A cites B, B cites A)
```

## Tool Usage

### Web Search

Use for:
- Initial broad exploration
- Finding primary sources
- Cross-checking claims
- Finding recent updates

Best practices:
- Start with specific queries, not broad
- Use site: filters for authoritative sources
- Check publication dates in results
- Follow citations to primary sources

### FetchURL

Use for:
- Reading full articles when summary insufficient
- Extracting exact quotes
- Verifying specific claims
- Accessing official documentation

Best practices:
- Check URL credibility before fetching
- Note publication/last-updated dates
- Extract relevant sections only

### MCP Tools

Use when available:
- **Browser MCP**: For JavaScript-heavy sites, interactive content
- **Search MCP**: For specialized search engines
- **Database MCP**: For structured data queries

## Verification Patterns

### Pattern 1: Direct Verification

```
Claim: "X was announced on date Y"
Verification: Search "X announced" + check official announcement
```

### Pattern 2: Source Authority Check

```
Hierarchy (highest to lowest):
1. Primary source (official docs, press releases, research papers)
2. Established news (Reuters, AP, Bloomberg)
3. Industry publications (TechCrunch, Ars Technica)
4. Aggregators/blogs (evaluate case by case)
5. Social media (only for official accounts, verify handle)
```

### Pattern 3: Temporal Verification

```
For time-sensitive topics:
1. Always check "last updated" or publication date
2. Search with date filter (past year, past month)
3. Check if sources are citing outdated information
4. Note: "As of [date], ..." in findings
```

## Output Format

```markdown
## Summary
[2-3 sentence synthesis]

## Key Findings

### Finding 1: [Title]
- **Claim**: [Clear statement]
- **Sources**: [List with dates]
- **Confidence**: 🟢/🟡/🔴
- **Notes**: [Any caveats, contradictions]

### Finding 2: ...

## Gaps & Uncertainties
- [What could not be verified]
- [Areas needing further research]

## Source Quality
- Primary: [N sources]
- Secondary verified: [N sources]
- Needs verification: [N claims]

## Last Updated
[Current date]
```

## Red Flags (Stop & Verify)

Stop and re-verify when:
- [ ] Only one source makes a specific claim
- [ ] Source is known aggregator without attribution
- [ ] Dates don't match (article says X, but X happened later)
- [ ] Numbers vary significantly across sources (>20%)
- [ ] Claim contradicts common knowledge without explanation
- [ ] Source is paywalled/opinion piece presented as fact

## Iteration Triggers

Continue research when:
1. Confidence level is 🔴 or 🟡 for key claims
2. Found contradiction between sources
3. Information seems outdated (>1 year for fast-moving topics)
4. Source chain leads to dead end or circular reference
5. User asks follow-up requiring deeper investigation

## Example Session

```
User: "What's the latest on GPT-5?"

Research:
1. Search "GPT-5 release date OpenAI"
   → Claims: "coming 2024" (source: blog, date: 2023)
   Confidence: 🔴 (old, single source)

2. Search "GPT-5 OpenAI 2024 2025 latest"
   → Claims: "no official timeline" (source: Reuters, 2024-08)
   Confidence: 🟡 (credible but need more)

3. Search site:openai.com "GPT-5" OR "next generation"
   → No official announcement found
   Confidence: 🟢 (verified absence of official info)

4. Search "OpenAI next model roadmap 2024 2025"
   → Claims: "o1 series released, GPT-5 not announced" (multiple sources)
   Confidence: 🟢 (cross-verified)

Synthesis: No GPT-5 announced. o1 series is current focus.
```

## Advanced: Deep Research Mode

For complex topics requiring 5+ search iterations:

See [references/deep-research.md](references/deep-research.md) for:
- Structured note-taking templates
- Citation management
- Handling contradictory evidence
- Building research trees

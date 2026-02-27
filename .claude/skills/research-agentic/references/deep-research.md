# Deep Research Mode

For complex investigations requiring 5+ search iterations.

## Research Tree Structure

Track investigation branches:

```
Topic: [Main question]
├── Branch A: [Sub-question]
│   ├── Source A1: [Finding] ✓ verified
│   ├── Source A2: [Finding] ⚠️ contradicts A1
│   └── Resolution: [Which source is more credible?]
├── Branch B: [Sub-question]
│   ├── Source B1: [Finding] 🔴 needs verification
│   └── Action: Search for B2 to verify
└── Synthesis: [How branches connect]
```

## Structured Notes Template

```markdown
## Branch: [Topic/Sub-question]

### Sources Found
| Source | Date | Claim | Credibility | Verified? |
|--------|------|-------|-------------|-----------|
| URL    | YYYY-MM | [Key claim] | High/Med/Low | ✓/✗/? |

### Contradictions
- **Claim X**: Source A says Y, Source B says Z
- **Resolution**: [Which is correct? Why?]

### Open Questions
- [What still needs investigation]

### Next Search Queries
- [Specific query to run]
```

## Citation Management

Format for consistent references:

```
[SourceID] Author/Org. "Title". Publication. Date. URL. Retrieved: [Date].

Examples:
[OAI-1] OpenAI. "GPT-4 Technical Report". arXiv. 2023-03. https://arxiv.org/... Retrieved: 2024-01-15.
[Reuters-1] Smith, J. "AI Regulation Update". Reuters. 2024-06-12. https://... Retrieved: 2024-06-15.
```

## Handling Contradictory Evidence

### Step 1: Document All Sides
- Note each claim with full context
- Record why each source might have different info

### Step 2: Source Evaluation
```
Evaluation criteria:
□ Is it primary or secondary?
□ Is there a conflict of interest?
□ Is the date relevant to the claim?
□ Is the source's expertise in this domain?
□ Does the source cite their sources?
```

### Step 3: Resolution Strategies

| Situation | Strategy |
|-----------|----------|
| One is outdated | Use newer, note change over time |
| Different scopes | Both can be true (clarify context) |
| One has clear bias | Prefer neutral source |
| Both seem credible | Present both with confidence caveats |
| Cannot resolve | Flag for user: "Sources disagree on X" |

## Confidence Calibration

Before finalizing, check calibration:

```
□ Can I explain WHY each claim is reliable?
□ Would I bet money on each key claim being true?
□ What would change my mind on each claim?
□ Have I actively looked for disconfirming evidence?
□ Am I confusing "no evidence against" with "evidence for"?
```

## Research Exit Criteria

Stop iterating when:
1. All 🔴 claims resolved to 🟡 or 🟢
2. Key questions have satisfactory answers
3. New searches yield diminishing returns
4. User's information need is met

Or when:
- 10+ iterations without progress (report stuck point)
- All sources lead to same circular references
- Topic is too ambiguous/nascent for reliable info

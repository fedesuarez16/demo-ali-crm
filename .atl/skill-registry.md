# Skill Registry — demo-ali-crm

**Generated**: 2026-05-12
**Project**: demo-ali-crm (`/Users/federicosuarez/demo-ali`)

---

## User Skills

| Skill | Trigger |
|-------|---------|
| `branch-pr` | When creating a pull request, opening a PR, or preparing changes for review |
| `go-testing` | When writing Go tests, using teatest, or adding test coverage |
| `issue-creation` | When creating a GitHub issue, reporting a bug, or requesting a feature |
| `judgment-day` | When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" |
| `skill-creator` | When user asks to create a new skill, add agent instructions, or document patterns for AI |
| `skill-registry` | When user says "update skills", "skill registry", "actualizar skills", "update registry", or after installing/removing skills |

---

## Project Convention Files

| File | Purpose |
|------|---------|
| `/Users/federicosuarez/demo-ali/CLAUDE.md` | Project-level coding conventions, architecture map, environment setup |
| `/Users/federicosuarez/.claude/CLAUDE.md` | Global user preferences, personality, SDD orchestrator rules |

---

## Compact Rules (auto-inject into sub-agents)

### branch-pr
- Every PR MUST link an approved GitHub issue (no exceptions)
- Every PR MUST have exactly one `type:*` label
- Automated checks must pass before merge

### issue-creation
- Use issue templates only (bug report or feature request)
- Every issue gets `status:needs-review` automatically
- A maintainer MUST add `status:approved` before any PR can open
- Questions go to Discussions, not issues

### judgment-day
- Trigger phrases: "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen"
- Launches two independent blind judges in parallel; synthesizes findings; applies fixes; re-judges up to 2 iterations

### skill-creator
- Trigger: user asks to create a new skill or document AI patterns
- Skills live in `~/.claude/skills/{name}/SKILL.md`
- Follow Agent Skills spec frontmatter format

---

## Stack Context (for skill matching)

- **Language**: TypeScript (strict mode), some legacy `.js`
- **Framework**: Next.js 15 App Router
- **UI**: Tailwind CSS, shadcn/ui (Radix primitives)
- **Database**: Supabase (Postgres + pgvector)
- **External**: Chatwoot, n8n, OpenAI, Redis
- **Path alias**: `@/*` → `./src/*`
- **Spanish identifiers**: all domain names, column names, enum values in Spanish
- **No test runner**: no jest/vitest/playwright/cypress installed

---

## Skill Resolution Notes

- `go-testing` does NOT apply — project is Next.js/TypeScript, not Go
- `branch-pr` applies when opening PRs
- `issue-creation` applies when filing GitHub issues
- `judgment-day` applies on explicit trigger phrases only
- `skill-creator` applies when creating new agent skills

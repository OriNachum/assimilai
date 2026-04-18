---
name: pr-review
description: >
  Fetch, triage, reply to, and resolve PR review feedback on citation-cli.
  Handles qodo-code-review, copilot-pull-request-reviewer, sonarqubecloud,
  and human GitHub review comments in one pass. Use when: working with PR
  reviews, responding to review comments, resolving threads, or the user
  says "review comments", "PR comments", "resolve threads", or "pr-review".
---

# PR Review — citation-cli

Fetch and respond to PR feedback on this repo. One script pulls every source
GitHub exposes; helper scripts post replies and resolve threads.

## Feedback sources on this repo

Every PR to citation-cli typically gets feedback from four bots plus any
human reviewers. Know what each one posts and where so triage is fast:

| Bot | Posts | Where it lands | Action |
|-----|-------|----------------|--------|
| `qodo-code-review` | Review summary + code-review with bug findings; sometimes inline comments | Both **issue comments** and **inline review comments** | Triage — usually actionable |
| `copilot-pull-request-reviewer` | PR overview; occasionally inline comments | **Top-level review** body + inline | Read overview; triage inline if any |
| `sonarqubecloud` | Quality Gate pass/fail + link to dashboard | **Issue comment** | Fix flagged issues; gate re-runs on push |
| `cloudflare-workers-and-pages` | Deploy preview URL for the branch | **Issue comment** | **Ignore** — not feedback, just a preview link |

The bot login is `sonarqubecloud`; the product it reports for is **SonarCloud**.
Both names refer to the same thing — keep the backticked `sonarqubecloud` for
the GitHub bot identity (e.g. when grepping comment authors) and use
"SonarCloud" in prose. The SonarCloud project ID for this repo is
`OriNachum_assimilai` (retained from the pre-rename project so history is
preserved). Quality gate details live at
`https://sonarcloud.io/dashboard?id=OriNachum_assimilai&pullRequest=<N>`.

## When to Use

- Before fixing PR review comments — fetch first to understand all signals
- After pushing a fix — reply and resolve relevant threads
- When the user asks to handle, respond to, or resolve PR comments

## Workflow

### 1. Fetch all feedback

One call returns inline review comments, issue comments, and top-level
review bodies:

```bash
bash .claude/skills/pr-review/scripts/pr-comments.sh PR_NUMBER
```

Output is three labeled sections:

- **`INLINE REVIEW COMMENTS`** — file/line comments on the diff, each with
  a thread ID and resolve status. These are what `pr-reply.sh` acts on.
- **`ISSUE COMMENTS`** — general PR comments (qodo summary + code review,
  sonarcloud quality gate, cloudflare preview, human discussion).
- **`TOP-LEVEL REVIEWS`** — PR-level review bodies (copilot overview).
  Reviews whose only content is inline comments are filtered out to avoid
  duplicating section 1.

### 2. Triage

For each finding, decide:

- **FIX** — valid concern; make the code change
- **PUSHBACK** — disagree; explain why in the reply
- **FOLLOW-UP** — valid but out of scope; open a GitHub issue, link it in
  the reply, and resolve the thread

Deduplicate: qodo and sonarcloud often flag the same security issue from
different angles. Fix the root cause once.

### 3. Fix code

Make the change, commit, push. Respect the branch-hygiene rule below.

### 4. Reply and resolve

For a single inline thread:

```bash
bash .claude/skills/pr-review/scripts/pr-reply.sh --resolve PR_NUMBER COMMENT_ID "Fixed in <sha> -- <what changed>"
```

For multiple inline threads at once:

```bash
bash .claude/skills/pr-review/scripts/pr-batch.sh --resolve PR_NUMBER <<'EOF'
{"comment_id": 123, "body": "Fixed in abc1234 -- removed the workflow_dispatch escape hatch"}
{"comment_id": 456, "body": "Intentional -- this is dev-only tooling, won't ship"}
EOF
```

**Issue comments and top-level reviews cannot be "resolved"** via the GitHub
API — they auto-clear when the bot re-reviews after the next push. For qodo
code-review issue comments that listed multiple bugs, post one summary reply
on the parent PR summarizing what was addressed:

```bash
gh api repos/OriNachum/citation-cli/issues/PR_NUMBER/comments \
  -f body="$(cat <<'EOF'
Addressed both qodo findings in <sha>:
- Bug 1: ...
- Bug 2: ...
SonarCloud should re-evaluate on the next scan.

- Claude
EOF
)"
```

## Scripts

### scripts/pr-comments.sh

Fetch inline review comments (with thread resolve status), issue comments,
and top-level reviews in three labeled sections.

```bash
bash .claude/skills/pr-review/scripts/pr-comments.sh [--repo OWNER/REPO] PR_NUMBER
```

Bodies are truncated at 10 lines. Only inline review comments expose a
thread ID — those are the ones the other scripts can act on.

### scripts/pr-reply.sh

Reply to a single inline review comment, optionally resolve its thread.

```bash
bash .claude/skills/pr-review/scripts/pr-reply.sh [--repo OWNER/REPO] [--resolve] PR_NUMBER COMMENT_ID "body"
```

### scripts/pr-batch.sh

Batch reply (and optionally resolve) inline threads from JSONL on stdin.

```bash
bash .claude/skills/pr-review/scripts/pr-batch.sh [--repo OWNER/REPO] [--resolve] PR_NUMBER <<'EOF'
{"comment_id": 123, "body": "Fixed"}
{"comment_id": 456, "body": "Intentional"}
EOF
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--repo OWNER/REPO` | auto-detect | Override repository (default: from `gh repo view`) |
| `--resolve` | off | Also resolve the thread after replying (inline comments only) |

## Branch hygiene

citation-cli follows the standard flow: branch off `main`, implement, commit,
push, open PR, address review feedback, merge. Specific rules:

1. If a branch already has an open PR, **do not** stack unrelated commits on
   it. Start a new branch off `main` with a descriptive name
   (e.g., `skill/pr-review`, `fix/workflow-permissions`).
2. The Pages deploy workflow (`.github/workflows/pages-deploy.yml`) gates
   publish on `github.ref == 'refs/heads/main'`, so feature-branch dispatches
   build but don't deploy. Treat that guard as load-bearing.
3. Use absolute paths in shell when pasting from other repos — this project
   sits inside a multi-project workspace where `cd` can surprise.

## Commit and sign-off conventions

- Commits co-author with Claude:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- PR replies and issue comments posted by Claude get a trailing `- Claude`
  line so authorship is obvious to humans reading the thread (per the
  global user convention).
- Never skip pre-commit hooks (`--no-verify`). Fix the underlying issue.

## Notes

- All scripts auto-detect `OriNachum/citation-cli` from `gh repo view`;
  `--repo` override is only needed when running from outside the repo.
- Thread resolution uses the GitHub GraphQL API (REST doesn't support it).
- Requires `gh` CLI authenticated and `jq` installed on PATH.
- Reference PR for this workflow: [#9 — GitHub Pages deploy workflow](https://github.com/OriNachum/citation-cli/pull/9)
  (qodo + sonarcloud feedback addressed via per-job permissions + ref guard).

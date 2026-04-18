#!/usr/bin/env bash
set -euo pipefail

# Fetch and display all PR feedback in one pass:
#   1. Inline review comments (with thread resolve status)
#   2. Issue comments (qodo summaries, sonarcloud, etc.)
#   3. Top-level reviews with a non-empty body (copilot overview, etc.)
#
# Usage: pr-comments.sh [--repo OWNER/REPO] PR_NUMBER

USAGE="Usage: pr-comments.sh [--repo OWNER/REPO] PR_NUMBER"
REPO=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)
            if [[ $# -lt 2 || -z "${2:-}" || "${2:0:1}" == "-" ]]; then
                echo "Error: --repo requires a value." >&2
                echo "$USAGE" >&2
                exit 1
            fi
            REPO="$2"
            shift 2
            ;;
        *) break ;;
    esac
done

PR_NUMBER="${1:?$USAGE}"

if [[ -z "$REPO" ]]; then
    REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
fi

OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

# ── Section 1: inline review comments ─────────────────────────────────────
# Fetch ALL review threads (paginated) with up to 100 comments per thread,
# so reply-comment IDs map back to their thread, not just the first comment.
THREAD_QUERY='
    query($owner: String!, $name: String!, $number: Int!, $after: String) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          reviewThreads(first: 100, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              isResolved
              comments(first: 100) {
                nodes { databaseId }
              }
            }
          }
        }
      }
    }'
THREAD_NODES="[]"
AFTER=""
while :; do
    if [[ -z "$AFTER" ]]; then
        # First page: pass GraphQL null via -F (gh parses bare `null` as JSON null).
        PAGE=$(gh api graphql \
            -F owner="$OWNER" -F name="$NAME" -F number="$PR_NUMBER" \
            -F after=null -f query="$THREAD_QUERY")
    else
        PAGE=$(gh api graphql \
            -F owner="$OWNER" -F name="$NAME" -F number="$PR_NUMBER" \
            -F after="$AFTER" -f query="$THREAD_QUERY")
    fi
    NODES=$(echo "$PAGE" | jq '.data.repository.pullRequest.reviewThreads.nodes')
    THREAD_NODES=$(jq -n --argjson a "$THREAD_NODES" --argjson b "$NODES" '$a + $b')
    HAS_NEXT=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
    [[ "$HAS_NEXT" == "true" ]] || break
    AFTER=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')
done

# Flatten: one record per (comment_id, thread_id, resolved) so reply IDs
# resolve correctly too.
THREAD_MAP=$(echo "$THREAD_NODES" | jq '
  [.[] as $t | $t.comments.nodes[] | {
    comment_id: .databaseId,
    thread_id: $t.id,
    resolved: $t.isResolved
  }]
')

INLINE=$(gh api "repos/$REPO/pulls/$PR_NUMBER/comments" --paginate \
    | jq -s 'add // []')
INLINE_COUNT=$(echo "$INLINE" | jq 'length')

echo "════════════════ INLINE REVIEW COMMENTS ($INLINE_COUNT) ════════════════"
echo "$INLINE" | jq -r --argjson threads "$THREAD_MAP" '
  .[] | . as $c |
  ($threads | map(select(.comment_id == $c.id)) | first // {resolved: "unknown", thread_id: "?"}) as $t |
  "──────────────────────────────────────────────────",
  "ID: \($c.id)  |  Thread: \(if $t.resolved == true then "RESOLVED" elif $t.resolved == false then "UNRESOLVED" else "?" end)  |  Reply-to: \($c.in_reply_to_id // "none")",
  "File: \($c.path):\($c.original_line // $c.line // "?")",
  "Thread ID: \($t.thread_id)",
  "Author: \($c.user.login)",
  "",
  ($c.body | split("\n") | if length > 10 then .[:10] + ["... (truncated)"] else . end | join("\n")),
  ""
'

# ── Section 2: issue comments (general PR comments) ───────────────────────
ISSUE=$(gh api "repos/$REPO/issues/$PR_NUMBER/comments" --paginate \
    | jq -s 'add // []')
ISSUE_COUNT=$(echo "$ISSUE" | jq 'length')

echo ""
echo "════════════════ ISSUE COMMENTS ($ISSUE_COUNT) ════════════════"
echo "$ISSUE" | jq -r '
  .[] |
  "──────────────────────────────────────────────────",
  "ID: \(.id)  |  Author: \(.user.login)  |  Created: \(.created_at)",
  "",
  (.body | split("\n") | if length > 10 then .[:10] + ["... (truncated)"] else . end | join("\n")),
  ""
'

# ── Section 3: top-level reviews with a body ──────────────────────────────
REVIEWS=$(gh api "repos/$REPO/pulls/$PR_NUMBER/reviews" --paginate \
    | jq -s 'add // []')
REVIEWS_WITH_BODY=$(echo "$REVIEWS" | jq '[.[] | select((.body // "") != "")]')
REVIEW_COUNT=$(echo "$REVIEWS_WITH_BODY" | jq 'length')

echo ""
echo "════════════════ TOP-LEVEL REVIEWS ($REVIEW_COUNT) ════════════════"
echo "$REVIEWS_WITH_BODY" | jq -r '
  .[] |
  "──────────────────────────────────────────────────",
  "Review ID: \(.id)  |  Author: \(.user.login)  |  State: \(.state)  |  Submitted: \(.submitted_at)",
  "",
  (.body | split("\n") | if length > 10 then .[:10] + ["... (truncated)"] else . end | join("\n")),
  ""
'

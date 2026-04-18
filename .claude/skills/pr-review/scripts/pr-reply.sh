#!/usr/bin/env bash
set -euo pipefail

# Reply to a PR review comment, optionally resolve its thread.
# Usage: pr-reply.sh [--repo OWNER/REPO] [--resolve] PR_NUMBER COMMENT_ID "body"

USAGE='Usage: pr-reply.sh [--repo OWNER/REPO] [--resolve] PR_NUMBER COMMENT_ID "body"'
REPO=""
RESOLVE=false

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
        --resolve) RESOLVE=true; shift ;;
        *) break ;;
    esac
done

PR_NUMBER="${1:?$USAGE}"
COMMENT_ID="${2:?Missing COMMENT_ID}"
BODY="${3:?Missing reply body}"

if [[ -z "$REPO" ]]; then
    REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
fi

OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

# Append signature
BODY="${BODY}

- Claude"

# Post reply
REPLY_URL=$(gh api "repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies" \
    -f body="$BODY" \
    --jq '.html_url')
echo "Replied: $REPLY_URL"

# Resolve thread if requested
if [[ "$RESOLVE" == true ]]; then
    # Walk paginated threads, matching COMMENT_ID against ANY comment in the
    # thread (not just the first), so reply-comment IDs resolve correctly.
    # Short-circuit as soon as we find a match.
    THREAD_QUERY='
        query($owner: String!, $name: String!, $number: Int!, $after: String) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
              reviewThreads(first: 100, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes {
                  id
                  comments(first: 100) {
                    nodes { databaseId }
                  }
                }
              }
            }
          }
        }'
    THREAD_ID=""
    AFTER=""
    while :; do
        if [[ -z "$AFTER" ]]; then
            PAGE=$(gh api graphql \
                -F owner="$OWNER" -F name="$NAME" -F number="$PR_NUMBER" \
                -F after=null -f query="$THREAD_QUERY")
        else
            PAGE=$(gh api graphql \
                -F owner="$OWNER" -F name="$NAME" -F number="$PR_NUMBER" \
                -F after="$AFTER" -f query="$THREAD_QUERY")
        fi
        FOUND=$(echo "$PAGE" | jq -r --argjson cid "$COMMENT_ID" '
            [.data.repository.pullRequest.reviewThreads.nodes[]
             | select(any(.comments.nodes[]; .databaseId == $cid))
             | .id] | first // empty')
        if [[ -n "$FOUND" ]]; then
            THREAD_ID="$FOUND"
            break
        fi
        HAS_NEXT=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
        [[ "$HAS_NEXT" == "true" ]] || break
        AFTER=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')
    done

    if [[ -n "$THREAD_ID" ]]; then
        RESOLVED=$(gh api graphql -f query="
          mutation { resolveReviewThread(input: {threadId: \"$THREAD_ID\"}) { thread { isResolved } } }
        " --jq '.data.resolveReviewThread.thread.isResolved')
        echo "Resolved: $RESOLVED (thread $THREAD_ID)"
    else
        echo "Warning: could not find thread for comment $COMMENT_ID"
    fi
fi

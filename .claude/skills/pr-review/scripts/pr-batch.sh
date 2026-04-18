#!/usr/bin/env bash
set -euo pipefail

# Batch reply to PR review comments from JSONL on stdin.
# Each line: {"comment_id": 123, "body": "reply text"}
# Usage: pr-batch.sh [--repo OWNER/REPO] [--resolve] PR_NUMBER < input.jsonl

USAGE="Usage: pr-batch.sh [--repo OWNER/REPO] [--resolve] PR_NUMBER < input.jsonl"
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

if [[ -z "$REPO" ]]; then
    REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE_FLAG=""
if [[ "$RESOLVE" == true ]]; then
    RESOLVE_FLAG="--resolve"
fi

SUCCESS=0
FAIL=0

while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Use jq -e so non-JSON or missing-field lines surface a clear SKIP
    # instead of aborting the whole batch under `set -e`.
    if ! COMMENT_ID=$(jq -er '.comment_id' <<<"$line" 2>/dev/null); then
        echo "SKIP: invalid comment_id in line: $line"
        ((FAIL++)) || true
        continue
    fi
    if ! BODY=$(jq -er '.body' <<<"$line" 2>/dev/null); then
        echo "SKIP: invalid body in line: $line"
        ((FAIL++)) || true
        continue
    fi

    echo "--- Comment $COMMENT_ID ---"
    if bash "$SCRIPT_DIR/pr-reply.sh" --repo "$REPO" $RESOLVE_FLAG "$PR_NUMBER" "$COMMENT_ID" "$BODY"; then
        ((SUCCESS++)) || true
    else
        echo "FAILED: comment $COMMENT_ID"
        ((FAIL++)) || true
    fi
done

echo ""
echo "Done: $SUCCESS succeeded, $FAIL failed"

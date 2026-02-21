#!/usr/bin/env bash
set -euo pipefail

# Tiny helper to test DM flow end-to-end.
# Usage:
#   scripts/test_dm.sh <name-or-alias> [message]
#
# Example:
#   scripts/test_dm.sh gg "ping from dm test"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ $# -lt 1 ]]; then
    echo "Usage: scripts/test_dm.sh <name-or-alias> [message]" >&2
    exit 1
fi

TARGET_NAME="$1"
MESSAGE="${2:-ping from dm test}"

if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
fi

tmp_file="$(mktemp -t vibeline-dm-test.XXXXXX.txt)"
trap 'rm -f "$tmp_file"' EXIT

{
    echo "Hey $TARGET_NAME"
    echo
    echo "$MESSAGE"
} > "$tmp_file"

echo "Testing DM to '$TARGET_NAME' using transcript: $tmp_file" >&2
"$ROOT_DIR/scripts/dm.sh" "$tmp_file"

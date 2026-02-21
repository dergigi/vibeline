#!/usr/bin/env bash
set -euo pipefail

# Tiny helper to test DM flow end-to-end.
# Usage:
#   scripts/test_dm.sh [--quick|-q] <name-or-alias> [message]
#
# Example:
#   scripts/test_dm.sh gg "ping from dm test"
#   scripts/test_dm.sh --quick gg "ping from dm test"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

QUICK_MODE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --quick|-q)
            QUICK_MODE=1
            shift
            ;;
        --help|-h)
            echo "Usage: scripts/test_dm.sh [--quick|-q] <name-or-alias> [message]" >&2
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

if [[ $# -lt 1 ]]; then
    echo "Usage: scripts/test_dm.sh [--quick|-q] <name-or-alias> [message]" >&2
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
if [[ "$QUICK_MODE" -eq 1 ]]; then
    RELAYS="wss://relay.damus.io wss://nos.lol"
    export RELAYS
    echo "Quick mode enabled: using RELAYS='$RELAYS'" >&2
fi
"$ROOT_DIR/scripts/dm.sh" "$tmp_file"

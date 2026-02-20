#!/usr/bin/env bash
#
# dm_agent.sh — Send a transcript to a matched agent via NIP-17 DM (gift-wrapped)
#
# Usage: dm_agent.sh <transcript_file>
#
# Env vars:
#   NOSTR_SECRET_KEY  — sender's nsec/hex secret key (required)
#   AGENTS_FILE       — path to AGENTS.txt (default: AGENTS.txt)
#
# AGENTS.txt format (one agent per line):
#   name|alias1|alias2, npub1...
#
# Requires: nak (https://github.com/fiatjaf/nak)
#
set -euo pipefail

TRANSCRIPT_FILE="${1:?Usage: dm_agent.sh <transcript_file>}"
AGENTS_FILE="${AGENTS_FILE:-AGENTS.txt}"

if [[ ! -f "$TRANSCRIPT_FILE" ]]; then
    echo "Error: Transcript file not found: $TRANSCRIPT_FILE" >&2
    exit 1
fi

if [[ ! -f "$AGENTS_FILE" ]]; then
    echo "Error: Agents file not found: $AGENTS_FILE" >&2
    exit 1
fi

if [[ -z "${NOSTR_SECRET_KEY:-}" ]]; then
    echo "Error: NOSTR_SECRET_KEY not set" >&2
    exit 1
fi

if ! command -v nak &>/dev/null; then
    echo "Error: nak not found. Install from https://github.com/fiatjaf/nak" >&2
    exit 1
fi

TRANSCRIPT=$(cat "$TRANSCRIPT_FILE")
TRANSCRIPT_LOWER=$(echo "$TRANSCRIPT" | tr '[:upper:]' '[:lower:]')

# Scan AGENTS.txt for first matching name
MATCHED_NPUB=""
MATCHED_NAME=""

while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    # Split on comma: names part, npub part
    names_part="${line%%,*}"
    npub_part="${line##*,}"
    npub_part="$(echo "$npub_part" | xargs)"  # trim whitespace

    # Check each name/alias
    IFS='|' read -ra names <<< "$names_part"
    for name in "${names[@]}"; do
        name="$(echo "$name" | xargs | tr '[:upper:]' '[:lower:]')"  # trim + lowercase
        if echo "$TRANSCRIPT_LOWER" | grep -qiw "$name"; then
            MATCHED_NPUB="$npub_part"
            MATCHED_NAME="$name"
            break 2
        fi
    done
done < "$AGENTS_FILE"

if [[ -z "$MATCHED_NPUB" ]]; then
    echo "No agent match found in transcript"
    exit 0
fi

echo "Matched agent: $MATCHED_NAME -> $MATCHED_NPUB"

# Decode npub to hex for nak
RECIPIENT_HEX=$(nak decode "$MATCHED_NPUB" 2>/dev/null | jq -r '.')

if [[ -z "$RECIPIENT_HEX" || "$RECIPIENT_HEX" == "null" ]]; then
    echo "Error: Failed to decode npub: $MATCHED_NPUB" >&2
    exit 1
fi

# NIP-17 DM pipeline:
# 1. Create kind 14 rumor (DM content) with p-tag for recipient
# 2. Gift-wrap it (creates kind 13 seal -> kind 1059 gift wrap)
# 3. Publish the gift wrap to DM relays
nak event -k 14 -c "$TRANSCRIPT" --tag p="$RECIPIENT_HEX" |
    nak gift wrap --sec "$NOSTR_SECRET_KEY" -p "$MATCHED_NPUB" |
    nak event wss://auth.nostr1.com wss://relay.damus.io wss://nos.lol

echo "NIP-17 DM sent to $MATCHED_NAME ($MATCHED_NPUB)"

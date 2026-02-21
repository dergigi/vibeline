#!/usr/bin/env bash
#
# dm.sh — Send a transcript via NIP-17 DM (gift-wrapped) to a matched contact
#
# Usage: dm.sh <transcript_file>
#
# Looks for "Hey <name>" in the transcript, then checks if <name> exists
# in contacts.txt. If found, sends the transcript via NIP-17 gift-wrapped DM.
# If the name isn't in contacts.txt, exits gracefully.
#
# Env vars:
#   DM_NSEC        — sender's nsec/hex secret key (required)
#   CONTACTS_FILE  — path to contacts file (default: ~/.vibeline/contacts.txt)
#
# contacts.txt format (one contact per line):
#   name|alias1|alias2, npub1...
#
# Requires: nak (https://github.com/fiatjaf/nak)
#
set -euo pipefail

TRANSCRIPT_FILE="${1:?Usage: dm.sh <transcript_file>}"
CONTACTS_FILE="${CONTACTS_FILE:-$HOME/.vibeline/contacts.txt}"

if [[ ! -f "$TRANSCRIPT_FILE" ]]; then
    echo "Error: Transcript file not found: $TRANSCRIPT_FILE" >&2
    exit 1
fi

if [[ ! -f "$CONTACTS_FILE" ]]; then
    echo "Error: Contacts file not found: $CONTACTS_FILE" >&2
    exit 1
fi

if [[ -z "${DM_NSEC:-}" ]]; then
    echo "Error: DM_NSEC not set" >&2
    exit 1
fi

if ! command -v nak &>/dev/null; then
    echo "Error: nak not found. Install from https://github.com/fiatjaf/nak" >&2
    exit 1
fi

TRANSCRIPT=$(cat "$TRANSCRIPT_FILE")

# Extract the name right after "hey" (case-insensitive, no PCRE for macOS compat)
HEY_NAME=$(echo "$TRANSCRIPT" | sed -n 's/.*[Hh][Ee][Yy][[:space:]][[:space:]]*\([A-Za-z][A-Za-z]*\).*/\1/p' | head -1 | tr '[:upper:]' '[:lower:]')

if [[ -z "$HEY_NAME" ]]; then
    echo "No 'Hey <name>' pattern found in transcript" >&2
    exit 0
fi

echo "Found: Hey $HEY_NAME" >&2

# Look up the name in contacts file
MATCHED_NPUB=""

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
        if [[ "$name" == "$HEY_NAME" ]]; then
            MATCHED_NPUB="$npub_part"
            break 2
        fi
    done
done < "$CONTACTS_FILE"

if [[ -z "$MATCHED_NPUB" ]]; then
    echo "Name '$HEY_NAME' not found in $CONTACTS_FILE — skipping" >&2
    exit 0
fi

echo "Matched agent: $HEY_NAME -> $MATCHED_NPUB" >&2

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
    nak gift wrap --sec "$DM_NSEC" -p "$MATCHED_NPUB" |
    nak event ${RELAYS}

echo "NIP-17 DM sent to $HEY_NAME ($MATCHED_NPUB)" >&2

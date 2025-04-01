#!/bin/bash

# Directory paths
VOICE_MEMO_DIR="VoiceMemos"
TRANSCRIPT_DIR="$VOICE_MEMO_DIR/transcripts"

# Get resolved paths
RESOLVED_VOICE_MEMO_DIR=$(readlink -f "$VOICE_MEMO_DIR")
RESOLVED_TRANSCRIPT_DIR=$(readlink -f "$TRANSCRIPT_DIR")

# Print debug info about symlinks
echo "Directory information:"
echo "Voice memo dir: $(pwd)/$VOICE_MEMO_DIR"
echo "Is symlink: $([ -L "$VOICE_MEMO_DIR" ] && echo "yes" || echo "no")"
if [ -L "$VOICE_MEMO_DIR" ]; then
    echo "Resolves to: $RESOLVED_VOICE_MEMO_DIR"
fi

# Check if directories exist
if [ ! -d "$RESOLVED_VOICE_MEMO_DIR" ]; then
    echo "Error: $RESOLVED_VOICE_MEMO_DIR directory does not exist"
    exit 1
fi

if [ ! -d "$RESOLVED_TRANSCRIPT_DIR" ]; then
    echo "Error: $RESOLVED_TRANSCRIPT_DIR directory does not exist"
    exit 1
fi

# Function to process voice memos
process_voice_memo() {
    echo "New voice memo detected!"
    ./process_voice_memos.sh
}

# Function to process transcripts
process_transcript() {
    echo "New transcript detected!"
    ./summarize_transcripts.py
}

echo "Starting file watcher..."
echo "Watching for changes in:"
echo "- Voice memos: $RESOLVED_VOICE_MEMO_DIR"
echo "- Transcripts: $RESOLVED_TRANSCRIPT_DIR"
echo "Press Ctrl+C to stop..."

# Monitor both directories in parallel
# -L flag enables following symlinks
(
    fswatch -L -o "$RESOLVED_VOICE_MEMO_DIR" | while read -r f; do
        if [[ "$f" =~ \.m4a$ ]]; then
            process_voice_memo
        fi
    done
) &

(
    fswatch -L -o "$RESOLVED_TRANSCRIPT_DIR" | while read -r f; do
        if [[ "$f" =~ \.txt$ ]]; then
            process_transcript
        fi
    done
) &

# Wait for Ctrl+C
wait 
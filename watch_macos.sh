#!/bin/bash

# Directory paths
VOICE_MEMO_DIR="VoiceMemos"
TRANSCRIPT_DIR="$VOICE_MEMO_DIR/transcripts"

# Check if directories exist
if [ ! -d "$VOICE_MEMO_DIR" ]; then
    echo "Error: $VOICE_MEMO_DIR directory does not exist"
    exit 1
fi

if [ ! -d "$TRANSCRIPT_DIR" ]; then
    echo "Error: $TRANSCRIPT_DIR directory does not exist"
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
echo "- Voice memos: $VOICE_MEMO_DIR"
echo "- Transcripts: $TRANSCRIPT_DIR"
echo "Press Ctrl+C to stop..."

# Monitor both directories in parallel
# -L flag enables following symlinks
(
    fswatch -L -o "$VOICE_MEMO_DIR" | while read -r f; do
        if [[ "$f" =~ \.m4a$ ]]; then
            process_voice_memo
        fi
    done
) &

(
    fswatch -L -o "$TRANSCRIPT_DIR" | while read -r f; do
        if [[ "$f" =~ \.txt$ ]]; then
            process_transcript
        fi
    done
) &

# Wait for Ctrl+C
wait 
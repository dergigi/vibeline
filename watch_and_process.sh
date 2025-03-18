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
(
    inotifywait -m -e create -e moved_to "$VOICE_MEMO_DIR" | while read -r directory events filename; do
        if [[ "$filename" =~ \.m4a$ ]]; then
            process_voice_memo
        fi
    done
) &

(
    inotifywait -m -e create -e moved_to "$TRANSCRIPT_DIR" | while read -r directory events filename; do
        if [[ "$filename" =~ \.txt$ ]]; then
            process_transcript
        fi
    done
) &

# Wait for Ctrl+C
wait 
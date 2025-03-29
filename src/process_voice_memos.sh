#!/bin/bash

# Set the directory paths
VOICE_MEMO_DIR="VoiceMemos"
TRANSCRIPT_DIR="$VOICE_MEMO_DIR/transcripts"

# Check if the voice memo directory exists
if [ ! -d "$VOICE_MEMO_DIR" ]; then
    echo "Error: $VOICE_MEMO_DIR directory does not exist"
    exit 1
fi

# Create transcripts directory if it doesn't exist
mkdir -p "$TRANSCRIPT_DIR"

# Check if there are any m4a files in the directory
if ! ls "$VOICE_MEMO_DIR"/*.m4a 1> /dev/null 2>&1; then
    echo "No m4a files found in $VOICE_MEMO_DIR"
    exit 0
fi

# Activate the virtual environment
source vibenv/bin/activate

# Process each m4a file
for file in "$VOICE_MEMO_DIR"/*.m4a; do
    if [ -f "$file" ]; then
        # Get the filename without the path and extension
        filename=$(basename "$file" .m4a)
        transcript_file="$TRANSCRIPT_DIR/$filename.txt"
        
        # Only process if transcript doesn't exist
        if [ ! -f "$transcript_file" ]; then
            echo "Processing file: $file"
            echo "Transcribing audio..."
            
            # Use whisper to transcribe the audio with tiny model
            whisper "$file" --model tiny --output_dir "$TRANSCRIPT_DIR" --output_format txt
            
            echo "Transcription saved to: $transcript_file"
            echo "----------------------------------------"
        else
            echo "Skipping $file - transcript already exists"
        fi
    fi
done

# Deactivate the virtual environment
deactivate 
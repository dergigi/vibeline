#!/bin/bash

# Check if a file argument was provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <voice_memo_file> [--force]"
    exit 1
fi

# Get the input file
input_file="$1"
force=false

# Check for force flag
if [ $# -eq 2 ] && [ "$2" = "--force" ]; then
    force=true
fi

# Check if the input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File $input_file does not exist"
    exit 1
fi

# Set the directory paths
VOICE_MEMO_DIR="VoiceMemos"
TRANSCRIPT_DIR="$VOICE_MEMO_DIR/transcripts"

# Create transcripts directory if it doesn't exist
mkdir -p "$TRANSCRIPT_DIR"

# Get the filename without the path and extension
filename=$(basename "$input_file" .m4a)
transcript_file="$TRANSCRIPT_DIR/$filename.txt"

# Process if transcript doesn't exist or force flag is set
if [ ! -f "$transcript_file" ] || [ "$force" = true ]; then
    echo "Processing file: $input_file"
    echo "Transcribing audio..."
    
    # Activate the virtual environment
    source vibenv/bin/activate
    
    # Use whisper to transcribe the audio with base.en model
    whisper "$input_file" --model base.en --output_dir "$TRANSCRIPT_DIR" --output_format txt
    
    # Deactivate the virtual environment
    deactivate
    
    echo "Transcription saved to: $transcript_file"
    echo "----------------------------------------"
else
    echo "Skipping $input_file - transcript already exists"
fi 
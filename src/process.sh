#!/bin/bash

# Check if a file argument was provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <voice_memo_file>"
    exit 1
fi

# Get the input file
input_file="$1"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File $input_file does not exist"
    exit 1
fi

# Set the directory paths
VOICE_MEMO_DIR="VoiceMemos"
TRANSCRIPT_DIR="$VOICE_MEMO_DIR/transcripts"

# Get the filename without the path and extension
filename=$(basename "$input_file" .m4a)
transcript_file="$TRANSCRIPT_DIR/$filename.txt"

echo "Processing voice memo: $input_file"
echo "----------------------------------------"

# Step 1: Transcribe
echo "Step 1: Transcribing audio..."
./transcribe.sh "$input_file"

# Check if transcription was successful
if [ ! -f "$transcript_file" ]; then
    echo "Error: Transcription failed"
    exit 1
fi

# Step 2: Summarize
echo "Step 2: Generating summary..."
./summarize.sh "$transcript_file"

# Step 3: Extract content
echo "Step 3: Extracting content..."
./extract.sh "$transcript_file"

echo "----------------------------------------"
echo "Processing complete!" 
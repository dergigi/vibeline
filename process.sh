#!/bin/bash

# Parse arguments
force_flag=""
while getopts "f" opt; do
    case $opt in
        f) force_flag="-f" ;;
    esac
done
shift $((OPTIND-1))

# Check if a file argument was provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 [-f] <voice_memo_file>"
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
VOICE_MEMOS_DIR="${VOICE_MEMOS_DIR:-VoiceMemos}"
TRANSCRIPT_DIR="$VOICE_MEMOS_DIR/transcripts"

# Get the filename without the path and extension
filename=$(basename "$input_file" .m4a)
transcript_file="$TRANSCRIPT_DIR/$filename.txt"

echo "Processing voice memo: $input_file"
echo "----------------------------------------"

# Step 1: Transcribe using the transcription plugin
echo "Step 1: Transcribing audio..."
./extract.sh $force_flag "$input_file"

# Check if transcription was successful
if [ ! -f "$transcript_file" ]; then
    echo "Error: Transcription failed"
    exit 1
fi

# Step 2: Extract content (including summary)
echo "Step 2: Extracting content..."
./extract.sh $force_flag "$transcript_file"

# Step 3: Post-process action items
echo "Step 3: Post-processing action items..."
./post_process.sh

echo "----------------------------------------"
echo "Processing complete!"

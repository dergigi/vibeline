#!/bin/bash

# Parse arguments
force_flag=""
while getopts "f" opt; do
    case $opt in
        f) force_flag="--force" ;;
    esac
done
shift $((OPTIND-1))

# Check if a file argument was provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 [-f] <audio_file>"
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

# Create transcripts directory if it doesn't exist
mkdir -p "$TRANSCRIPT_DIR"

# Get the filename without the path and extension
filename=$(basename "$input_file" .m4a)
transcript_file="$TRANSCRIPT_DIR/$filename.txt"

# Check if transcript already exists
if [ -f "$transcript_file" ] && [ -z "$force_flag" ]; then
    echo "Transcript already exists: $transcript_file (use -f to overwrite)"
    exit 0
fi

echo "Processing file: $input_file"
echo "Transcribing audio..."

# Activate the virtual environment
source vibenv/bin/activate

# Use whisper to transcribe the audio with base.en model
whisper "$input_file" --model base.en --output_dir "$TRANSCRIPT_DIR" --output_format {txt, srt}

# Deactivate the virtual environment
deactivate

echo "Transcription saved to: $transcript_file"
echo "----------------------------------------" 
#!/bin/bash

# Parse arguments
force_flag=""
audio_file=""
while getopts "f" opt; do
    case $opt in
        f) force_flag="--force" ;;
    esac
done
shift $((OPTIND-1))

# Check if a file argument was provided
if [ $# -lt 1 ] || [ $# -gt 2 ]; then
    echo "Usage: $0 [-f] <transcript_file> [audio_file]"
    exit 1
fi

# Get the input file
input_file="$1"
audio_file="$2"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File $input_file does not exist"
    exit 1
fi

# Activate the virtual environment
[ -d "vibenv" ] && source vibenv/bin/activate

# Run the Python script with force flag if provided
if [ -n "$audio_file" ]; then
    python src/extract.py $force_flag "$input_file" --audio-file "$audio_file"
else
    python src/extract.py $force_flag "$input_file"
fi

# Deactivate the virtual environment
[ -d "vibenv" ] && deactivate

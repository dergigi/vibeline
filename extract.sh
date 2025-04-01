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
    echo "Usage: $0 [-f] <transcript_file>"
    exit 1
fi

# Get the input file
input_file="$1"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File $input_file does not exist"
    exit 1
fi

# Activate the virtual environment
source vibenv/bin/activate

# Run the Python script with force flag if provided
python src/extract.py $force_flag "$input_file"

# Deactivate the virtual environment
deactivate 
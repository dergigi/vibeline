#!/bin/bash

# Parse arguments
force_flag=""
while getopts "f" opt; do
    case $opt in
        f) force_flag="-f" ;;
    esac
done
shift $((OPTIND-1))

# Activate virtual environment
[ -d "vibenv" ] && source vibenv/bin/activate

echo "Processing all voice memos..."
for file in VoiceMemos/*.m4a; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        ./process.sh $force_flag "$file"
        echo "----------------------------------------"
    fi
done

echo "Done! All voice memos have been processed."

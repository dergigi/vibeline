#!/bin/bash

# Activate virtual environment
source vibenv/bin/activate

# Parse command line arguments
FORCE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--force) FORCE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Build command with optional force flag
CMD="python src/watch_voice_memos.py"
if [ "$FORCE" = true ]; then
    CMD="$CMD --force"
fi

echo "Starting voice memo watcher..."
echo "Press Ctrl+C to stop"
echo ""

# Run the watcher
$CMD 
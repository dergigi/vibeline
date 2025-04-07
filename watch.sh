#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "Warning: .env file not found"
fi

# Activate virtual environment
[ -d "vibenv" ] && source vibenv/bin/activate

# Run the watch script
python src/watch_voice_memos.py

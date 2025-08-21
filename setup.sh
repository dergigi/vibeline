#!/bin/bash

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg is not installed. Please install it using:"
    echo "brew install ffmpeg"
    exit 1
fi

# Check for whisper
if ! command -v whisper &> /dev/null; then
    echo "whisper is not installed. Please install it using:"
    echo "brew install openai-whisper"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "vibenv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv vibenv
fi

# Activate virtual environment
echo "Activating virtual environment..."
[ -d "vibenv" ] && source vibenv/bin/activate

# Install requirements
echo "Installing requirements..."
pip3 install -r requirements.txt

echo "Setup complete! Virtual environment is activated and requirements are installed."

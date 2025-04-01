#!/bin/bash

# Check if a file argument was provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <transcript_file>"
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
SUMMARY_DIR="$VOICE_MEMO_DIR/summaries"

# Create summaries directory if it doesn't exist
mkdir -p "$SUMMARY_DIR"

# Get the filename without the path and extension
filename=$(basename "$input_file" .txt)
summary_file="$SUMMARY_DIR/${filename}_summary.txt"

echo "Processing transcript: $input_file"
echo "Generating summary..."

# Activate the virtual environment
source vibenv/bin/activate

# Run the Python script to generate the summary
python -c "
import ollama
from pathlib import Path

def generate_summary(transcript_text: str) -> str:
    prompt_dir = Path('prompts')
    with open(prompt_dir / 'summary.md', 'r', encoding='utf-8') as f:
        prompt_template = f.read()
    
    prompt = prompt_template.format(transcript=transcript_text)
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    return response['message']['content'].strip()

# Read transcript
with open('$input_file', 'r', encoding='utf-8') as f:
    transcript_text = f.read()

# Generate and save summary
summary = generate_summary(transcript_text)
with open('$summary_file', 'w', encoding='utf-8') as f:
    f.write(summary)
"

# Deactivate the virtual environment
deactivate

echo "Summary saved to: $summary_file"
echo "----------------------------------------" 
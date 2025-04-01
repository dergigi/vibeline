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
DRAFT_DIR="$VOICE_MEMO_DIR/drafts"
PROMPT_DIR="$VOICE_MEMO_DIR/prompts"

# Create output directories if they don't exist
mkdir -p "$DRAFT_DIR"
mkdir -p "$PROMPT_DIR"

echo "Processing transcript: $input_file"
echo "Extracting content..."

# Activate the virtual environment
source vibenv/bin/activate

# Run the Python script to extract content
python -c "
import ollama
import re
from pathlib import Path
import time

def determine_content_type(transcript_text: str) -> str:
    text = transcript_text.lower()
    
    if re.search(r'\bblog post\b', text) or re.search(r'\bdraft\b', text):
        return 'blog_post'
    elif re.search(r'\bidea\b', text) and re.search(r'\bapp\b', text):
        return 'idea_app'
    return 'default'

def generate_additional_content(content_type: str, transcript_text: str) -> str:
    prompt_dir = Path('prompts')
    with open(prompt_dir / f'{content_type}.md', 'r', encoding='utf-8') as f:
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

# Determine content type and generate content if needed
content_type = determine_content_type(transcript_text)
if content_type != 'default':
    print(f'  Generating {content_type} content...')
    additional_content = generate_additional_content(content_type, transcript_text)
    
    # Save to appropriate directory with timestamp
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    filename = Path('$input_file').stem
    if content_type == 'blog_post':
        output_file = Path('$DRAFT_DIR') / f'{filename}_{timestamp}.md'
    else:  # idea_app
        output_file = Path('$PROMPT_DIR') / f'{filename}_{timestamp}.md'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(additional_content)
    print(f'  Content saved to: {output_file}')
else:
    print('  No blog post or app idea content detected')
"

# Deactivate the virtual environment
deactivate

echo "----------------------------------------" 
#!/usr/bin/env python3

import sys
import ollama
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
OLLAMA_MODEL = os.getenv("OLLAMA_SUMMARIZE_MODEL", "llama2")
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

def load_summary_plugin() -> str:
    """Load the summary plugin template."""
    plugin_dir = Path("plugins")
    with open(plugin_dir / "summary.all.md", 'r', encoding='utf-8') as f:
        return f.read()

def generate_summary(transcript_text: str) -> str:
    """Generate a summary of the transcript."""
    prompt_template = load_summary_plugin()
    prompt = prompt_template.format(transcript=transcript_text)
    
    response = ollama.chat(model=OLLAMA_MODEL, messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    return response['message']['content'].strip()

def main():
    if len(sys.argv) != 2:
        print("Usage: python summarize.py <transcript_file>")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    if not input_file.exists():
        print(f"Error: File {input_file} does not exist")
        sys.exit(1)
    
    # Set up directory paths
    voice_memo_dir = Path(VOICE_MEMOS_DIR)
    summary_dir = voice_memo_dir / "summarys"  # Using the same convention as other plugins
    summary_dir.mkdir(parents=True, exist_ok=True)
    
    # Get the filename without the path and extension
    filename = input_file.stem
    summary_file = summary_dir / f"{filename}_summary.txt"
    
    print(f"Processing transcript: {input_file}")
    print("Generating summary...")
    
    # Read transcript and generate summary
    with open(input_file, 'r', encoding='utf-8') as f:
        transcript_text = f.read()
    
    summary = generate_summary(transcript_text)
    
    # Save summary
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary)
    
    print(f"Summary saved to: {summary_file}")
    print("----------------------------------------")

if __name__ == "__main__":
    main() 
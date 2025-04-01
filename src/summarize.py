#!/usr/bin/env python3

import sys
import ollama
from pathlib import Path

def generate_summary(transcript_text: str) -> str:
    """Generate a summary of the transcript."""
    prompt_dir = Path("prompts")
    with open(prompt_dir / "summary.md", 'r', encoding='utf-8') as f:
        prompt_template = f.read()
    
    prompt = prompt_template.format(transcript=transcript_text)
    response = ollama.chat(model='llama2', messages=[
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
    voice_memo_dir = Path("VoiceMemos")
    summary_dir = voice_memo_dir / "summaries"
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
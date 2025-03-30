#!/usr/bin/env python3

import os
import sys
from pathlib import Path
import ollama
import time
import re

def read_transcript(transcript_file: Path) -> str:
    """Read the content of a transcript file."""
    with open(transcript_file, 'r', encoding='utf-8') as f:
        return f.read()

def load_prompt_template(transcript_text: str) -> str:
    """Load the appropriate prompt template based on transcript content."""
    prompt_dir = Path("prompts")
    
    # Convert to lowercase for case-insensitive matching
    text = transcript_text.lower()
    
    # Check transcript content to determine appropriate prompt using regex word boundaries
    if re.search(r'\bblog post\b', text):
        # "I want to write a blog post"
        prompt_file = prompt_dir / "blog_post.md"
    elif re.search(r'\bidea\b', text) and re.search(r'\bapp\b', text):
        # "I have an idea for an app"
        prompt_file = prompt_dir / "idea_app.md"
    else:
        prompt_file = prompt_dir / "default.md"
    
    with open(prompt_file, 'r', encoding='utf-8') as f:
        return f.read()

def process_transcript(transcript_text: str) -> str:
    """Process a transcript using LLaMA to generate a summary."""
    # Load the appropriate prompt template
    prompt_template = load_prompt_template(transcript_text)
    
    # Format the prompt with the transcript
    prompt = prompt_template.format(transcript=transcript_text)
    
    # Use Ollama to generate the summary
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    
    # Debug print
    print("Response structure:", response)
    
    # Extract the content from the response
    return response['message']['content'].strip()

def save_summary(summary: str, output_file: Path) -> None:
    """Save the summary to a file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(summary)

def count_words(text: str) -> int:
    """Count the number of words in a text string."""
    return len(text.split())

def main():
    transcript_dir = Path("VoiceMemos/transcripts")
    summary_dir = Path("VoiceMemos/summaries")
    
    # Create summaries directory if it doesn't exist
    summary_dir.mkdir(parents=True, exist_ok=True)
    
    # Get list of all transcript files
    transcript_files = list(transcript_dir.glob("*.txt"))
    total_files = len(transcript_files)
    
    print(f"Found {total_files} transcript(s) to process")
    
    # Process all transcript files
    for idx, transcript_file in enumerate(transcript_files, 1):
        print(f"\nProcessing {transcript_file.name} ({idx}/{total_files})...")
        
        # Skip if summary already exists
        summary_file = summary_dir / f"{transcript_file.stem}_summary.txt"
        if summary_file.exists():
            print("  Summary already exists, skipping...")
            continue
        
        try:
            # Read transcript
            transcript_text = read_transcript(transcript_file)
            word_count = count_words(transcript_text)
            print(f"  Read transcript ({len(transcript_text)} characters, {word_count} words)")
            
            # Skip if transcript is too short
            if word_count <= 210:
                print("  Transcript is too short (≤210 words), skipping summary creation")
                continue
            
            # Generate summary
            summary = process_transcript(transcript_text)
            
            # Save summary
            save_summary(summary, summary_file)
            print(f"  Summary saved to {summary_file}")
            
            # Add a small delay between files to avoid overloading
            if idx < total_files:
                time.sleep(1)
                
        except Exception as e:
            print(f"  Failed to process {transcript_file.name}")
            print(f"  Error: {str(e)}")
            continue
    
    print("\nDone! All transcripts processed.")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3

import os
import sys
from pathlib import Path
import ollama

def read_transcript(transcript_file: Path) -> str:
    """Read the content of a transcript file."""
    with open(transcript_file, 'r', encoding='utf-8') as f:
        return f.read()

def load_prompt_template(transcript_text: str) -> str:
    """Load the appropriate prompt template based on transcript content."""
    prompt_dir = Path("prompts")
    
    # Check if transcript contains app-related content
    if "idea" in transcript_text.lower() and "app" in transcript_text.lower():
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

def main():
    transcript_dir = Path("VoiceMemos/transcripts")
    summary_dir = Path("VoiceMemos/summaries")
    
    # Create summaries directory if it doesn't exist
    summary_dir.mkdir(parents=True, exist_ok=True)
    
    # Process all transcript files
    for transcript_file in transcript_dir.glob("*.txt"):
        print(f"Processing {transcript_file.name}...")
        
        # Read transcript
        transcript_text = read_transcript(transcript_file)
        
        # Generate summary
        try:
            summary = process_transcript(transcript_text)
            
            # Save summary
            summary_file = summary_dir / f"{transcript_file.stem}_summary.txt"
            save_summary(summary, summary_file)
            
            print(f"Summary saved to {summary_file}")
        except Exception as e:
            print(f"Error processing {transcript_file.name}: {str(e)}")
            continue

if __name__ == "__main__":
    main() 
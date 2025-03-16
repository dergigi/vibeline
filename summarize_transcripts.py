#!/usr/bin/env python3

import os
import sys
from pathlib import Path
import ollama

def read_transcript(transcript_file: Path) -> str:
    """Read the content of a transcript file."""
    with open(transcript_file, 'r', encoding='utf-8') as f:
        return f.read()

def process_transcript(transcript_text: str) -> str:
    """Process a transcript using LLaMA to generate a summary."""
    prompt = f"""Please provide a concise summary of the following transcript. 
Focus on the main topics, key points, and any action items or decisions mentioned.
Keep the summary clear and well-structured.

Transcript:
{transcript_text}

Summary:"""
    
    # Use Ollama to generate the summary
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    
    return response['message']['content']

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
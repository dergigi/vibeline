#!/usr/bin/env python3

import os
import sys
from pathlib import Path
import ollama
import time

def read_transcript(transcript_file: Path) -> str:
    """Read the content of a transcript file."""
    with open(transcript_file, 'r', encoding='utf-8') as f:
        return f.read()

def process_transcript(transcript_text: str) -> str:
    """Process a transcript using Mistral to generate a summary."""
    prompt = f"""Please provide a concise summary of the following transcript. 
Focus on the main topics, key points, and any action items or decisions mentioned.
Keep the summary clear and well-structured.

Transcript:
{transcript_text}

Please structure the summary as follows:
1. Main Topics
2. Key Points
3. Action Items/Decisions (if any)
4. Additional Notes (if relevant)

Summary:"""
    
    # Use Ollama with Mistral model to generate the summary
    try:
        print("  Generating summary...")
        response = ollama.chat(model='mistral', messages=[
            {
                'role': 'user',
                'content': prompt
            }
        ])
        return response['message']['content']
    except Exception as e:
        print(f"  Error during summarization: {str(e)}")
        raise

def save_summary(summary: str, output_file: Path) -> None:
    """Save the summary to a file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(summary)

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
            print(f"  Read transcript ({len(transcript_text)} characters)")
            
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
#!/usr/bin/env python3

import os
import sys
from pathlib import Path
import ollama
import time
import re
from datetime import datetime

def read_transcript(transcript_file: Path) -> str:
    """Read the content of a transcript file."""
    with open(transcript_file, 'r', encoding='utf-8') as f:
        return f.read()

def load_prompt_template(template_name: str) -> str:
    """Load a prompt template by name."""
    prompt_dir = Path("prompts")
    prompt_file = prompt_dir / f"{template_name}.md"
    with open(prompt_file, 'r', encoding='utf-8') as f:
        return f.read()

def process_with_llama(prompt: str) -> str:
    """Process text using LLaMA to generate content."""
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    return response['message']['content'].strip()

def save_content(content: str, output_file: Path) -> None:
    """Save content to a file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

def count_words(text: str) -> int:
    """Count the number of words in a text string."""
    return len(text.split())

def determine_content_type(transcript_text: str) -> str:
    """Determine the type of content in the transcript."""
    text = transcript_text.lower()
    
    if re.search(r'\bblog post\b', text) or re.search(r'\bdraft\b', text):
        return "blog_post"
    elif re.search(r'\bidea\b', text) and re.search(r'\bapp\b', text):
        return "idea_app"
    return "default"

def generate_summary(transcript_text: str) -> str:
    """Generate a summary of the transcript."""
    prompt_template = load_prompt_template("summary")
    prompt = prompt_template.format(transcript=transcript_text)
    return process_with_llama(prompt)

def generate_additional_content(content_type: str, transcript_text: str, summary: str) -> str:
    """Generate additional content based on the content type."""
    prompt_template = load_prompt_template(content_type)
    prompt = prompt_template.format(transcript=transcript_text, summary=summary)
    return process_with_llama(prompt)

def main():
    transcript_dir = Path("VoiceMemos/transcripts")
    summary_dir = Path("VoiceMemos/summaries")
    draft_dir = Path("VoiceMemos/drafts")
    prompt_dir = Path("VoiceMemos/prompts")
    
    # Create necessary directories
    for directory in [summary_dir, draft_dir, prompt_dir]:
        directory.mkdir(parents=True, exist_ok=True)
    
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
                print("  Transcript is too short (≤210 words), skipping processing")
                continue
            
            # Generate summary
            print("  Generating summary...")
            summary = generate_summary(transcript_text)
            save_content(summary, summary_file)
            print(f"  Summary saved to {summary_file}")
            
            # Determine content type and generate additional content if needed
            content_type = determine_content_type(transcript_text)
            if content_type != "default":
                print(f"  Generating additional content for type: {content_type}")
                additional_content = generate_additional_content(content_type, transcript_text, summary)
                
                # Save to appropriate directory with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                if content_type == "blog_post":
                    output_file = draft_dir / f"{transcript_file.stem}_{timestamp}.md"
                else:  # idea_app
                    output_file = prompt_dir / f"{transcript_file.stem}_{timestamp}.md"
                
                save_content(additional_content, output_file)
                print(f"  Additional content saved to {output_file}")
            
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
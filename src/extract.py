#!/usr/bin/env python3

import sys
import ollama
import re
from pathlib import Path
import time

def determine_content_types(transcript_text: str) -> list[str]:
    """Determine the types of content in the transcript."""
    text = transcript_text.lower()
    content_types = []
    
    if re.search(r'\bblog post\b', text) or re.search(r'\bdraft\b', text):
        content_types.append("blog_post")
    if re.search(r'\bidea\b', text) and re.search(r'\bapp\b', text):
        content_types.append("idea_app")
    
    return content_types if content_types else ["default"]

def generate_additional_content(content_type: str, transcript_text: str, summary_text: str) -> str:
    """Generate additional content based on the content type."""
    plugin_dir = Path("plugins")
    with open(plugin_dir / f"{content_type}.md", 'r', encoding='utf-8') as f:
        prompt_template = f.read()
    
    prompt = prompt_template.format(transcript=transcript_text, summary=summary_text)
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    return response['message']['content'].strip()

def main():
    if len(sys.argv) != 2:
        print("Usage: python extract.py <transcript_file>")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    if not input_file.exists():
        print(f"Error: File {input_file} does not exist")
        sys.exit(1)
    
    # Set up directory paths
    voice_memo_dir = Path("VoiceMemos")
    draft_dir = voice_memo_dir / "drafts"
    prompt_dir = voice_memo_dir / "prompts"
    
    # Create output directories if they don't exist
    draft_dir.mkdir(parents=True, exist_ok=True)
    prompt_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Processing transcript: {input_file}")
    print("Extracting content...")
    
    # Read transcript
    with open(input_file, 'r', encoding='utf-8') as f:
        transcript_text = f.read()
    
    # Read summary if it exists
    summary_file = input_file.parent / f"{input_file.stem}_summary.txt"
    summary_text = ""
    if summary_file.exists():
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary_text = f.read()
    
    # Determine content types and generate content if needed
    content_types = determine_content_types(transcript_text)
    if "default" not in content_types:
        for content_type in content_types:
            print(f"  Generating {content_type} content...")
            additional_content = generate_additional_content(content_type, transcript_text, summary_text)
            
            # Save to appropriate directory with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = input_file.stem
            if content_type == "blog_post":
                output_file = draft_dir / f"{filename}_{timestamp}.md"
            else:  # idea_app
                output_file = prompt_dir / f"{filename}_{timestamp}.md"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(additional_content)
            print(f"  Content saved to: {output_file}")
    else:
        print("  No blog post or app idea content detected")
    
    print("----------------------------------------")

if __name__ == "__main__":
    main() 
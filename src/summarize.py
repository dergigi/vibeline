#!/usr/bin/env python3

import sys
import ollama
import os
from pathlib import Path
import inflect
from dotenv import load_dotenv
from plugin_manager import PluginManager

# Load environment variables
load_dotenv()

# Initialize inflect engine
p = inflect.engine()

# Configuration from environment variables
OLLAMA_MODEL = os.getenv("OLLAMA_SUMMARIZE_MODEL", "llama2")
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

def generate_summary(transcript_text: str, plugin_manager: PluginManager) -> str:
    """Generate a summary of the transcript using the summary plugin."""
    # Get the summary plugin
    summary_plugin = plugin_manager.get_plugin("summary")
    if not summary_plugin:
        raise ValueError("Summary plugin not found")
    
    prompt = summary_plugin.prompt.format(transcript=transcript_text)
    
    # Use plugin-specific model if specified, otherwise use default
    model = summary_plugin.model or OLLAMA_MODEL
    
    response = ollama.chat(model=model, messages=[
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
    
    # Load plugins
    plugin_manager = PluginManager(Path("plugins"))
    summary_plugin = plugin_manager.get_plugin("summary")
    if not summary_plugin:
        raise ValueError("Summary plugin not found")
    
    # Set up directory paths
    voice_memo_dir = Path(VOICE_MEMOS_DIR)
    summary_dir = voice_memo_dir / p.plural("summary")
    summary_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Processing transcript: {input_file}")
    print("Generating summary...")
    
    # Read transcript
    with open(input_file, 'r', encoding='utf-8') as f:
        transcript_text = f.read()
    
    # Generate summary
    summary = generate_summary(transcript_text, plugin_manager)
    
    # Save summary
    output_file = summary_dir / f"{input_file.stem}_summary{summary_plugin.output_extension}"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(summary)
    
    print(f"Summary saved to: {output_file}")
    print("----------------------------------------")

if __name__ == "__main__":
    main() 
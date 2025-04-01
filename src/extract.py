#!/usr/bin/env python3

import sys
import ollama
import re
import os
from pathlib import Path
import time
import inflect
from typing import List, Dict
from dotenv import load_dotenv
from plugin_manager import PluginManager, Plugin

# Load environment variables
load_dotenv()

# Initialize inflect engine
p = inflect.engine()

# Configuration from environment variables
OLLAMA_MODEL = os.getenv("OLLAMA_EXTRACT_MODEL", "llama2")
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

def determine_active_plugins(text: str, plugins: Dict[str, Plugin]) -> List[str]:
    """Determine which plugins should be run on this transcript."""
    active_plugins = set()  # Use a set to avoid duplicates
    
    for plugin_name, plugin in plugins.items():
        # Always include plugins with run: always
        if plugin.run == "always":
            active_plugins.add(plugin_name)
            continue
            
        # For matching plugins, check based on type (and/or)
        if plugin.run == "matching":
            words = plugin_name.split('_')
            if plugin.type == "or":
                if any(re.search(r'\b' + word + r'\b', text.lower()) for word in words):
                    active_plugins.add(plugin_name)
            else:  # and
                if all(re.search(r'\b' + word + r'\b', text.lower()) for word in words):
                    active_plugins.add(plugin_name)
    
    return list(active_plugins)

def generate_additional_content(plugin: Plugin, transcript_text: str, summary_text: str) -> str:
    """Generate additional content using the specified plugin."""
    prompt = plugin.prompt.format(transcript=transcript_text, summary=summary_text)
    
    # Use plugin-specific model if specified, otherwise use default
    model = plugin.model or OLLAMA_MODEL
    
    response = ollama.chat(model=model, messages=[
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
    
    # Load plugins
    plugin_manager = PluginManager(Path("plugins"))
    plugins = plugin_manager.get_all_plugins()
    if not plugins:
        print("Error: No plugins found in plugins directory")
        sys.exit(1)
    
    # Set up directory paths
    voice_memo_dir = Path(VOICE_MEMOS_DIR)
    output_dirs = {}
    
    # Create output directories for each plugin
    for plugin_name in plugins.keys():
        # Use inflect to properly pluralize the directory name
        plural_name = p.plural(plugin_name)
        output_dir = voice_memo_dir / plural_name
        output_dir.mkdir(parents=True, exist_ok=True)
        output_dirs[plugin_name] = output_dir
    
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
    
    # Determine which plugins to run
    active_plugins = determine_active_plugins(transcript_text, plugins)
    if active_plugins:
        for plugin_name in active_plugins:
            plugin = plugins[plugin_name]
            print(f"  Running {plugin_name} plugin...")
            additional_content = generate_additional_content(plugin, transcript_text, summary_text)
            
            # Save to appropriate directory with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = input_file.stem
            output_file = output_dirs[plugin_name] / f"{filename}_{timestamp}{plugin.output_extension}"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(additional_content)
            print(f"  Content saved to: {output_file}")
    else:
        print("  No matching plugins found for this transcript")
    
    print("----------------------------------------")

if __name__ == "__main__":
    main() 
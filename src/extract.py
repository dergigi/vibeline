#!/usr/bin/env python3

import sys
import ollama
import re
from pathlib import Path
import time
from typing import List

def load_plugins() -> dict[str, str]:
    """Load all plugins from the plugins directory."""
    plugin_dir = Path("plugins")
    plugins = {}
    
    # Load all .md files from plugins directory
    for plugin_file in plugin_dir.glob("*.md"):
        plugin_name = plugin_file.stem
        if plugin_name != "summary":  # Skip the summary plugin as it's used differently
            # Keep the full plugin name including all suffixes
            plugins[plugin_name] = plugin_file.read_text(encoding='utf-8')
    
    return plugins

def determine_active_plugins(text: str, available_plugins: List[str]) -> List[str]:
    """Determine which plugins should be run on this transcript."""
    active_plugins = []
    
    # First, add all .all plugins
    for plugin_name in available_plugins:
        if '.all' in plugin_name:
            # Remove all suffixes for the base name
            base_name = plugin_name.split('.')[0]
            active_plugins.append(base_name)
    
    # Then check for each plugin's content type
    for plugin_name in available_plugins:
        # Convert plugin name to search pattern (e.g., "blog_post" -> "blog post")
        search_pattern = plugin_name.replace('_', ' ')
        
        # Check if this is an "or" plugin
        if '.or' in plugin_name:
            # Get base name without suffixes
            base_name = plugin_name.split('.')[0]
            # For or plugins, check if any of the words match
            words = base_name.split('_')
            if any(re.search(r'\b' + word + r'\b', text.lower()) for word in words):
                active_plugins.append(base_name)
        else:
            # For regular plugins, check for the exact pattern
            if re.search(r'\b' + search_pattern + r'\b', text.lower()):
                active_plugins.append(plugin_name)
    
    return active_plugins

def generate_additional_content(content_type: str, transcript_text: str, summary_text: str, plugins: dict[str, str]) -> str:
    """Generate additional content based on the content type."""
    # Find the plugin key that matches the content type (with or without .or suffix)
    plugin_key = next(key for key in plugins.keys() if key.startswith(content_type))
    prompt_template = plugins[plugin_key]
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
    
    # Load plugins
    plugins = load_plugins()
    if not plugins:
        print("Error: No plugins found in plugins directory")
        sys.exit(1)
    
    # Set up directory paths
    voice_memo_dir = Path("VoiceMemos")
    output_dirs = {}
    
    # Create output directories for each plugin
    for plugin_name in plugins.keys():
        # Get base name without any suffixes
        base_name = plugin_name.split('.')[0]
        output_dir = voice_memo_dir / f"{base_name}s"  # Pluralize the plugin name
        output_dir.mkdir(parents=True, exist_ok=True)
        # Store with base name as key
        output_dirs[base_name] = output_dir
    
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
    active_plugins = determine_active_plugins(transcript_text, list(plugins.keys()))
    if active_plugins:
        for plugin_name in active_plugins:
            print(f"  Running {plugin_name} plugin...")
            additional_content = generate_additional_content(plugin_name, transcript_text, summary_text, plugins)
            
            # Save to appropriate directory with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = input_file.stem
            output_file = output_dirs[plugin_name] / f"{filename}_{timestamp}.md"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(additional_content)
            print(f"  Content saved to: {output_file}")
    else:
        print("  No matching plugins found for this transcript")
    
    print("----------------------------------------")

if __name__ == "__main__":
    main() 
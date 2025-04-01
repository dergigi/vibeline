#!/usr/bin/env python3

import sys
import ollama
import re
from pathlib import Path
import time
from typing import List

# Configuration
OLLAMA_MODEL = "llama2"  # The model to use for generating content

def get_base_name(plugin_name: str) -> str:
    """Get the base name of a plugin without any suffixes."""
    return plugin_name.split('.')[0]

def read_file(file_path: Path) -> str:
    """Read text from a file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(file_path: Path, content: str) -> None:
    """Write text to a file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def load_plugins() -> dict[str, str]:
    """Load all plugins from the plugins directory."""
    plugin_dir = Path("plugins")
    plugins = {}
    
    # Load all .md files from plugins directory
    for plugin_file in plugin_dir.glob("*.md"):
        plugin_name = plugin_file.stem
        if plugin_name != "summary":  # Skip the summary plugin as it's used differently
            plugins[plugin_name] = read_file(plugin_file)
    
    return plugins

def determine_active_plugins(text: str, available_plugins: List[str]) -> List[str]:
    """Determine which plugins should be run on this transcript."""
    active_plugins = set()  # Use a set to avoid duplicates
    
    for plugin_name in available_plugins:
        base_name = get_base_name(plugin_name)
        
        # Always include plugins with .all suffix
        if '.all' in plugin_name:
            active_plugins.add(base_name)
            continue
            
        # For .or plugins, check if any word matches
        if '.or' in plugin_name:
            words = base_name.split('_')
            if any(re.search(r'\b' + word + r'\b', text.lower()) for word in words):
                active_plugins.add(base_name)
        # For regular plugins, check for the exact pattern
        else:
            search_pattern = plugin_name.replace('_', ' ')
            if re.search(r'\b' + search_pattern + r'\b', text.lower()):
                active_plugins.add(base_name)
    
    return list(active_plugins)

def generate_additional_content(plugin_base_name: str, transcript_text: str, summary_text: str, plugins: dict[str, str]) -> str:
    """Generate additional content using the specified plugin."""
    # Find the plugin key that matches the base name
    plugin_key = next(key for key in plugins.keys() if get_base_name(key) == plugin_base_name)
    prompt_template = plugins[plugin_key]
    prompt = prompt_template.format(transcript=transcript_text, summary=summary_text)
    
    response = ollama.chat(model=OLLAMA_MODEL, messages=[
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
        base_name = get_base_name(plugin_name)
        output_dir = voice_memo_dir / f"{base_name}s"  # Pluralize the plugin name
        output_dir.mkdir(parents=True, exist_ok=True)
        # Store with base name as key
        output_dirs[base_name] = output_dir
    
    print(f"Processing transcript: {input_file}")
    print("Extracting content...")
    
    # Read transcript
    transcript_text = read_file(input_file)
    
    # Read summary if it exists
    summary_file = input_file.parent / f"{input_file.stem}_summary.txt"
    summary_text = ""
    if summary_file.exists():
        summary_text = read_file(summary_file)
    
    # Determine which plugins to run
    active_plugins = determine_active_plugins(transcript_text, list(plugins.keys()))
    if active_plugins:
        for plugin_name in active_plugins:
            print(f"  Running {plugin_name} plugin...")
            additional_content = generate_additional_content(get_base_name(plugin_name), transcript_text, summary_text, plugins)
            
            # Save to appropriate directory with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = input_file.stem
            output_file = output_dirs[get_base_name(plugin_name)] / f"{filename}_{timestamp}.md"
            
            write_file(output_file, additional_content)
            print(f"  Content saved to: {output_file}")
    else:
        print("  No matching plugins found for this transcript")
    
    print("----------------------------------------")

if __name__ == "__main__":
    main() 
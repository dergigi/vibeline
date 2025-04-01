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
            # If it's an .or plugin, remove the .or suffix from the plugin name
            if plugin_name.endswith('.or'):
                plugin_name = plugin_name[:-3]
            plugins[plugin_name] = plugin_file.read_text(encoding='utf-8')
    
    return plugins

def determine_content_types(text: str, available_plugins: List[str]) -> List[str]:
    """Determine what types of content to generate based on the transcript text."""
    content_types = []
    
    # Check for each plugin's content type
    for plugin_name in available_plugins:
        # Convert plugin name to search pattern (e.g., "blog_post" -> "blog post")
        search_pattern = plugin_name.replace('_', ' ')
        
        # Check if this is an "or" plugin (has .or.md suffix)
        is_or_plugin = plugin_name.endswith('.or')
        if is_or_plugin:
            # Remove the .or suffix for the actual plugin name
            plugin_name = plugin_name[:-3]
            # For or plugins, check if any of the words match
            words = search_pattern[:-3].split()  # Remove .or from search pattern
            if any(re.search(r'\b' + word + r'\b', text.lower()) for word in words):
                content_types.append(plugin_name)
        else:
            # For regular plugins, check for the exact pattern
            if re.search(r'\b' + search_pattern + r'\b', text.lower()):
                content_types.append(plugin_name)
    
    return content_types

def generate_additional_content(content_type: str, transcript_text: str, summary_text: str, plugins: dict[str, str]) -> str:
    """Generate additional content based on the content type."""
    prompt_template = plugins[content_type]
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
        output_dir = voice_memo_dir / f"{plugin_name}s"  # Pluralize the plugin name
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
    
    # Determine content types and generate content if needed
    content_types = determine_content_types(transcript_text, list(plugins.keys()))
    if "default" not in content_types:
        for content_type in content_types:
            print(f"  Generating {content_type} content...")
            additional_content = generate_additional_content(content_type, transcript_text, summary_text, plugins)
            
            # Save to appropriate directory with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = input_file.stem
            output_file = output_dirs[content_type] / f"{filename}_{timestamp}.md"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(additional_content)
            print(f"  Content saved to: {output_file}")
    else:
        print("  No content types detected for available plugins")
    
    print("----------------------------------------")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Test mode
        test_files = [
            "tests/transcripts/test_app_idea.txt",
            "tests/transcripts/test_blog_post.txt",
            "tests/transcripts/test_both.txt"
        ]
        
        plugins = load_plugins()
        available_plugins = list(plugins.keys())
        
        for test_file in test_files:
            print(f"\nTesting {test_file}:")
            with open(test_file, 'r') as f:
                text = f.read()
            content_types = determine_content_types(text, available_plugins)
            print(f"Detected content types: {content_types}")
    else:
        # Normal mode
        main() 
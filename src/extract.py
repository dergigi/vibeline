#!/usr/bin/env python3

import sys
import ollama
import re
from pathlib import Path
import time

def load_plugins() -> dict[str, str]:
    """Load all plugins from the plugins directory."""
    plugin_dir = Path("plugins")
    plugins = {}
    
    # Load all .md files from plugins directory
    for plugin_file in plugin_dir.glob("*.md"):
        plugin_name = plugin_file.stem
        if plugin_name != "summary":  # Skip the summary plugin as it's used differently
            plugins[plugin_name] = plugin_file.read_text(encoding='utf-8')
    
    return plugins

def determine_content_types(transcript_text: str, available_plugins: list[str]) -> list[str]:
    """Determine the types of content in the transcript."""
    text = transcript_text.lower()
    content_types = []
    
    # Check for each plugin's content type
    for plugin_name in available_plugins:
        if plugin_name == "blog_post" and (re.search(r'\bblog post\b', text) or re.search(r'\bdraft\b', text)):
            content_types.append(plugin_name)
        elif plugin_name == "app_idea" and re.search(r'\bidea\b', text) and re.search(r'\bapp\b', text):
            content_types.append(plugin_name)
    
    return content_types if content_types else ["default"]

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
    main() 
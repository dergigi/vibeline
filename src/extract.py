#!/usr/bin/env python3

import sys
import ollama
import subprocess
import re
import os
import argparse
from pathlib import Path
import inflect
from typing import List, Dict
from dotenv import load_dotenv
from plugin_manager import PluginManager, Plugin
from transcript_cleaner import TranscriptCleaner, ensure_model_exists

# Load environment variables
load_dotenv()

# Initialize inflect engine
p = inflect.engine()

# Configuration from environment variables
OLLAMA_MODEL = os.getenv("OLLAMA_EXTRACT_MODEL", "llama2")
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")
VOCABULARY_FILE = os.getenv("VOCABULARY_FILE", "VOCABULARY.txt")

# Set a different host (default is http://localhost:11434)
ollama.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

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

def ensure_model_exists(model_name: str) -> None:
    """
    Ensure the specified Ollama model is available locally.
    If not, pull it before proceeding.
    """
    try:
        # Try to get model info - this will fail if model doesn't exist
        ollama.show(model=model_name)
    except Exception:
        print(f"Model {model_name} not found locally. Pulling model...")
        try:
            ollama.pull(model=model_name)
            print(f"Successfully pulled model {model_name}")
        except Exception as e:
            print(f"Error pulling model {model_name}: {e}")
            sys.exit(1)

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Extract content from transcripts using plugins.')
    parser.add_argument('transcript_file', help='The transcript file to process')
    parser.add_argument('-f', '--force', action='store_true', help='Force overwrite existing output files')
    parser.add_argument('--no-clean', action='store_true', help='Skip transcript cleaning step')
    args = parser.parse_args()

    # Ensure the default model exists
    ensure_model_exists(OLLAMA_MODEL)
    
    input_file = Path(args.transcript_file)
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
    voice_memos_dir = Path(VOICE_MEMOS_DIR)
    output_dirs = {}

    # Create output directories for each plugin
    for plugin_name in plugins.keys():
        # Use inflect to properly pluralize the directory name
        plural_name = p.plural(plugin_name)
        output_dir = voice_memos_dir / plural_name
        output_dir.mkdir(parents=True, exist_ok=True)
        output_dirs[plugin_name] = output_dir

    print(f"Processing transcript: {input_file}")
    print("Extracting content...")

    # Read transcript
    with open(input_file, 'r', encoding='utf-8') as f:
        original_transcript_text = f.read()
    
    # Clean transcript if not disabled
    if not args.no_clean:
        print("Cleaning transcript...")
        
        # Initialize transcript cleaner
        vocabulary_path = Path(VOCABULARY_FILE)
        if not vocabulary_path.exists():
            print(f"Warning: Vocabulary file {VOCABULARY_FILE} not found. Creating a default one.")
            with open(vocabulary_path, 'w', encoding='utf-8') as f:
                f.write("# Vocabulary file for transcript corrections\n")
                f.write("# Format: incorrect_word -> correct_word\n\n")
                f.write("# Example:\n")
                f.write("# Noster -> Nostr\n")
        
        cleaner = TranscriptCleaner(vocabulary_file=vocabulary_path)
        
        # Clean the transcript
        transcript_text, corrections = cleaner.clean_transcript(original_transcript_text)
        
        # Log corrections
        if corrections:
            print(f"Made {len(corrections)} corrections to the transcript.")
            
            # Save cleaned transcript
            cleaned_file = input_file.parent / f"{input_file.stem}_cleaned.txt"
            with open(cleaned_file, 'w', encoding='utf-8') as f:
                f.write(transcript_text)
            print(f"Cleaned transcript saved to: {cleaned_file}")
        else:
            print("No corrections needed for this transcript.")
            transcript_text = original_transcript_text
    else:
        transcript_text = original_transcript_text

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

            # Check if output file exists
            filename = input_file.stem
            output_file = output_dirs[plugin_name] / f"{filename}{plugin.output_extension}"

            if output_file.exists() and not args.force:
                print(f"  Skipping: {output_file} already exists (use -f to overwrite)")
                continue

            additional_content = generate_additional_content(plugin, transcript_text, summary_text)

            # Save to appropriate directory using base filename
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(additional_content)
            print(f"  Content saved to: {output_file}")

            # Execute command if defined for the plugin
            if plugin.command:
                try:
                    # Replace FILE placeholder with the actual output file path
                    cmd_to_run = plugin.command.replace("FILE", str(output_file))
                    print(f"  Executing command: {cmd_to_run}")
                    # Run the command, check=True raises an exception on non-zero exit code
                    subprocess.run(cmd_to_run, shell=True, check=True, text=True, capture_output=True)
                    print(f"  Command executed successfully.")
                except FileNotFoundError:
                    print(f"  Error: Command not found - {plugin.command.split()[0]}")
                except subprocess.CalledProcessError as e:
                    print(f"  Error executing command: {e}")
                    print(f"  Stderr: {e.stderr}")
                    print(f"  Stdout: {e.stdout}")
                except Exception as e:
                    print(f"  An unexpected error occurred during command execution: {e}")
    else:
        print("  No matching plugins found for this transcript")

    print("----------------------------------------")

if __name__ == "__main__":
    main()

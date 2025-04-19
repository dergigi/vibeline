#!/usr/bin/env python3

import sys
import ollama
import subprocess
import re
import os
import argparse
import logging
from pathlib import Path
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

# Set a different host (default is http://localhost:11434)
ollama.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

# Set up logging
logger = logging.getLogger(__name__)

def determine_active_plugins(text: str, plugins: Dict[str, Plugin]) -> List[str]:
    """Determine which plugins should be run on this transcript."""
    active_plugins = set()  # Use a set to avoid duplicates

    logger.debug("Checking plugins for activation:")
    for plugin_name, plugin in plugins.items():
        logger.debug(f"Plugin: {plugin_name}")
        logger.debug(f"  Run type: {plugin.run}")
        logger.debug(f"  Keywords: {plugin.keywords}")
        logger.debug(f"  Match type: {plugin.match}")

        # Always include plugins with run: always
        if plugin.run == "always":
            logger.debug("  Activated: Yes (always run)")
            active_plugins.add(plugin_name)
            continue

        # For matching plugins, check based on match type
        if plugin.run == "matching":
            # Use keywords if available, otherwise fall back to plugin name
            if plugin.keywords:
                words = plugin.keywords
                logger.debug(f"  Using keywords: {words}")
            else:
                # Fall back to splitting plugin name if no keywords defined
                words = plugin_name.split('_')
                logger.debug(f"  Using plugin name words: {words}")
                
            matches = [word for word in words if re.search(r'\b' + word + r'\b', text.lower())]
            
            if plugin.match == "any":
                if matches:
                    logger.debug(f"  Activated: Yes (matched keywords: {matches})")
                    active_plugins.add(plugin_name)
                else:
                    logger.debug("  Activated: No (no keywords matched)")
            else:  # all
                if len(matches) == len(words):
                    logger.debug(f"  Activated: Yes (matched all keywords: {matches})")
                    active_plugins.add(plugin_name)
                else:
                    logger.debug(f"  Activated: No (only matched: {matches})")

    return list(active_plugins)

def generate_additional_content(plugin: Plugin, transcript_text: str, summary_text: str) -> str:
    """Generate additional content using the specified plugin."""
    # If there's no prompt, return empty string as no content generation is needed
    if not plugin.prompt:
        return ""

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
        logger.info(f"Model {model_name} not found locally. Pulling model...")
        try:
            ollama.pull(model=model_name)
            logger.info(f"Successfully pulled model {model_name}")
        except Exception as e:
            logger.error(f"Error pulling model {model_name}: {e}")
            sys.exit(1)

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Extract content from transcripts using plugins.')
    parser.add_argument('input_file', help='The input file to process (audio or transcript)')
    parser.add_argument('-f', '--force', action='store_true', help='Force overwrite existing output files')
    args = parser.parse_args()

    # Only ensure model exists if we have plugins with prompts
    plugin_manager = PluginManager(Path("plugins"))
    plugins = plugin_manager.get_all_plugins()
    if not plugins:
        logger.error("Error: No plugins found in plugins directory")
        sys.exit(1)

    # Check if any plugins have prompts before ensuring model exists
    has_prompts = any(plugin.prompt for plugin in plugins.values())
    if has_prompts:
        ensure_model_exists(OLLAMA_MODEL)

    input_file = Path(args.input_file)
    if not input_file.exists():
        logger.error(f"Error: File {input_file} does not exist")
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

    logger.info(f"Processing file: {input_file}")

    # Get plugins that should process this file based on input patterns
    matching_plugins = plugin_manager.get_plugins_for_file(input_file)
    if matching_plugins:
        for plugin in matching_plugins:
            logger.info(f"Running {plugin.name} plugin...")
            
            # Execute the plugin command
            if plugin.command:
                try:
                    # Replace FILE placeholder with the actual input file path
                    cmd_to_run = plugin.command.replace("FILE", str(input_file))
                    logger.info(f"Executing command: {cmd_to_run}")
                    # Run the command, check=True raises an exception on non-zero exit code
                    subprocess.run(cmd_to_run, shell=True, check=True, text=True, capture_output=True)
                    logger.info(f"{plugin.name} completed successfully.")
                except FileNotFoundError:
                    logger.error(f"Error: Command not found - {plugin.command.split()[0]}")
                    sys.exit(1)
                except subprocess.CalledProcessError as e:
                    logger.error(f"Error executing command: {e}")
                    logger.error(f"Stderr: {e.stderr}")
                    logger.error(f"Stdout: {e.stdout}")
                    sys.exit(1)
                except Exception as e:
                    logger.error(f"An unexpected error occurred during {plugin.name}: {e}")
                    sys.exit(1)

    # For text files, proceed with normal plugin processing
    if input_file.suffix.lower() in ['.txt']:
        logger.info("Extracting content...")

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
                logger.info(f"Running {plugin_name} plugin...")

                # Check if output file exists
                filename = input_file.stem
                output_file = output_dirs[plugin_name] / f"{filename}{plugin.output_extension}"

                if output_file.exists() and not args.force:
                    logger.info(f"Skipping: {output_file} already exists (use -f to overwrite)")
                    continue

                # Only generate content if the plugin has a prompt
                if plugin.prompt:
                    additional_content = generate_additional_content(plugin, transcript_text, summary_text)
                    # Save to appropriate directory using base filename
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(additional_content)
                    logger.info(f"Content saved to: {output_file}")

                # Execute command if defined for the plugin
                if plugin.command:
                    try:
                        # Replace FILE placeholder with the actual output file path
                        cmd_to_run = plugin.command.replace("FILE", str(output_file))
                        logger.info(f"Executing command: {cmd_to_run}")
                        # Run the command, check=True raises an exception on non-zero exit code
                        subprocess.run(cmd_to_run, shell=True, check=True, text=True, capture_output=True)
                        logger.info("Command executed successfully.")
                    except FileNotFoundError:
                        logger.error(f"Error: Command not found - {plugin.command.split()[0]}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error executing command: {e}")
                        logger.error(f"Stderr: {e.stderr}")
                        logger.error(f"Stdout: {e.stdout}")
                    except Exception as e:
                        logger.error(f"An unexpected error occurred during command execution: {e}")
        else:
            logger.info("No matching plugins found for this transcript")

    logger.info("----------------------------------------")

if __name__ == "__main__":
    main()

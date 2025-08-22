#!/usr/bin/env python3

import argparse
import logging
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

import inflect
import ollama
from dotenv import load_dotenv

from plugin_manager import Plugin, PluginManager
from transcript_cleaner import TranscriptCleaner

# Load environment variables
load_dotenv()

# Initialize inflect engine
p = inflect.engine()

# Configuration from environment variables
OLLAMA_MODEL = os.getenv("OLLAMA_EXTRACT_MODEL", "llama2")
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")
VOCABULARY_FILE = os.getenv("VOCABULARY_FILE", "VOCABULARY.txt")
PERSONAL_VOCABULARY_FILE = os.getenv("PERSONAL_VOCABULARY_FILE", "~/.vibeline/vocabulary.txt")

# Set a different host (default is http://localhost:11434)
ollama.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")  # type: ignore

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
        logger.debug(f"  Ignore if: {plugin.ignore_if}")

        # Check if plugin should be ignored
        if plugin.ignore_if and re.search(r"\b" + plugin.ignore_if + r"\b", text.lower()):
            logger.debug(f"  Skipped: Found ignore_if text '{plugin.ignore_if}' in transcript")
            continue

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
                words = plugin_name.split("_")
                logger.debug(f"  Using plugin name words: {words}")

            matches = [word for word in words if re.search(r"\b" + word + r"\b", text.lower())]

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
    prompt = plugin.prompt.format(transcript=transcript_text, summary=summary_text)

    # Use plugin-specific model if specified, otherwise use default
    model = plugin.model or OLLAMA_MODEL

    response = ollama.chat(model=model, messages=[{"role": "user", "content": prompt}])
    return str(response["message"]["content"]).strip()


def deduce_audio_file_path(transcript_file: Path) -> Optional[Path]:
    """
    Deduce the original audio file path from the transcript file path.

    Expected structure:
    - Audio file: VoiceMemos/voice_memo.m4a
    - Transcript file: VoiceMemos/transcripts/voice_memo.txt

    Returns the deduced audio file path or None if it doesn't exist.
    """
    # Get the filename without extension
    filename = transcript_file.stem

    # Go up one directory (from transcripts/ to VoiceMemos/)
    voice_memos_dir = transcript_file.parent.parent

    # Construct the audio file path
    audio_file = voice_memos_dir / f"{filename}.m4a"

    # Check if the audio file exists
    if audio_file.exists():
        return audio_file
    else:
        logger.warning(f"Deduced audio file not found: {audio_file}")
        return None


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


def main() -> None:
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Extract content from transcripts using plugins.")
    parser.add_argument("transcript_file", help="The transcript file to process")
    parser.add_argument("-f", "--force", action="store_true", help="Force overwrite existing output files")
    parser.add_argument("--no-clean", action="store_true", help="Skip transcript cleaning step")
    args = parser.parse_args()

    # Ensure the default model exists
    ensure_model_exists(OLLAMA_MODEL)

    input_file = Path(args.transcript_file)
    if not input_file.exists():
        logger.error(f"Error: File {input_file} does not exist")
        sys.exit(1)

    # Load plugins
    plugin_manager = PluginManager(Path("plugins"))
    plugins = plugin_manager.get_all_plugins()
    if not plugins:
        logger.error("Error: No plugins found in plugins directory")
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

    logger.info(f"Processing transcript: {input_file}")
    logger.info("Extracting content...")

    # Read transcript
    with open(input_file, "r", encoding="utf-8") as f:
        original_transcript_text = f.read()

    # Clean transcript if not disabled
    if not args.no_clean:
        print("Cleaning transcript...")

        # Check if vocabulary files exist
        vocabulary_path = Path(VOCABULARY_FILE)
        personal_vocabulary_path = Path(PERSONAL_VOCABULARY_FILE).expanduser()

        if not vocabulary_path.exists():
            print(f"Warning: Base vocabulary file {VOCABULARY_FILE} not found. Skipping transcript cleaning.")
            transcript_text = original_transcript_text
        else:
            # Check if personal vocabulary exists
            personal_vocab_used = personal_vocabulary_path.exists()
            if personal_vocab_used:
                print(f"Using personal vocabulary: {personal_vocabulary_path}")

            # Initialize transcript cleaner with both vocabulary files
            cleaner = TranscriptCleaner(
                vocabulary_file=vocabulary_path,
                personal_vocabulary_file=personal_vocabulary_path if personal_vocab_used else None,
            )
            transcript_text, corrections = cleaner.clean_transcript(original_transcript_text)

            # Log corrections
            if corrections:
                print(f"Made {len(corrections)} corrections to the transcript.")

                # List the corrections made
                for i, correction in enumerate(corrections, 1):
                    print(f"{i}. Line {correction['line']}:")
                    print(f"   Original: {correction['original']}")
                    print(f"   Corrected: {correction['corrected']}")

                # Rename original file to .orig and save cleaned version as main file
                original_backup = input_file.parent / f"{input_file.stem}.txt.orig"
                input_file.rename(original_backup)
                print(f"Original transcript saved to: {original_backup}")

                # Save cleaned transcript as the main file
                with open(input_file, "w", encoding="utf-8") as f:
                    f.write(transcript_text)
                print(f"Cleaned transcript saved as: {input_file}")
            else:
                print("No corrections needed for this transcript.")
                transcript_text = original_transcript_text
    else:
        transcript_text = original_transcript_text

    # Read summary if it exists
    summary_file = input_file.parent / f"{input_file.stem}_summary.txt"
    summary_text = ""
    if summary_file.exists():
        with open(summary_file, "r", encoding="utf-8") as f:
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

            additional_content = generate_additional_content(plugin, transcript_text, summary_text)

            # Save to appropriate directory using base filename
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(additional_content)
            logger.info(f"Content saved to: {output_file}")

            # Execute command if defined for the plugin
            if plugin.command:
                try:
                    # Replace AUDIO_FILE placeholder first (before FILE to avoid conflicts)
                    if "AUDIO_FILE" in plugin.command:
                        audio_file_path = deduce_audio_file_path(input_file)
                        if audio_file_path:
                            cmd_to_run = plugin.command.replace("AUDIO_FILE", str(audio_file_path))
                        else:
                            logger.warning(f"Plugin {plugin_name} requires AUDIO_FILE but audio file not found")
                            continue
                    else:
                        cmd_to_run = plugin.command
                    
                    # Replace FILE placeholder with the actual output file path
                    cmd_to_run = cmd_to_run.replace("FILE", str(output_file))

                    logger.info(f"Executing command: {cmd_to_run}")
                    # Run the command, check=True raises an exception on non-zero exit code
                    subprocess.run(
                        cmd_to_run,
                        shell=True,
                        check=True,
                        text=True,
                        capture_output=True,
                    )
                    logger.info("Command executed successfully.")
                except FileNotFoundError:
                    cmd_name = plugin.command.split()[0]
                    logger.error(f"Error: Command not found - {cmd_name}")
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

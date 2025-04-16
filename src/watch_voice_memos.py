#!/usr/bin/env python3

import os
import time
import subprocess
import argparse
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

def count_words(text: str) -> int:
    """Count the number of words in a text string."""
    return len(text.split())

def get_file_modification_time(file_path):
    """Get the last modification time of a file."""
    return os.path.getmtime(file_path)

def process_voice_memo(file_path: Path, force: bool = False) -> None:
    """Process a voice memo file using process.sh."""
    try:
        logger.info(f"Processing voice memo: {file_path.name}")
        cmd = ['./process.sh']
        if force:
            cmd.append('-f')
        cmd.append(str(file_path))

        # Run subprocess without capturing output to show it in real-time
        result = subprocess.run(
            cmd,
            check=True,
            text=True
        )
        logger.info(f"Successfully processed: {file_path.name}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Error processing {file_path.name}: {e}")
        if e.stderr:
            logger.error(f"Error output: {e.stderr}")
    except Exception as e:
        logger.error(f"Unexpected error processing {file_path.name}: {e}")

def watch_voice_memos() -> None:
    """Watch the VoiceMemos directory for new or modified .m4a files."""
    voice_memos_dir = Path(VOICE_MEMOS_DIR)
    processed_files = {}  # Dictionary to store file paths and their last modification times

    # Set up argument parser
    parser = argparse.ArgumentParser(description='Watch for voice memos and process them')
    parser.add_argument('-f', '--force', action='store_true',
                      help='Force regeneration of existing files')
    args = parser.parse_args()

    # Verify the VoiceMemos directory exists
    if not voice_memos_dir.exists():
        logger.error(f"VoiceMemos directory does not exist at: {voice_memos_dir.absolute()}")
        return

    logger.info("Starting voice memo watcher")
    logger.info(f"Watching directory: {voice_memos_dir.absolute()}")

    try:
        while True:
            # Recursively find all .m4a files
            current_files = set()
            for file_path in voice_memos_dir.rglob("*.m4a"):
                current_files.add(str(file_path))
                try:
                    current_mtime = os.path.getmtime(file_path)

                    # Check if file is new or modified
                    if str(file_path) not in processed_files or processed_files[str(file_path)] != current_mtime:
                        process_voice_memo(file_path, force=args.force)
                        processed_files[str(file_path)] = current_mtime
                except FileNotFoundError:
                    logger.debug(f"File disappeared while processing: {file_path}")
                except Exception as e:
                    logger.error(f"Error checking file {file_path}: {e}")

            # Check for deleted files
            deleted_files = set(processed_files.keys()) - current_files
            for file_path in deleted_files:
                logger.info(f"File removed: {Path(file_path).name}")
                del processed_files[file_path]

            time.sleep(1)  # Wait for 1 second before next check

    except KeyboardInterrupt:
        logger.info("Watcher stopped by user")
    except Exception as e:
        logger.error(f"Unexpected error in watcher: {e}")
        raise  # Re-raise the exception after logging

if __name__ == "__main__":
    try:
        watch_voice_memos()
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        raise

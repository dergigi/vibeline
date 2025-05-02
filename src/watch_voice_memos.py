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

class VoiceMemoHandler(FileSystemEventHandler):
    def __init__(self, force=False):
        self.force = force
        self.processed_files = {}  # Track processed files and their modification times
        # Store the resolved base directory
        self.base_dir = Path(VOICE_MEMOS_DIR).resolve()

    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.m4a'):
            # Use the resolved path for processing
            file_path = Path(event.src_path).resolve()
            self.processed_files[str(file_path)] = get_file_modification_time(file_path)
            logger.debug(f"Added to processed_files: {str(file_path)}")
            process_voice_memo(file_path, force=self.force)

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.m4a'):
            # Use the resolved path for processing
            file_path = Path(event.src_path).resolve()
            current_mtime = get_file_modification_time(file_path)
            if str(file_path) not in self.processed_files or self.processed_files[str(file_path)] != current_mtime:
                self.processed_files[str(file_path)] = current_mtime
                logger.debug(f"Updated in processed_files: {str(file_path)}")
                process_voice_memo(file_path, force=self.force)

    def on_deleted(self, event):
        if not event.is_directory:
            # For deleted files, we need to handle the path differently since the file no longer exists
            deleted_file = Path(event.src_path)
            logger.info(f"File deleted: {deleted_file.name}")
            
            # Check if there's a matching m4a file in our processed files
            matching_m4a_name = f"{deleted_file.stem}.m4a"
            matching_m4a = self.base_dir / matching_m4a_name
            
            logger.debug(f"Looking for matching m4a: {str(matching_m4a)}")
            logger.debug(f"Current processed_files: {list(self.processed_files.keys())}")
            
            if str(matching_m4a) in self.processed_files:
                logger.info(f"Reprocessing voice memo due to deletion of {deleted_file.name}")
                process_voice_memo(matching_m4a, force=self.force)
            else:
                logger.info(f"Deleted file: {deleted_file.name} (type: {deleted_file.suffix})")

def watch_voice_memos() -> None:
    """Watch the VoiceMemos directory for new or modified .m4a files."""
    # Resolve the symlink to get the actual directory
    voice_memos_dir = Path(VOICE_MEMOS_DIR).resolve()

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

    # Create event handler and observer
    event_handler = VoiceMemoHandler(force=args.force)
    observer = Observer()
    # Watch the resolved directory path
    observer.schedule(event_handler, str(voice_memos_dir.resolve()), recursive=True)
    observer.start()

    try:
        # Process existing files
        for file_path in voice_memos_dir.rglob("*.m4a"):
            # Use resolved paths for processing
            file_path = file_path.resolve()
            event_handler.processed_files[str(file_path)] = get_file_modification_time(file_path)
            process_voice_memo(file_path, force=args.force)

        # Keep the script running
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("Watcher stopped by user")
        observer.stop()
    except Exception as e:
        logger.error(f"Unexpected error in watcher: {e}")
        observer.stop()
        raise
    finally:
        observer.join()

if __name__ == "__main__":
    try:
        watch_voice_memos()
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        raise

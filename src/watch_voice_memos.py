#!/usr/bin/env python3

import argparse
import logging
import os
import subprocess
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

from dotenv import load_dotenv
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

# Load environment variables
load_dotenv()

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# Wait until SyncThing has stopped writing before transcribing.
STABLE_SECONDS = 10
FileSignature = Tuple[float, int]


def count_words(text: str) -> int:
    """Count the number of words in a text string."""
    return len(text.split())


def file_signature(file_path: Path) -> Optional[FileSignature]:
    """Return mtime and size, or None if the file is gone."""
    try:
        stat = file_path.stat()
    except OSError:
        return None
    return (stat.st_mtime, stat.st_size)


def audio_duration_seconds(file_path: Path) -> Optional[float]:
    """Return the audio duration when the file has playable audio."""
    signature = file_signature(file_path)
    if signature is None or signature[1] == 0:
        return None
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(file_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    raw = result.stdout.strip()
    if not raw or raw.upper() == "N/A":
        return None
    try:
        duration = float(raw)
    except ValueError:
        return None
    if duration <= 0:
        return None
    return duration


def process_voice_memo(file_path: Path, force: bool = False) -> None:
    """Process a voice memo file using process.sh."""
    try:
        logger.info(f"Processing voice memo: {file_path.name}")
        cmd = ["./process.sh"]
        if force:
            cmd.append("-f")
        cmd.append(str(file_path))

        # Run subprocess without capturing output to show it in real-time
        subprocess.run(cmd, check=True, text=True)
        logger.info(f"Successfully processed: {file_path.name}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Error processing {file_path.name}: {e}")
        if e.stderr:
            logger.error(f"Error output: {e.stderr}")
    except Exception as e:
        logger.error(f"Unexpected error processing {file_path.name}: {e}")


class VoiceMemoHandler(FileSystemEventHandler):
    def __init__(self, force: bool = False) -> None:
        self.force = force
        self.processed_files: Dict[str, FileSignature] = {}
        self.pending_since: Dict[str, float] = {}
        self.lock = threading.Lock()
        # Store the resolved base directory
        self.base_dir = Path(VOICE_MEMOS_DIR).resolve()
        self.archive_dir = self.base_dir / "archive"

    def is_archive_file(self, file_path: Path) -> bool:
        """Check if a file is in the archive directory."""
        try:
            file_path.relative_to(self.archive_dir)
            return True
        except ValueError:
            return False

    def note_audio(self, file_path: Path) -> None:
        """Remember that an audio file changed and should be checked once it settles."""
        if self.is_archive_file(file_path):
            logger.debug(f"Skipping archive file: {file_path}")
            return
        with self.lock:
            self.pending_since[str(file_path)] = time.monotonic()

    def process_if_ready(self, file_path: Path) -> None:
        """Transcribe a file once it has playable audio and this version was not processed yet."""
        if self.is_archive_file(file_path):
            return
        signature = file_signature(file_path)
        if signature is None:
            return
        key = str(file_path)
        if self.processed_files.get(key) == signature:
            return
        if audio_duration_seconds(file_path) is None:
            logger.info(f"Skipping {file_path.name}: audio is still syncing or empty")
            self.processed_files[key] = signature
            return
        self.processed_files[key] = signature
        process_voice_memo(file_path, force=self.force)

    def drain_ready(self) -> None:
        """Process files that have not changed for STABLE_SECONDS."""
        now = time.monotonic()
        with self.lock:
            ready = [path for path, seen_at in self.pending_since.items() if now - seen_at >= STABLE_SECONDS]
            for path in ready:
                del self.pending_since[path]
        for path in ready:
            self.process_if_ready(Path(path))

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory and str(event.src_path).endswith(".m4a"):
            file_path = Path(str(event.src_path)).resolve()
            self.note_audio(file_path)

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory and str(event.src_path).endswith(".m4a"):
            file_path = Path(str(event.src_path)).resolve()
            self.note_audio(file_path)

    def on_deleted(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            # For deleted files, we need to handle the path differently since the file no longer exists
            deleted_file = Path(str(event.src_path))
            logger.info(f"File deleted: {deleted_file.name}")

            # Check if there's a matching m4a file in our processed files
            matching_m4a_name = f"{deleted_file.stem}.m4a"
            matching_m4a = self.base_dir / matching_m4a_name

            logger.debug(f"Looking for matching m4a: {str(matching_m4a)}")
            logger.debug(f"Current processed_files: {list(self.processed_files.keys())}")

            if str(matching_m4a) in self.processed_files:
                logger.info(f"Reprocessing voice memo due to deletion of {deleted_file.name}")
                self.processed_files.pop(str(matching_m4a), None)
                self.note_audio(matching_m4a)
            else:
                logger.info(f"Deleted file: {deleted_file.name} (type: {deleted_file.suffix})")


def watch_voice_memos() -> None:
    """Watch the VoiceMemos directory for new or modified .m4a files."""
    # Resolve the symlink to get the actual directory
    voice_memos_dir = Path(VOICE_MEMOS_DIR).resolve()

    # Set up argument parser
    parser = argparse.ArgumentParser(description="Watch for voice memos and process them")
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Force regeneration of existing files",
    )
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
    observer.schedule(event_handler, str(voice_memos_dir.absolute()), recursive=True)
    observer.start()

    try:
        # Process existing files that have already finished syncing.
        for file_path in voice_memos_dir.rglob("*.m4a"):
            file_path = file_path.resolve()
            if event_handler.is_archive_file(file_path):
                logger.debug(f"Skipping archive file: {file_path}")
                continue
            try:
                age = time.time() - file_path.stat().st_mtime
            except OSError:
                continue
            if age >= STABLE_SECONDS:
                event_handler.process_if_ready(file_path)
            else:
                event_handler.note_audio(file_path)

        # Keep the script running
        while True:
            event_handler.drain_ready()
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

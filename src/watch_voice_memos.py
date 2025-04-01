#!/usr/bin/env python3

import os
import time
import subprocess
import re
import ollama
import argparse
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('voice_memo_watcher.log'),
        logging.StreamHandler()
    ]
)

def generate_summary(transcript_text: str) -> str:
    """Generate a summary of the transcript."""
    prompt_dir = Path(__file__).parent.parent / "prompts"
    with open(prompt_dir / "summary.md", 'r', encoding='utf-8') as f:
        prompt_template = f.read()
    
    prompt = prompt_template.format(transcript=transcript_text)
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    return response['message']['content'].strip()

def determine_content_type(transcript_text: str) -> str:
    """Determine the type of content in the transcript."""
    text = transcript_text.lower()
    
    if re.search(r'\bblog post\b', text) or re.search(r'\bdraft\b', text):
        return "blog_post"
    elif re.search(r'\bidea\b', text) and re.search(r'\bapp\b', text):
        return "idea_app"
    return "default"

def generate_additional_content(content_type: str, transcript_text: str, summary: str) -> str:
    """Generate additional content based on the content type."""
    prompt_dir = Path(__file__).parent.parent / "prompts"
    with open(prompt_dir / f"{content_type}.md", 'r', encoding='utf-8') as f:
        prompt_template = f.read()
    
    prompt = prompt_template.format(transcript=transcript_text, summary=summary)
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': prompt
        }
    ])
    return response['message']['content'].strip()

def count_words(text: str) -> int:
    """Count the number of words in a text string."""
    return len(text.split())

def get_file_modification_time(file_path):
    """Get the last modification time of a file."""
    return os.path.getmtime(file_path)

def process_voice_memo(file_path):
    """Process a voice memo file using process.sh."""
    try:
        logging.info(f"Processing voice memo: {file_path}")
        subprocess.run(['./process.sh', str(file_path)], check=True)
        logging.info(f"Successfully processed: {file_path}")
    except subprocess.CalledProcessError as e:
        logging.error(f"Error processing {file_path}: {e}")

def watch_voice_memos():
    """Watch the VoiceMemos directory for new or modified .m4a files."""
    voice_memos_dir = Path("VoiceMemos")
    processed_files = {}  # Dictionary to store file paths and their last modification times
    
    logging.info("Starting voice memo watcher...")
    logging.info(f"Watching directory: {voice_memos_dir}")
    
    while True:
        try:
            # Recursively find all .m4a files
            for file_path in voice_memos_dir.rglob("*.m4a"):
                current_mtime = get_file_modification_time(file_path)
                
                # Check if file is new or modified
                if str(file_path) not in processed_files or processed_files[str(file_path)] != current_mtime:
                    logging.info(f"New or modified file detected: {file_path}")
                    process_voice_memo(file_path)
                    processed_files[str(file_path)] = current_mtime
            
            # Check for deleted files
            for file_path in list(processed_files.keys()):
                if not os.path.exists(file_path):
                    logging.info(f"File deleted: {file_path}")
                    del processed_files[file_path]
            
            time.sleep(1)  # Wait for 1 second before next check
            
        except KeyboardInterrupt:
            logging.info("Voice memo watcher stopped by user")
            break
        except Exception as e:
            logging.error(f"Error in watch_voice_memos: {e}")
            time.sleep(5)  # Wait longer if there's an error

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Watch for voice memos and process them')
    parser.add_argument('-f', '--force', action='store_true', 
                      help='Force regeneration of existing files')
    args = parser.parse_args()

    # Set up directory paths
    base_dir = Path(__file__).parent.parent
    voice_memo_dir = base_dir / "VoiceMemos"
    transcript_dir = voice_memo_dir / "transcripts"
    summary_dir = voice_memo_dir / "summaries"

    # Print debug info about symlinks
    print("\nDirectory information:")
    print(f"Voice memo dir: {voice_memo_dir}")
    print(f"Is symlink: {voice_memo_dir.is_symlink()}")
    if voice_memo_dir.is_symlink():
        print(f"Resolves to: {voice_memo_dir.resolve()}")
    
    # Verify directories exist
    if not voice_memo_dir.exists():
        print(f"Error: {voice_memo_dir} directory does not exist")
        sys.exit(1)
    if not transcript_dir.exists():
        print(f"Error: {transcript_dir} directory does not exist")
        sys.exit(1)
    if not summary_dir.exists():
        print(f"Error: {summary_dir} directory does not exist")
        sys.exit(1)

    # Set up event handler and observer
    event_handler = VoiceMemoHandler(voice_memo_dir, transcript_dir, summary_dir, force=args.force)
    observer = Observer()
    
    # Watch voice memo directory only (we'll handle transcripts immediately after creation)
    observer.schedule(event_handler, str(voice_memo_dir.resolve()), recursive=False)
    
    # Start the observer
    observer.start()
    print(f"\nWatching for changes in:")
    print(f"- Voice memos: {voice_memo_dir.resolve()}")
    if args.force:
        print("Force mode enabled - will regenerate existing files")
    print("\nPress Ctrl+C to stop...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\nStopping file watcher...")
    
    observer.join()

if __name__ == "__main__":
    watch_voice_memos() 
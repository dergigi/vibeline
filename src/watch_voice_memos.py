#!/usr/bin/env python3

import sys
import time
import subprocess
import re
import ollama
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

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

class VoiceMemoHandler(FileSystemEventHandler):
    def __init__(self, voice_memo_dir: Path, transcript_dir: Path, summary_dir: Path):
        self.voice_memo_dir = voice_memo_dir.resolve()  # Store resolved path
        self.transcript_dir = transcript_dir.resolve()  # Store resolved path
        self.summary_dir = summary_dir.resolve()  # Store resolved path
        self.draft_dir = voice_memo_dir.parent / "drafts"  # New directory for blog posts
        self.prompt_dir = voice_memo_dir.parent / "prompts"  # New directory for app ideas
        self.processing_lock = False
        self.base_dir = Path(__file__).parent.parent

        # Create additional directories if they don't exist
        self.draft_dir.mkdir(parents=True, exist_ok=True)
        self.prompt_dir.mkdir(parents=True, exist_ok=True)

    def on_created(self, event):
        if self.processing_lock:
            return

        if not event.is_directory:
            file_path = Path(event.src_path).resolve()  # Resolve the event path
            
            # Handle new voice memo
            if file_path.parent == self.voice_memo_dir and file_path.suffix.lower() == '.m4a':
                print(f"\nNew voice memo detected: {file_path.name}")
                self.process_voice_memo(file_path)

    def on_modified(self, event):
        if self.processing_lock:
            return

        if not event.is_directory:
            file_path = Path(event.src_path).resolve()  # Resolve the event path
            
            # Handle modified voice memo
            if file_path.parent == self.voice_memo_dir and file_path.suffix.lower() == '.m4a':
                print(f"\nVoice memo modified: {file_path.name}")
                self.process_voice_memo(file_path, force=True)  # Force regeneration for modified files

    def on_deleted(self, event):
        if self.processing_lock:
            return

        if not event.is_directory:
            file_path = Path(event.src_path).resolve()  # Resolve the event path
            
            # Handle deleted voice memo
            if file_path.parent == self.voice_memo_dir and file_path.suffix.lower() == '.m4a':
                print(f"\nVoice memo deleted: {file_path.name}")
                print("  Note: Corresponding transcript and summary files remain unchanged")

    def process_voice_memo(self, voice_memo_path: Path, force: bool = False):
        """Process a single voice memo file"""
        try:
            self.processing_lock = True
            print(f"Processing voice memo: {voice_memo_path.name}")
            
            # Get the transcript file path
            transcript_file = self.transcript_dir / f"{voice_memo_path.stem}.txt"
            
            # Skip if transcript exists and we're not forcing regeneration
            if transcript_file.exists() and not force:
                print(f"  Transcript already exists at {transcript_file}, skipping...")
                return
            
            # Generate transcript
            cmd = [str(self.base_dir / 'src' / 'process_voice_memos.sh'), str(voice_memo_path)]
            if force:
                cmd.append("--force")
                
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("Voice memo transcription completed successfully")
                
                if not transcript_file.exists():
                    print(f"Error: Transcript file not found at {transcript_file}")
                    return
                
                # Process the transcript
                self.process_transcript(transcript_file, force)
            else:
                print(f"Error transcribing voice memo: {result.stderr}")
                
        except Exception as e:
            print(f"Error processing voice memo: {str(e)}")
        finally:
            self.processing_lock = False

    def process_transcript(self, transcript_file: Path, force: bool = False):
        """Process a single transcript file"""
        try:
            print(f"Processing transcript: {transcript_file.name}")
            
            # Read transcript
            with open(transcript_file, 'r', encoding='utf-8') as f:
                transcript_text = f.read()
            
            word_count = count_words(transcript_text)
            print(f"  Read transcript ({len(transcript_text)} characters, {word_count} words)")
            
            # Skip if transcript is too short
            if word_count <= 210:
                print("  Transcript is too short (≤210 words), skipping processing")
                return
            
            # Check for existing summary
            summary_file = self.summary_dir / f"{transcript_file.stem}_summary.txt"
            if summary_file.exists() and not force:
                print(f"  Summary already exists at {summary_file}, skipping...")
                return
            
            # Generate summary
            print("  Generating summary...")
            summary = generate_summary(transcript_text)
            
            # Save summary
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary)
            print(f"  Summary saved to {summary_file}")
            
            # Determine content type and generate additional content if needed
            content_type = determine_content_type(transcript_text)
            if content_type != "default":
                print(f"  Generating additional content for type: {content_type}")
                additional_content = generate_additional_content(content_type, transcript_text, summary)
                
                # Save to appropriate directory with timestamp
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                if content_type == "blog_post":
                    output_file = self.draft_dir / f"{transcript_file.stem}_{timestamp}.md"
                else:  # idea_app
                    output_file = self.prompt_dir / f"{transcript_file.stem}_{timestamp}.md"
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(additional_content)
                print(f"  Additional content saved to {output_file}")
                
        except Exception as e:
            print(f"Error processing transcript: {str(e)}")

def main():
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
    event_handler = VoiceMemoHandler(voice_memo_dir, transcript_dir, summary_dir)
    observer = Observer()
    
    # Watch voice memo directory only (we'll handle transcripts immediately after creation)
    observer.schedule(event_handler, str(voice_memo_dir.resolve()), recursive=False)
    
    # Start the observer
    observer.start()
    print(f"\nWatching for changes in:")
    print(f"- Voice memos: {voice_memo_dir.resolve()}")
    print("\nPress Ctrl+C to stop...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\nStopping file watcher...")
    
    observer.join()

if __name__ == "__main__":
    main() 
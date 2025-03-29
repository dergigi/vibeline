#!/usr/bin/env python3

import sys
import time
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class VoiceMemoHandler(FileSystemEventHandler):
    def __init__(self, voice_memo_dir: Path, transcript_dir: Path, summary_dir: Path):
        self.voice_memo_dir = voice_memo_dir
        self.transcript_dir = transcript_dir
        self.summary_dir = summary_dir
        self.processing_lock = False
        self.base_dir = Path(__file__).parent.parent

    def on_created(self, event):
        if self.processing_lock:
            return

        if not event.is_directory:
            file_path = Path(event.src_path)
            
            # Handle new voice memo
            if file_path.parent == self.voice_memo_dir and file_path.suffix.lower() == '.m4a':
                print(f"\nNew voice memo detected: {file_path.name}")
                self.process_voice_memo()
            
            # Handle new transcript
            elif file_path.parent == self.transcript_dir and file_path.suffix.lower() == '.txt':
                print(f"\nNew transcript detected: {file_path.name}")
                self.process_transcript()

    def on_modified(self, event):
        if self.processing_lock:
            return

        if not event.is_directory:
            file_path = Path(event.src_path)
            
            # Handle modified voice memo
            if file_path.parent == self.voice_memo_dir and file_path.suffix.lower() == '.m4a':
                print(f"\nVoice memo modified: {file_path.name}")
                self.process_voice_memo()
            
            # Handle modified transcript
            elif file_path.parent == self.transcript_dir and file_path.suffix.lower() == '.txt':
                print(f"\nTranscript modified: {file_path.name}")
                self.process_transcript()

    def on_deleted(self, event):
        if self.processing_lock:
            return

        if not event.is_directory:
            file_path = Path(event.src_path)
            
            # Handle deleted voice memo
            if file_path.parent == self.voice_memo_dir and file_path.suffix.lower() == '.m4a':
                print(f"\nVoice memo deleted: {file_path.name}")
                print("  Note: Corresponding transcript and summary files remain unchanged")
            
            # Handle deleted transcript
            elif file_path.parent == self.transcript_dir and file_path.suffix.lower() == '.txt':
                print(f"\nTranscript deleted: {file_path.name}")
                print("  Note: Corresponding summary file remains unchanged")
            
            # Handle deleted summary
            elif file_path.parent == self.summary_dir and file_path.suffix.lower() == '.txt':
                print(f"\nSummary deleted: {file_path.name}")

    def process_voice_memo(self):
        """Run the voice memo processing script"""
        try:
            self.processing_lock = True
            print("Processing voice memo...")
            result = subprocess.run([str(self.base_dir / 'src' / 'process_voice_memos.sh')], 
                                 capture_output=True, 
                                 text=True)
            if result.returncode == 0:
                print("Voice memo processing completed successfully")
            else:
                print(f"Error processing voice memo: {result.stderr}")
        except Exception as e:
            print(f"Error running voice memo script: {str(e)}")
        finally:
            self.processing_lock = False

    def process_transcript(self):
        """Run the transcript summarization script"""
        try:
            self.processing_lock = True
            print("Processing transcript...")
            result = subprocess.run(['python', str(self.base_dir / 'src' / 'summarize_transcripts.py')],
                                 capture_output=True,
                                 text=True)
            if result.returncode == 0:
                print("Transcript processing completed successfully")
            else:
                print(f"Error processing transcript: {result.stderr}")
        except Exception as e:
            print(f"Error running summarization script: {str(e)}")
        finally:
            self.processing_lock = False

def main():
    # Set up directory paths
    base_dir = Path(__file__).parent.parent
    voice_memo_dir = base_dir / "VoiceMemos"
    transcript_dir = voice_memo_dir / "transcripts"
    summary_dir = voice_memo_dir / "summaries"

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
    
    # Watch all directories
    observer.schedule(event_handler, str(voice_memo_dir), recursive=False)
    observer.schedule(event_handler, str(transcript_dir), recursive=False)
    observer.schedule(event_handler, str(summary_dir), recursive=False)
    
    # Start the observer
    observer.start()
    print(f"\nWatching for changes in:")
    print(f"- Voice memos: {voice_memo_dir}")
    print(f"- Transcripts: {transcript_dir}")
    print(f"- Summaries: {summary_dir}")
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
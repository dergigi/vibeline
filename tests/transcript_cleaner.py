#!/usr/bin/env python3

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add the src directory to the Python path
sys.path.append(str(Path(__file__).parent))
from src.transcript_cleaner import TranscriptCleaner, ensure_model_exists

# Load environment variables
load_dotenv()

def main():
    # Get model from environment or use default
    model = os.getenv("TRANSCRIPT_CLEANER_MODEL", "tinyllama")
    vocabulary_file = Path(os.getenv("VOCABULARY_FILE", "VOCABULARY.txt"))
    
    # Check if vocabulary file exists
    if not vocabulary_file.exists():
        print(f"Error: Vocabulary file {vocabulary_file} not found.")
        print("Please create it first or specify a different file with VOCABULARY_FILE environment variable.")
        sys.exit(1)
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python test_transcript_cleaner.py <text_to_clean>")
        print("   or: python test_transcript_cleaner.py --file <transcript_file>")
        sys.exit(1)
    
    # Get the text to clean
    if sys.argv[1] == "--file":
        if len(sys.argv) < 3:
            print("Error: No file specified after --file")
            sys.exit(1)
        
        file_path = Path(sys.argv[2])
        if not file_path.exists():
            print(f"Error: File {file_path} not found")
            sys.exit(1)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        print(f"Cleaning transcript from file: {file_path}")
    else:
        # Use the command line argument as the text
        text = " ".join(sys.argv[1:])
        print(f"Cleaning text: {text}")
    
    # Initialize the transcript cleaner
    use_model = "--no-model" not in sys.argv
    if use_model:
        print(f"Using model: {model}")
        ensure_model_exists(model)
        cleaner = TranscriptCleaner(vocabulary_file=vocabulary_file, model=model)
    else:
        print("Using only direct replacements (no model)")
        cleaner = TranscriptCleaner(vocabulary_file=vocabulary_file)
    
    # Clean the transcript
    cleaned_text, corrections = cleaner.clean_transcript(text)
    
    # Print the results
    print("\nOriginal text:")
    print("-" * 80)
    print(text)
    print("-" * 80)
    
    print("\nCleaned text:")
    print("-" * 80)
    print(cleaned_text)
    print("-" * 80)
    
    # Print corrections
    if corrections:
        print(f"\nMade {len(corrections)} corrections:")
        for i, correction in enumerate(corrections, 1):
            print(f"{i}. Line {correction['line']}:")
            print(f"   Original: {correction['original']}")
            print(f"   Corrected: {correction['corrected']}")
    else:
        print("\nNo corrections were made.")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple
import ollama

class TranscriptCleaner:
    def __init__(self, vocabulary_file: Path = None, model: str = None):
        """
        Initialize the transcript cleaner with a vocabulary file and model.
        
        Args:
            vocabulary_file: Path to the vocabulary file containing corrections
            model: The Ollama model to use for cleaning (if None, uses only direct replacements)
        """
        self.vocabulary_file = vocabulary_file
        self.model = model
        self.corrections = {}
        
        # Load vocabulary file if provided
        if vocabulary_file and vocabulary_file.exists():
            self._load_vocabulary()
    
    def _load_vocabulary(self) -> None:
        """Load word corrections from the vocabulary file."""
        with open(self.vocabulary_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                    
                # Format: incorrect_word -> correct_word
                if '->' in line:
                    incorrect, correct = [part.strip() for part in line.split('->')]
                    self.corrections[incorrect.lower()] = correct
    
    def _apply_direct_corrections(self, text: str) -> str:
        """Apply direct word corrections from the vocabulary file."""
        if not self.corrections:
            return text
            
        # Create a regex pattern for all incorrect words
        # Use word boundaries to ensure we're replacing whole words
        pattern = r'\b(' + '|'.join(re.escape(word) for word in self.corrections.keys()) + r')\b'
        
        def replace_match(match):
            # Preserve original capitalization if possible
            original = match.group(0)
            replacement = self.corrections[original.lower()]
            
            # If original is all caps, make replacement all caps
            if original.isupper():
                return replacement.upper()
            # If original is title case, make replacement title case
            elif original[0].isupper():
                return replacement[0].upper() + replacement[1:]
            # Otherwise use replacement as is
            else:
                return replacement
                
        return re.sub(pattern, replace_match, text, flags=re.IGNORECASE)
    
    def _apply_model_corrections(self, text: str) -> str:
        """Use an LLM to apply context-aware corrections."""
        if not self.model:
            return text
            
        # Create a prompt that includes the vocabulary and the transcript
        corrections_list = "\n".join([f"- '{incorrect}' should be '{correct}'" 
                                     for incorrect, correct in self.corrections.items()])
        
        prompt = f"""
        You are a transcript correction assistant. Your task is to correct common transcription errors 
        in the following text while preserving the original meaning and style.
        
        Please focus on correcting these specific words or phrases:
        {corrections_list}
        
        Only correct these specific words or phrases when they appear in the transcript. 
        Do not make any other changes to the text. Preserve all punctuation, capitalization, 
        and formatting except when correcting the specified words.
        
        Here is the transcript to correct:
        
        {text}
        """
        
        response = ollama.chat(model=self.model, messages=[
            {
                'role': 'user',
                'content': prompt
            }
        ])
        
        return response['message']['content'].strip()
    
    def clean_transcript(self, text: str) -> Tuple[str, List[Dict]]:
        """
        Clean the transcript by applying vocabulary corrections.
        
        Args:
            text: The transcript text to clean
            
        Returns:
            Tuple containing:
                - The cleaned transcript text
                - A list of corrections made (for logging/debugging)
        """
        original_text = text
        corrections_made = []
        
        # First apply direct word-for-word corrections
        text = self._apply_direct_corrections(text)
        
        # If a model is specified, use it for more context-aware corrections
        if self.model:
            text = self._apply_model_corrections(text)
        
        # Log corrections for debugging
        if text != original_text:
            # Find differences between original and corrected text
            for i, (orig_line, new_line) in enumerate(zip(original_text.splitlines(), text.splitlines())):
                if orig_line != new_line:
                    corrections_made.append({
                        'line': i + 1,
                        'original': orig_line,
                        'corrected': new_line
                    })
        
        return text, corrections_made


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
            raise
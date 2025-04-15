#!/usr/bin/env python3

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple
# ollama import removed as we no longer use LLM for cleaning

class TranscriptCleaner:
    def __init__(self, vocabulary_file: Path = None):
        """
        Initialize the transcript cleaner with a vocabulary file.
        
        Args:
            vocabulary_file: Path to the vocabulary file containing corrections
        """
        self.vocabulary_file = vocabulary_file
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
        
        # Split the text into words while preserving whitespace and punctuation
        # This regex captures words, whitespace, and punctuation separately
        tokens = re.findall(r'(\b\w+\b|\s+|[^\w\s])', text)
        corrected_tokens = []
        corrections_made = []
        
        for token in tokens:
            # Only process word tokens (skip whitespace and punctuation)
            if re.match(r'\b\w+\b', token):
                token_lower = token.lower()
                
                # Check if this token needs correction
                if token_lower in self.corrections:
                    replacement = self.corrections[token_lower]
                    
                    # Preserve original capitalization
                    if token.isupper():
                        replacement = replacement.upper()
                    elif token[0].isupper():
                        replacement = replacement[0].upper() + replacement[1:]
                    
                    # Record this correction
                    corrections_made.append((token, replacement))
                    
                    # Use the replacement
                    corrected_tokens.append(replacement)
                else:
                    # No correction needed
                    corrected_tokens.append(token)
            else:
                # Preserve whitespace and punctuation
                corrected_tokens.append(token)
        
        # Join the tokens back into text
        corrected_text = ''.join(corrected_tokens)
        
        # Also handle multi-word phrases
        for incorrect, correct in self.corrections.items():
            if ' ' in incorrect:  # This is a multi-word phrase
                # Create a regex pattern that handles case variations
                pattern = re.compile(re.escape(incorrect), re.IGNORECASE)
                
                def replace_phrase(match):
                    original = match.group(0)
                    # Preserve case pattern if possible
                    if original.isupper():
                        return correct.upper()
                    elif original[0].isupper():
                        return correct[0].upper() + correct[1:]
                    return correct
                
                # Apply the replacement
                corrected_text = pattern.sub(replace_phrase, corrected_text)
        
        return corrected_text
    
    # No LLM-based methods needed anymore
    
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
        
        # Apply direct word-for-word corrections
        cleaned_text = self._apply_direct_corrections(text)
        
        # Log corrections for debugging
        corrections_made = []
        if cleaned_text != original_text:
            # Find differences between original and corrected text
            for i, (orig_line, new_line) in enumerate(zip(original_text.splitlines(), cleaned_text.splitlines())):
                if orig_line != new_line:
                    corrections_made.append({
                        'line': i + 1,
                        'original': orig_line,
                        'corrected': new_line
                    })
        
        return cleaned_text, corrections_made


def ensure_model_exists(model_name: str) -> None:
    """
    This function is kept for backward compatibility but does nothing
    since we no longer use LLMs for transcript cleaning.
    """
    # No-op function
    pass
#!/usr/bin/env python3

import os
import re
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

def extract_action_items(content: str) -> List[str]:
    """Extract action items from content, ignoring original list markers."""
    items = []
    for line in content.split('\n'):
        # Match lines that start with any list marker (-, *, +) and optional checkbox
        match = re.match(r'^\s*[-*+]\s*(?:\[\s*\])?\s*(.*)', line)
        if match:
            item = match.group(1).strip()
            if item and not item.startswith('#'):  # Skip headers
                items.append(item)
    return items

def format_action_items(items: List[str]) -> str:
    """Format action items in markdown checkbox format with consistent - [ ] prefix."""
    if not items:
        return "# Action Items\n\nNo action items found."
    
    formatted = "# Action Items\n\n"
    for item in items:
        # Ensure each item starts with a capital letter
        item = item[0].upper() + item[1:] if item else item
        # Ensure each item ends with a period
        if not item.endswith(('.', '!', '?')):
            item += '.'
        formatted += f"- [ ] {item}\n"
    
    return formatted

def main():
    # Set up directory paths
    voice_memo_dir = Path(VOICE_MEMOS_DIR)
    action_items_dir = voice_memo_dir / "action_items"
    
    if not action_items_dir.exists():
        print("No action items directory found")
        return
    
    # Process each action items file
    for action_file in action_items_dir.glob("*.txt"):
        print(f"Processing {action_file.name}...")
        
        # Read the action items
        with open(action_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract and format action items
        items = extract_action_items(content)
        formatted_content = format_action_items(items)
        
        # Save formatted content
        formatted_file = action_file.parent / f"{action_file.stem}_formatted.txt"
        with open(formatted_file, 'w', encoding='utf-8') as f:
            f.write(formatted_content)
        
        print(f"  Formatted content saved to: {formatted_file}")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3

import os
import re
import argparse
from pathlib import Path
from typing import List, Dict
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

def extract_action_items(content: str) -> List[str]:
    """Extract action items from content, cleaning up any non-letter characters from the beginning."""
    items = []
    for line in content.split('\n'):
        # Skip empty lines and headers
        if not line.strip() or line.strip().startswith(('Here are', 'Rules were', 'No action items')):
            continue
            
        # Match lines that start with any list marker (-, *, +)
        if re.match(r'^\s*[-*+]', line):
            # Find the first letter in the line
            match = re.search(r'[a-zA-Z]', line)
            if match:
                item = line[match.start():].strip()
                if item and not item.startswith('#'):  # Skip headers
                    # Remove any trailing "(no deadline or priority mentioned)"
                    item = re.sub(r'\s*\(no deadline or priority mentioned\)$', '', item)
                    items.append(item)
    return items

def format_action_items(items: List[str], filename: str) -> str:
    """Format action items in markdown checkbox format with consistent - [ ] prefix.
    Uses the filename (timestamp) to create a human-readable header."""
    if not items:
        return "# No items found\n"
    
    # Extract date and time from filename (format: YYYYMMDD_HHMMSS.txt)
    date_str = filename.split('.')[0]  # Remove .txt extension
    year = int(date_str[:4])
    month = int(date_str[4:6])
    day = int(date_str[6:8])
    hour = int(date_str[9:11])
    minute = int(date_str[11:13])
    
    # Create datetime object and format it
    dt = datetime(year, month, day, hour, minute)
    formatted = f"# {dt.strftime('%a %b %d @ %I:%M %p')}\n\n"
    
    for item in items:
        # Ensure each item starts with a capital letter
        item = item[0].upper() + item[1:] if item else item
        # Ensure each item ends with a period
        if not item.endswith(('.', '!', '?')):
            item += '.'
        formatted += f"- [ ] {item}\n"
    
    return formatted

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Post-process action items from voice memos.')
    parser.add_argument('-f', '--force', action='store_true', help='Force overwrite of existing files')
    args = parser.parse_args()
    
    # Set up directory paths
    voice_memo_dir = Path(VOICE_MEMOS_DIR)
    action_items_dir = voice_memo_dir / "action_items"
    todos_dir = voice_memo_dir / "TODOs"
    
    # Create TODOs directory if it doesn't exist
    todos_dir.mkdir(parents=True, exist_ok=True)
    
    if not action_items_dir.exists():
        print("No action items directory found")
        return
    
    # Process each action items file
    for action_file in action_items_dir.glob("*.txt"):
        print(f"Processing {action_file.name}...")
        
        # Check if output file already exists
        formatted_file = todos_dir / f"{action_file.stem}.txt"
        if formatted_file.exists() and not args.force:
            print(f"  Skipping: {formatted_file} already exists")
            continue
        
        # Read the action items
        with open(action_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract and format action items
        items = extract_action_items(content)
        
        # Skip if no items found
        if not items:
            print(f"  No action items found in {action_file.name}")
            continue
            
        formatted_content = format_action_items(items, action_file.stem)
        
        # Save formatted content in TODOs directory
        with open(formatted_file, 'w', encoding='utf-8') as f:
            f.write(formatted_content)
        
        print(f"  Formatted content saved to: {formatted_file}")

if __name__ == "__main__":
    main() 
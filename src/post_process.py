#!/usr/bin/env python3

import sys
import argparse
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

# Set up logging
logger = logging.getLogger(__name__)

def extract_action_items(content: str) -> list:
    """Extract action items from the content."""
    items = []
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('- [ ]'):
            items.append(line)
    return items

def format_action_items(items: list, source: str) -> str:
    """Format action items with source information."""
    if not items:
        return ""
    
    formatted = f"# Action Items from {source}\n\n"
    for item in items:
        formatted += f"{item}\n"
    return formatted

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Post-process action items from voice memos.')
    parser.add_argument('-f', '--force', action='store_true', help='Force overwrite of existing files')
    args = parser.parse_args()

    # Set up directory paths
    voice_memos_dir = Path(VOICE_MEMOS_DIR)
    action_items_dir = voice_memos_dir / "action_items"
    todos_dir = voice_memos_dir / "TODOs"

    # Create TODOs directory if it doesn't exist
    todos_dir.mkdir(parents=True, exist_ok=True)

    if not action_items_dir.exists():
        logger.error("No action items directory found")
        return

    # Process each action items file
    for action_file in action_items_dir.glob("*.txt"):
        logger.info(f"Processing {action_file.name}...")

        # Check if output file already exists
        formatted_file = todos_dir / f"{action_file.stem}.md"
        if formatted_file.exists() and not args.force:
            logger.info(f"Skipping: {formatted_file} already exists")
            continue

        # Read the action items
        with open(action_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract and format action items
        items = extract_action_items(content)

        # Skip if no items found
        if not items:
            logger.info(f"No action items found in {action_file.name}")
            continue

        formatted_content = format_action_items(items, action_file.stem)

        # Save formatted content in TODOs directory
        with open(formatted_file, 'w', encoding='utf-8') as f:
            f.write(formatted_content)

        logger.info(f"Formatted content saved to: {formatted_file}")

if __name__ == "__main__":
    main()

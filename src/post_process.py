#!/usr/bin/env python3

import argparse
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")

# Set up logging
logger = logging.getLogger(__name__)


def extract_action_items(content: str) -> List[str]:
    """Extract action items from content, cleaning up any non-letter characters from the beginning."""
    items = []
    for line in content.split("\n"):
        # Skip empty lines, headers, and lines starting with whitespace
        if (
            not line.strip()
            or line.strip().startswith(("Here are", "Rules were", "No action items"))
            or line.startswith((" ", "\t"))
        ):
            continue

        # Match lines that start with any list marker (-, *, +)
        if re.match(r"^\s*[-*+]", line):
            # Find the first letter in the line
            match = re.search(r"[a-zA-Z]", line)
            if match:
                item = line[match.start() :].strip()
                if item and not item.startswith("#"):  # Skip headers
                    # Remove any trailing "(no deadline or priority mentioned)"
                    item = re.sub(r"\s*\(no deadline or priority mentioned\)$", "", item)
                    items.append(item)
    return items


def format_action_items(items: List[str], filename: str) -> str:
    """Format action items in markdown checkbox format with consistent - [ ] prefix.
    Uses the filename (timestamp) to create a human-readable header."""
    if not items:
        return "# No items found\n"

    # Try to use a corresponding title file first (VoiceMemos/titles/<filename>.txt)
    title_path = Path(VOICE_MEMOS_DIR) / "titles" / f"{filename}.txt"
    formatted = ""
    if title_path.exists():
        try:
            with open(title_path, "r", encoding="utf-8") as tf:
                title_text = tf.read().strip()
                if title_text:
                    formatted = f"# {title_text}\n\n"
        except OSError:
            # If reading the title file fails, fall back to timestamp formatting below
            formatted = ""

    # If no title, fall back to using date and time from filename (format: YYYYMMDD_HHMMSS)
    if not formatted:
        date_str = filename.split(".")[0]

        # Validate filename format before parsing
        if not re.match(r"^\d{8}_\d{6}$", date_str):
            # If filename doesn't match expected format, use a generic header
            formatted = f"# Action Items from {filename}\n\n"
        else:
            try:
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                hour = int(date_str[9:11])
                minute = int(date_str[11:13])

                # Create datetime object and format it
                dt = datetime(year, month, day, hour, minute)
                formatted = f"# {dt.strftime('%a %b %d @ %I:%M %p')}\n\n"
            except (ValueError, IndexError):
                # If date parsing fails, use a generic header
                formatted = f"# Action Items from {filename}\n\n"

    for item in items:
        # Ensure each item starts with a capital letter
        item = item[0].upper() + item[1:] if item else item
        # Ensure each item ends with a period
        if not item.endswith((".", "!", "?")):
            item += "."
        formatted += f"- [ ] {item}\n"

    return formatted


def main() -> None:
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Post-process action items from voice memos.")
    parser.add_argument("-f", "--force", action="store_true", help="Force overwrite of existing files")
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
        with open(action_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract and format action items
        items = extract_action_items(content)

        # Skip if no items found
        if not items:
            logger.info(f"No action items found in {action_file.name}")
            continue

        formatted_content = format_action_items(items, action_file.stem)

        # Save formatted content in TODOs directory
        with open(formatted_file, "w", encoding="utf-8") as f:
            f.write(formatted_content)

        logger.info(f"Formatted content saved to: {formatted_file}")


if __name__ == "__main__":
    main()

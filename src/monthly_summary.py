#!/usr/bin/env python3
"""Generate LLM-powered monthly summaries from archived voice memo summaries."""

import argparse
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

import ollama
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Configuration from environment variables
VOICE_MEMOS_DIR = os.getenv("VOICE_MEMOS_DIR", "VoiceMemos")
OLLAMA_MODEL = os.getenv("OLLAMA_SUMMARY_MODEL", os.getenv("OLLAMA_EXTRACT_MODEL", "llama2"))
ollama.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")  # type: ignore

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Monthly summary prompt
MONTHLY_SUMMARY_PROMPT = """You are analyzing a collection of voice memo summaries from {month_name}.

Below are individual summaries from voice memos recorded throughout the month, listed
chronologically with their timestamps:

{summaries}

Please create a concise monthly summary in exactly 3 paragraphs:
- First paragraph: The main themes, topics, and recurring concerns of the month
- Second paragraph: Notable events, decisions, or milestones
- Third paragraph: Overall mood and sense of what the month was about

Write in plain prose without markdown, headers, or bullet points. Just three flowing
paragraphs that capture the essence of the month.

Monthly Summary:"""


def parse_timestamp(filename: str) -> Optional[datetime]:
    """Parse timestamp from filename format YYYYMMDD_HHMMSS."""
    try:
        base = Path(filename).stem
        if len(base) >= 15 and base[8] == "_":
            return datetime.strptime(base[:15], "%Y%m%d_%H%M%S")
    except (ValueError, IndexError):
        pass
    return None


def format_timestamp(dt: datetime) -> str:
    """Format datetime for display."""
    return dt.strftime("%a %b %d, %I:%M %p")


def get_month_summaries(month_dir: Path) -> List[Tuple[str, str, Optional[datetime]]]:
    """
    Get all summaries for a month.

    Returns list of (filename, summary_text, timestamp) tuples sorted by date.
    """
    summaries_dir = month_dir / "summaries"

    if not summaries_dir.exists():
        return []

    summaries = []
    for summary_file in sorted(summaries_dir.glob("*.txt")):
        try:
            with open(summary_file, "r", encoding="utf-8") as f:
                text = f.read().strip()
                if text:  # Only include non-empty summaries
                    timestamp = parse_timestamp(summary_file.name)
                    summaries.append((summary_file.name, text, timestamp))
        except (IOError, OSError) as e:
            logger.warning(f"Could not read {summary_file}: {e}")

    # Sort by timestamp if available, otherwise by filename
    summaries.sort(key=lambda x: x[2] or datetime.min)

    return summaries


def format_summaries_for_prompt(summaries: List[Tuple[str, str, Optional[datetime]]]) -> str:
    """Format summaries for inclusion in the prompt."""
    formatted = []
    for filename, text, timestamp in summaries:
        if timestamp:
            header = f"[{format_timestamp(timestamp)}]"
        else:
            header = f"[{Path(filename).stem}]"
        formatted.append(f"{header}\n{text}")

    return "\n\n---\n\n".join(formatted)


def get_month_name(month_str: str) -> str:
    """Convert YYYY-MM to human-readable month name."""
    try:
        dt = datetime.strptime(month_str, "%Y-%m")
        return dt.strftime("%B %Y")
    except ValueError:
        return month_str


def generate_monthly_summary(month: str, summaries: List[Tuple[str, str, Optional[datetime]]]) -> str:
    """Use Ollama to generate a monthly meta-summary."""
    month_name = get_month_name(month)
    formatted_summaries = format_summaries_for_prompt(summaries)

    prompt = MONTHLY_SUMMARY_PROMPT.format(month_name=month_name, summaries=formatted_summaries)

    logger.info(f"Sending {len(summaries)} summaries to Ollama ({OLLAMA_MODEL})...")

    try:
        response = ollama.chat(model=OLLAMA_MODEL, messages=[{"role": "user", "content": prompt}])
        return str(response["message"]["content"]).strip()
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        raise


def ensure_model_exists(model_name: str) -> None:
    """Ensure the specified Ollama model is available locally."""
    try:
        ollama.show(model=model_name)
    except Exception:
        logger.info(f"Model {model_name} not found locally. Pulling model...")
        try:
            ollama.pull(model=model_name)
            logger.info(f"Successfully pulled model {model_name}")
        except Exception as e:
            logger.error(f"Error pulling model {model_name}: {e}")
            sys.exit(1)


def process_month(month_dir: Path, force: bool = False, dry_run: bool = False) -> bool:
    """
    Process a single month's summaries.

    Returns True if a summary was generated, False otherwise.
    """
    month = month_dir.name
    output_file = month_dir / "MONTHLY_SUMMARY.md"

    # Check if output already exists
    if output_file.exists() and not force:
        logger.info(f"Skipping {month}: MONTHLY_SUMMARY.md already exists (use -f to overwrite)")
        return False

    # Get summaries
    summaries = get_month_summaries(month_dir)

    if not summaries:
        logger.info(f"Skipping {month}: No summaries found")
        return False

    logger.info(f"Processing {month}: {len(summaries)} voice memos")

    if dry_run:
        logger.info(f"  [DRY-RUN] Would generate summary from {len(summaries)} memos")
        return False

    # Generate summary
    try:
        meta_summary = generate_monthly_summary(month, summaries)
    except Exception as e:
        logger.error(f"Failed to generate summary for {month}: {e}")
        return False

    # Write output
    month_name = get_month_name(month)
    output_content = f"# Monthly Summary: {month_name}\n\n{meta_summary}\n"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(output_content)

    logger.info(f"Created: {output_file}")
    return True


def get_archive_months(archive_dir: Path) -> List[Path]:
    """Get all month directories in the archive, sorted chronologically."""
    if not archive_dir.exists():
        return []

    months = []
    for month_dir in archive_dir.iterdir():
        if month_dir.is_dir() and len(month_dir.name) == 7 and month_dir.name[4] == "-":
            months.append(month_dir)

    return sorted(months, key=lambda p: p.name)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate LLM-powered monthly summaries from archived voice memo summaries."
    )
    parser.add_argument("-m", "--month", help="Specific month to process (YYYY-MM format). Default: all months.")
    parser.add_argument("-f", "--force", action="store_true", help="Force regenerate existing summaries")
    parser.add_argument(
        "-n", "--dry-run", action="store_true", help="Show what would be processed without generating summaries"
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Ensure model exists (unless dry-run)
    if not args.dry_run:
        ensure_model_exists(OLLAMA_MODEL)

    # Set up paths
    archive_dir = Path(VOICE_MEMOS_DIR) / "archive"

    if not archive_dir.exists():
        logger.error(f"Archive directory not found: {archive_dir}")
        sys.exit(1)

    # Determine which months to process
    if args.month:
        # Validate month format
        try:
            datetime.strptime(args.month, "%Y-%m")
        except ValueError:
            logger.error(f"Invalid month format: {args.month}. Use YYYY-MM (e.g., 2025-12)")
            sys.exit(1)

        month_dir = archive_dir / args.month
        if not month_dir.exists():
            logger.error(f"Month directory not found: {month_dir}")
            sys.exit(1)

        months_to_process = [month_dir]
    else:
        months_to_process = get_archive_months(archive_dir)

    if not months_to_process:
        logger.info("No months found to process")
        return

    logger.info(f"Found {len(months_to_process)} month(s) to process")

    if args.dry_run:
        logger.info("[DRY-RUN MODE] No summaries will be generated")

    # Process each month
    generated = 0
    for month_dir in months_to_process:
        if process_month(month_dir, force=args.force, dry_run=args.dry_run):
            generated += 1

    # Summary
    if not args.dry_run:
        logger.info(f"Generated {generated} monthly summary/summaries")


if __name__ == "__main__":
    main()

#!/bin/bash
# monthly_summary.sh - Generate LLM-powered monthly summaries
#
# Usage:
#   ./monthly_summary.sh              # Generate for all months
#   ./monthly_summary.sh -m 2025-12   # Generate for specific month
#   ./monthly_summary.sh -f           # Force regenerate all
#   ./monthly_summary.sh -n           # Dry-run mode

# Change to script directory to ensure relative paths work
cd "$(dirname "$0")" || exit 1

# Activate virtual environment if it exists
if [ -d "vibenv" ]; then
    source vibenv/bin/activate
fi

# Run the Python script with all arguments
python src/monthly_summary.py "$@"


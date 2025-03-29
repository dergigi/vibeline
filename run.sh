#!/bin/bash

# Activate virtual environment
source vibenv/bin/activate

echo "Processing voice memos..."
python src/summarize_transcripts.py

echo "Done! All voice memos have been processed and summarized." 
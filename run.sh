#!/bin/bash

# Activate virtual environment
source vibenv/bin/activate

echo "Processing voice memos to create transcripts..."
./process_voice_memos.sh

echo "Creating summaries for transcripts..."
python src/summarize_transcripts.py

echo "Done! All voice memos have been processed and summarized." 
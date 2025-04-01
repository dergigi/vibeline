#!/bin/bash

# Activate virtual environment
source vibenv/bin/activate

echo "Processing all voice memos..."
for file in VoiceMemos/*.m4a; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        ./process.sh "$file"
        echo "----------------------------------------"
    fi
done

echo "Done! All voice memos have been processed." 
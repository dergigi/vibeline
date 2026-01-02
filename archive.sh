#!/bin/bash
# archive.sh - Archive processed voice memos by month
#
# Usage:
#   ./archive.sh           # Archive all processed files from previous months
#   ./archive.sh -n        # Dry-run mode (show what would be archived)
#   ./archive.sh -v        # Verbose output
#
# Runs via cron on the 1st of each month to archive the previous month's files.
# Example cron entry:
#   0 3 1 * * cd /path/to/vibeline && ./archive.sh >> logs/archive.log 2>&1

set -euo pipefail

# Configuration
VOICE_MEMOS_DIR="${VOICE_MEMOS_DIR:-VoiceMemos}"
ARCHIVE_DIR="$VOICE_MEMOS_DIR/archive"

# Options
DRY_RUN=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while getopts "nvh" opt; do
    case $opt in
        n) DRY_RUN=true ;;
        v) VERBOSE=true ;;
        h)
            echo "Usage: $0 [-n] [-v] [-h]"
            echo "  -n  Dry-run mode (show what would be archived)"
            echo "  -v  Verbose output"
            echo "  -h  Show this help message"
            exit 0
            ;;
        *)
            echo "Usage: $0 [-n] [-v] [-h]"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_dry_run() {
    echo -e "${YELLOW}[DRY-RUN]${NC} $1"
}

# Get the current year-month for comparison
CURRENT_YEAR_MONTH=$(date +%Y-%m)

log_info "Starting archive process..."
log_info "Voice memos directory: $VOICE_MEMOS_DIR"
log_info "Archive directory: $ARCHIVE_DIR"
log_info "Current month: $CURRENT_YEAR_MONTH (will not be archived)"

if [ "$DRY_RUN" = true ]; then
    log_dry_run "Dry-run mode enabled - no files will be moved"
fi

# Check if voice memos directory exists
if [ ! -d "$VOICE_MEMOS_DIR" ]; then
    log_error "Voice memos directory does not exist: $VOICE_MEMOS_DIR"
    exit 1
fi

# Create archive directory if it doesn't exist (unless dry-run)
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$ARCHIVE_DIR"
fi

# Counters
files_archived=0
files_skipped_current=0
files_skipped_unprocessed=0
total_related_files=0

# Find all .m4a files in the voice memos directory (excluding archive)
while IFS= read -r -d '' m4a_file; do
    # Get just the filename without path
    filename=$(basename "$m4a_file")
    basename_no_ext="${filename%.m4a}"
    
    log_verbose "Processing: $filename"
    
    # Get the file's modification date (YYYY-MM format)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        file_year_month=$(stat -f "%Sm" -t "%Y-%m" "$m4a_file")
    else
        # Linux
        file_year_month=$(date -r "$m4a_file" +%Y-%m)
    fi
    
    log_verbose "  File date: $file_year_month"
    
    # Skip if file is from the current month
    if [ "$file_year_month" = "$CURRENT_YEAR_MONTH" ]; then
        log_verbose "  Skipping: File is from current month"
        ((files_skipped_current++))
        continue
    fi
    
    # Check if the file has been processed (transcript exists)
    transcript_file="$VOICE_MEMOS_DIR/transcripts/${basename_no_ext}.txt"
    if [ ! -f "$transcript_file" ]; then
        log_verbose "  Skipping: No transcript found (not processed)"
        ((files_skipped_unprocessed++))
        continue
    fi
    
    log_info "Archiving: $filename (from $file_year_month)"
    
    # Create the archive month directory
    archive_month_dir="$ARCHIVE_DIR/$file_year_month"
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$archive_month_dir"
    fi
    
    # Find all related files by basename (excluding archive directory)
    # This finds files like: transcripts/name.txt, summaries/name.txt, etc.
    # Use -L to follow symlinks (VoiceMemos may be a symlink)
    related_files=()
    while IFS= read -r -d '' related_file; do
        related_files+=("$related_file")
    done < <(find -L "$VOICE_MEMOS_DIR" -path "$ARCHIVE_DIR" -prune -o -name "${basename_no_ext}.*" -type f -print0 2>/dev/null)
    
    # Move each related file
    for related_file in "${related_files[@]}"; do
        # Get the relative path from VOICE_MEMOS_DIR
        relative_path="${related_file#$VOICE_MEMOS_DIR/}"
        
        # Determine the target path in the archive
        target_path="$archive_month_dir/$relative_path"
        target_dir=$(dirname "$target_path")
        
        if [ "$DRY_RUN" = true ]; then
            log_dry_run "  Would move: $relative_path -> archive/$file_year_month/$relative_path"
        else
            # Create target directory if needed
            mkdir -p "$target_dir"
            
            # Move the file
            mv "$related_file" "$target_path"
            log_verbose "  Moved: $relative_path"
        fi
        
        ((total_related_files++))
    done
    
    ((files_archived++))
    
done < <(find -L "$VOICE_MEMOS_DIR" -maxdepth 1 -name "*.m4a" -type f -print0 2>/dev/null)

# Summary
echo ""
log_info "========== Archive Summary =========="
if [ "$DRY_RUN" = true ]; then
    log_info "Mode: DRY-RUN (no files were moved)"
fi
log_info "Recordings archived: $files_archived"
log_info "Related files moved: $total_related_files"
log_info "Skipped (current month): $files_skipped_current"
log_info "Skipped (not processed): $files_skipped_unprocessed"
log_info "====================================="

if [ "$DRY_RUN" = true ] && [ $files_archived -gt 0 ]; then
    echo ""
    log_info "Run without -n flag to actually archive these files."
fi


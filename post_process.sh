#!/bin/bash

# Activate the virtual environment
[ -d "vibenv" ] && source vibenv/bin/activate

# Run the Python script with any provided arguments
python src/post_process.py "$@"

# Deactivate the virtual environment
[ -d "vibenv" ] && deactivate

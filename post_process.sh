#!/bin/bash

# Activate the virtual environment
source vibenv/bin/activate

# Run the Python script with any provided arguments
python src/post_process.py "$@"

# Deactivate the virtual environment
deactivate 
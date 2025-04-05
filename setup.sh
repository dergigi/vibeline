#!/bin/bash

# Check if virtual environment exists
if [ ! -d "vibenv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv vibenv
fi

# Activate virtual environment
echo "Activating virtual environment..."
[ -d "vibenv" ] && source vibenv/bin/activate

# Install requirements
echo "Installing requirements..."
pip3 install -r requirements.txt

echo "Setup complete! Virtual environment is activated and requirements are installed."

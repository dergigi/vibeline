#!/bin/bash

# Check if pyenv is installed
if ! command -v pyenv &> /dev/null; then
    echo "pyenv is not installed. Please install pyenv first."
    echo "You can install it using: brew install pyenv (or similar)"
    exit 1
fi

# Read Python version from .python-version file
PYTHON_VERSION=$(cat .python-version)

# Install Python version if not already installed
if ! pyenv versions | grep -q "$PYTHON_VERSION"; then
    echo "Installing Python $PYTHON_VERSION..."
    pyenv install "$PYTHON_VERSION"
fi

# Set local Python version
echo "Setting Python version to $PYTHON_VERSION..."
pyenv local "$PYTHON_VERSION"

# Check if virtual environment exists
if [ ! -d "vibenv" ]; then
    echo "Creating virtual environment..."
    python -m venv vibenv
fi

# Activate virtual environment
echo "Activating virtual environment..."
[ -d "vibenv" ] && source vibenv/bin/activate

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

echo "Setup complete! Virtual environment is activated and requirements are installed."

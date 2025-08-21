#!/bin/bash

# Development setup script for VibeLine
# This script sets up the development environment with all linting tools

set -e

echo "🚀 Setting up VibeLine development environment..."

# Check if Python 3.11 is available
if ! command -v python3.11 &> /dev/null; then
    echo "❌ Python 3.11 is required but not found."
    echo "Please install Python 3.11 and try again."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "vibenv" ]; then
    echo "📦 Creating virtual environment..."
    python3.11 -m venv vibenv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source vibenv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install development dependencies
echo "📚 Installing development dependencies..."
pip install -e ".[dev]"

# Run initial formatting on existing code
echo "🎨 Running initial code formatting..."
black src/ tests/ run/ 2>/dev/null || echo "⚠️  Some files couldn't be formatted (this is normal for new projects)"
isort src/ tests/ run/ 2>/dev/null || echo "⚠️  Some files couldn't be sorted (this is normal for new projects)"

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "  make help          - Show all available commands"
echo "  make lint          - Run all linting checks"
echo "  make format        - Format code with Black and isort"
echo ""
echo "💡 Pre-commit hooks are available but not installed by default."
echo "   Run 'pre-commit install' if you want automatic checks on commits."

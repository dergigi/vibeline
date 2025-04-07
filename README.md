# VibeLine

VibeLine is a powerful voice memo processing system that uses AI to extract meaningful content from your voice recordings. It uses a flexible plugin system to generate various types of content like summaries, blog posts, app ideas, and action items.

## Features

- 🎙️ Automatic voice memo transcription
- 🔌 Flexible plugin system for content extraction
- 🤖 AI-powered content generation using Ollama
- 📝 Built-in plugins for:
  - Summaries
  - Blog posts
  - App ideas
  - Action items/TODOs
- 🎯 Smart plugin matching based on transcript content
- 📁 Organized output directory structure

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vibeline.git
cd vibeline
```

2. Make sure you have Python 3.11.2 installed. The project uses `.python-version` to specify the required Python version.

3. Run the setup script:
```bash
./setup.sh
```

This will:
- Create a virtual environment named `vibenv`
- Activate the virtual environment
- Install all required dependencies
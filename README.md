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

2. Create and activate a virtual environment:
```bash
python -m venv vibenv
source vibenv/bin/activate  # On Windows: vibenv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy the example environment file and edit it with your settings:
```bash
cp .env.example .env
```

5. Make sure you have [Ollama](https://ollama.ai) installed and running.

## Usage

### Basic Usage

1. Place your voice memo (`.m4a` file) in the `VoiceMemos` directory
2. Process the voice memo:
```bash
./process.sh VoiceMemos/your_memo.m4a
```

This will:
1. Transcribe the audio
2. Extract content based on active plugins
3. Save outputs in organized directories

### Directory Structure

```
VoiceMemos/
├── transcripts/     # Voice memo transcripts
├── summaries/       # Generated summaries
├── blog_posts/      # Generated blog posts
├── app_ideas/      # Generated app ideas
└── action_items/  # Generated action items
```

## Plugin System

VibeLine uses a flexible YAML-based plugin system for content extraction. Each plugin is defined in a YAML file with the following structure:

```yaml
name: plugin_name
description: What the plugin does
model: llama2  # Optional, falls back to ENV default
type: or       # Comparison type: 'and' or 'or'
run: matching  # When to run: 'always' or 'matching'
output_extension: .txt  # Optional, defaults to .txt
prompt: |
  Your prompt template here.
  Use {transcript} for the transcript content.
  Use {summary} for the summary content.
```

### Plugin Types

- **Run Types**:
  - `always`: Plugin runs for every transcript
  - `matching`: Plugin runs only when keywords match

- **Comparison Types**:
  - `or`: Runs if any keyword matches
  - `and`: Runs only if all keywords match

### Creating a New Plugin

1. Create a new YAML file in the `plugins` directory
2. Define the plugin configuration
3. Add your prompt template
4. The plugin will be automatically loaded on the next run

### Example Plugin

```yaml
name: blog_post
description: Generate draft blog posts from transcripts
model: llama2
type: or
run: matching
output_extension: .md
prompt: |
  Based on the following transcript, create a blog post...
  
  Transcript:
  {transcript}
```

## Environment Variables

- `OLLAMA_EXTRACT_MODEL`: Default model for content extraction
- `OLLAMA_SUMMARIZE_MODEL`: Default model for summarization
- `VOICE_MEMOS_DIR`: Directory for voice memos (default: "VoiceMemos")

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
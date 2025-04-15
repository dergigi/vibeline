# VibeLine

VibeLine is a powerful voice memo processing system that uses AI to extract meaningful content from your voice recordings. It uses a flexible plugin system to generate various types of content like summaries, blog posts, app ideas, and action items.

The main idea is to let your computer do computer work, while you're out and about touching grass and stuff. Simply speak into the microphone & the vibeline will do the rest. (Or at least most of it.)

![Touch Grass](touch-grass.png)

> **Note:** VibeLine is a highly opinionated system with specific design choices and workflows. While it offers flexibility through its plugin system, it follows a particular philosophy in how voice memos should be processed and structured. If you're looking for a more generic or customizable solution, this might not be the right tool for you.
 
## Features

- 🎙️ Automatic voice memo transcription
- 🧹 Transcript cleaning with customizable vocabulary
- 🔌 Flexible plugin system for content extraction
- 🤖 AI-powered content generation using Ollama
- 📝 Built-in plugins for:
  - Summaries
  - Blog posts
  - App ideas
  - Action items/TODOs
- 🎯 Smart plugin matching based on transcript content
- 📁 Organized output directory structure

## UI Project

There's also a separate [UI project](https://github.com/dergigi/vibeline-ui) that provides a web interface for VibeLine. It's built with Next.js and provides a more user-friendly way to interact with your voice memos and generated content.

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

## How to use

### Basic Usage

- Use whatever you want to record voice notes (I use [Fossify](https://github.com/FossifyOrg/Voice-Recorder))
- Use whatever you want to sync your files (I use [Syncthing](https://syncthing.net/))
- Use whatever you want to look at the markdown/output files (I use [Zettel Notes](https://www.zettelnotes.com/))
- Run the `./watch.sh` script on an idle machine to get the most out of it

### Transcript Cleaning

VibeLine includes a transcript cleaning feature that corrects common transcription errors based on a customizable vocabulary file. This is especially useful for technical terms, names, or domain-specific jargon that speech recognition models often misinterpret.

To use this feature:

1. Edit the `VOCABULARY.txt` file in the root directory to add your custom corrections:
```
# Format: incorrect_word -> correct_word
Noster -> Nostr
```

2. The transcript cleaner will automatically run as part of the extraction process.

3. You can customize the behavior with these options:
   - `--no-clean`: Skip the transcript cleaning step entirely

## Contributors

[![Contributors](https://contrib.rocks/image?repo=dergigi/vibeline)](https://github.com/dergigi/vibeline/graphs/contributors)

## Contributing

If you make a contribution (always welcome!) please publicly tag [@dergigi](https://njump.me/_@dergigi.com) or one of the maintainers on nostr so that we know something happened here. (GitHub notifications are rekt.)
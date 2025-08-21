# VibeLine

VibeLine is a powerful voice memo processing system that uses AI to extract meaningful content from your voice recordings. It uses a flexible plugin system to generate various types of content like summaries, blog posts, app ideas, and action items.

The main idea is to let your computer do computer work, while you're out and about touching grass and stuff. Simply speak into the microphone & the vibeline will do the rest. (Or at least most of it.)

![Touch Grass](touch-grass.png)

> **Note:** VibeLine is a highly opinionated system with specific design choices and workflows. While it offers flexibility through its plugin system, it follows a particular philosophy in how voice memos should be processed and structured. If you're looking for a more generic or customizable solution, this might not be the right tool for you.
 
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

## Development Setup

For contributors, we recommend using the development setup script:

```bash
./dev-setup.sh
```

This will:
- Set up the development environment with all linting tools
- Format existing code
- Provide convenient make commands for development
- Optionally install pre-commit hooks (run `make setup-pre-commit` if desired)

### Available Development Commands

- `make help` - Show all available commands
- `make lint` - Run all linting checks (Black, isort, flake8, mypy)
- `make format` - Format code with Black and isort
- `make test` - Run tests
- `make check-all` - Run linting and tests

### Code Quality

This project uses several tools to maintain code quality:

- **Black** - Code formatting
- **isort** - Import sorting
- **flake8** - Style and error checking
- **mypy** - Type checking
- **pre-commit** - Git hooks for automatic checks (optional)

All PRs must pass linting checks before they can be merged. The GitHub Actions workflow will catch any issues, so pre-commit hooks are optional for local development. See `.github/BRANCH_PROTECTION.md` for details on setting up branch protection rules.

## How to use

- Use whatever you want to record voice notes (I use [Fossify](https://github.com/FossifyOrg/Voice-Recorder))
- Use whatever you want to sync your files (I use [Syncthing](https://syncthing.net/))
- Use whatever you want to look at the markdown/output files (I use [Zettel Notes](https://www.zettelnotes.com/))
- Run the `./watch.sh` script on an idle machine to get the most out of it

## Contributors

[![Contributors](https://contrib.rocks/image?repo=dergigi/vibeline)](https://github.com/dergigi/vibeline/graphs/contributors)

## Contributing

If you make a contribution (always welcome!) please publicly tag [@dergigi](https://njump.me/_@dergigi.com) or one of the maintainers on nostr so that we know something happened here. (GitHub notifications are rekt.)
# VibeLine

VibeLine is a powerful voice memo processing system that uses AI to extract meaningful content from your voice recordings. It uses a flexible plugin system to generate various types of content like summaries, blog posts, app ideas, and action items.

The main idea is to let your computer do computer work, while you're out and about touching grass and stuff. Simply speak into the microphone & the vibeline will do the rest. (Or at least most of it.)

![Touch Grass](touch-grass.png)

> **Note:** VibeLine is a highly opinionated system with specific design choices and workflows. While it offers flexibility through its plugin system, it follows a particular philosophy in how voice memos should be processed and structured. If you're looking for a more generic or customizable solution, this might not be the right tool for you.

## Architecture: the filesystem is the database

**Hard constraint:** Files and directories are the sole source of application state. The pipeline and UI share `VoiceMemos`. No separate database (including SQLite) or state store may be introduced. In-memory caches must be rebuildable from files.

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

## Project Structure

- `src/`, `plugins/`: processing pipeline and plugins.
- `ui/`: Next.js web interface; see [UI setup](ui/README.md).
- `VoiceMemos/`: shared filesystem state for both.

The processor and UI share one version and changelog. From this directory, run `npm run ui:install` and `npm run ui:dev` to start the UI at <http://localhost:555>. The processor runs separately via `./watch.sh`.

`docker compose up --build -d` builds both components from this checkout. Planned distribution targets are Homebrew (macOS), AUR (Arch/Omarchy), and Synology Container Manager, with local or remote processing. These installers are not yet available.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/dergigi/vibeline.git
cd vibeline
```

1. Make sure you have Python 3.11.2 installed. The project uses `.python-version` to specify the required Python version.

2. Run the setup script:

```bash
./setup.sh
```

This will:

- Create a virtual environment named `vibenv`
- Activate the virtual environment
- Install all required dependencies

### Optional CLI dependencies

- **Blossom upload plugin**: requires the `nak` CLI to be installed and available
  on your `PATH`. See [fiatjaf/nak](https://github.com/fiatjaf/nak).
- **NIP-17 DM plugin**: also uses `nak` for gift-wrapped DMs.

## Development Setup

With Node.js 22 or newer installed, run the development setup script:

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
- `make lint` - Run all linting checks (Black, isort, flake8, mypy, markdownlint)
- `make lint-markdown` - Run markdown linting only
- `make format` - Format code with Black and isort
- `make test` - Run tests
- `make check-all` - Run linting and tests

### Version Management

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commits and squash PR titles: `type(scope): description`. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- Use [Semantic Versioning](https://semver.org/): patch for fixes, minor for compatible features, major for breaking changes. During `0.x`, use minor bumps for breaking changes. Keep version files and `vX.Y.Z` release tags consistent.
- Maintain [CHANGELOG.md](CHANGELOG.md) using [Keep a Changelog](https://keepachangelog.com/en/2.0.0/). Add notable changes under `[Unreleased]`; at release, move them into a dated `X.Y.Z` section. Review and commit release files before tagging.

**Available version commands:**

- `make version-patch` - Bump patch version (0.1.0 → 0.1.1)
- `make version-minor` - Bump minor version (0.1.0 → 0.2.0)
- `make version-major` - Bump major version (0.1.0 → 1.0.0)
- `make version-show` - Show version management help
- `make docker-build` - Build both Docker images with the current version
- `make docker-push` - Push both Docker images to the registry

**Prepare a release without tagging:**

```bash
python scripts/version.py patch --no-tag    # For bug fixes
python scripts/version.py minor --no-tag    # For new features or pre-1.0 breaking changes
python scripts/version.py major --no-tag    # For breaking changes after 1.0
```

The version script synchronizes `pyproject.toml`, both npm manifests and lockfiles, and both Compose image tags. Review and commit the release files before creating and pushing `vX.Y.Z`; version commands never tag or push automatically. Both images are built from that same tag. When transferring UI image publishing from the old repository, grant this repository Actions access to the existing GHCR `vibeline-ui` package.

**Changelog Guidelines:**

- Use the [Keep a Changelog](https://keepachangelog.com/en/2.0.0/) format
- Categorize changes as Added, Changed, Deprecated, Removed, Fixed, or Security; omit empty sections
- Write clear, concise descriptions
- Include breaking changes prominently

### Code Quality

This project uses several tools to maintain code quality:

- **Black** - Code formatting
- **isort** - Import sorting
- **flake8** - Style and error checking
- **mypy** - Type checking
- **markdownlint-github** - Markdown linting using [GitHub's recommended rules](https://github.com/github/markdownlint-github)
- **pre-commit** - Git hooks for automatic checks (optional)

All PRs must pass linting checks before they can be merged. The GitHub Actions workflow will catch any issues, so pre-commit hooks are optional for local development. See `.github/BRANCH_PROTECTION.md` for details on setting up branch protection rules.

## How to use

### Basic Usage

- Use whatever you want to record voice notes (I use [Fossify](https://github.com/FossifyOrg/Voice-Recorder))
- Use whatever you want to sync your files (I use [Syncthing](https://syncthing.net/))
- Use whatever you want to look at the markdown/output files (I use [Zettel Notes](https://www.zettelnotes.com/))
- Run the `./watch.sh` script on an idle machine to get the most out of it

### Transcription options

You can control Whisper transcription via environment variables:

- `WHISPER_MODEL`: Choose the Whisper model (e.g., `base`, `small`, `medium`, `large-v3`). Models with the `.en` suffix are English-only (e.g., `base.en`).
- `FORCE_LANGUAGE`: Force a specific language for transcription. When set, VibeLine will call Whisper with `--language <code>`. For example, to force English:

  ```bash
  export FORCE_LANGUAGE=en
  # or per-run
  FORCE_LANGUAGE=en ./transcribe.sh VoiceMemos/your-file.m4a
  ```

If `FORCE_LANGUAGE` is unset, Whisper will auto-detect the language.

### Transcript Cleaning

VibeLine includes a transcript cleaning feature that corrects common transcription errors based on customizable vocabulary files. This is especially useful for technical terms, names, or domain-specific jargon that speech recognition models often misinterpret.

#### Base Vocabulary

The project includes a base vocabulary file (`VOCABULARY.txt`) with common corrections that are shared across all users. This file is version controlled and should contain general corrections that apply to most users.

#### Personal Vocabulary

You can create your own personal vocabulary file for corrections specific to your work, names, or domain. This file is stored in your home directory and will not be committed to version control.

**To set up your personal vocabulary:**

1. Create the VibeLine configuration directory:

   ```bash
   mkdir -p ~/.vibeline
   ```

2. Create your personal vocabulary file:

   ```bash
   touch ~/.vibeline/vocabulary.txt
   ```

3. Edit `~/.vibeline/vocabulary.txt` to add your personal corrections:

   ```txt
   # Personal names and terms
   John -> Jon
   Sarah -> Sara
   my company -> Acme Corp
   
   # Technical terms specific to your work
   my framework -> React
   my database -> PostgreSQL
   ```

4. The system will automatically use both vocabulary files, with personal corrections taking precedence.

#### Configuration

You can customize the vocabulary files using environment variables:

- `VOCABULARY_FILE`: Path to the base vocabulary file (default: `VOCABULARY.txt`)
- `PERSONAL_VOCABULARY_FILE`: Path to your personal vocabulary file (default: `~/.vibeline/vocabulary.txt`)

#### Usage

The transcript cleaner will automatically run as part of the extraction process. You can customize the behavior with these options:

- `--no-clean`: Skip the transcript cleaning step entirely

### NIP-17 DM Configuration

If you use the DM plugin (`plugins/dm.yaml`), configure these environment variables:

- `DM_NSEC`: Sender private key (`nsec`, `hex`, or `ncryptsec`)
- `DM_RELAYS`: Space-separated relay list used for DM publishing (recommended)
- `RELAYS`: Fallback relay list if `DM_RELAYS` is not set
- `CONTACTS_FILE`: Contacts mapping file (default: `~/.vibeline/contacts.txt`)

Contacts format (one contact per line):

```txt
name|alias1|alias2, npub1...
```

For quick manual checks, create a short transcript that starts with `Hey <name>` and run:

```bash
scripts/dm.sh /path/to/transcript.txt
```

## Contributors

[![Contributors](https://contrib.rocks/image?repo=dergigi/vibeline)](https://github.com/dergigi/vibeline/graphs/contributors)

## Contributing

If you make a contribution (always welcome!) please publicly tag [@dergigi](https://njump.me/_@dergigi.com) or one of the maintainers on nostr so that we know something happened here. (GitHub notifications are rekt.)

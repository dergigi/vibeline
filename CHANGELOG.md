# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Document the filesystem-only architecture constraint and commit, versioning, and changelog conventions.
- Include the web UI under `ui/`, with shared data paths, build commands, CI, and versioning.

### Changed

- Build both container images from this repository; use port 555 for the UI.
- Prepare releases without automatically creating or pushing tags.

### Security

- Upgrade Next.js from 15.2.3 to 15.5.26 and align its ESLint configuration to address reported critical vulnerabilities.
- Fail UI CI when npm reports critical dependency vulnerabilities.

## [0.0.3] - 2025-08-22

### Added

- Vocabulary corrections for technical terms and names
- Logging system across Python files
- Keyword matching with trigger keywords
- Add `ignore_if` field to prevent plugin execution based on transcript content
- Add 'ramble' to `action_item` ignore conditions
- Mood plugin for sentiment analysis
- Build idea plugin with command execution support
- Command execution support for plugins
- Touch grass philosophy documentation and image
- Title plugin for podcast episode title generation
- Linting setup with `make lint`
- Markdown linting integration with GitHub Actions
- Versioning and changelog system with semantic versioning management

### Changed

- Transcript file naming patterns: `.txt` & `.txt.orig` (if cleaned)
- Upgrade default model to `llama3`
- Suggest `tinyllama` as default model
- Remove explicit model definitions from plugins, use `OLLAMA_MODEL` from env
- Make plugin type field optional with default `'and'` and ignore when run is `'always'`
- Derive plugin names from filename instead of explicit name field

### Fixed

- Handle symlinks across platforms
- Use absolute path for directory watching
- Add error handling for invalid filenames in `post_process.py`
- Simplify GitHub Actions to use `make lint` command
- Remove `ignore_if` from therapist and mood plugins

### Removed

- Remove test infrastructure and excessive linting documentation files
- Disable `build_app` and `svg` plugins
- Remove redundant name field from plugin yamls
- Remove `svg.yaml` and keep backup file

## [0.0.2] - 2025-04-08

### Added

- Docker compose support
- Decision plugin to extract decisions from transcripts
- Idea plugin configuration
- SRT output format alongside TXT for transcripts
- Conditional whisper output format based on audio duration
- ModelContext Python SDK dependency

### Changed

- Switch from whisper-ctranslate2 to openai-whisper
- Update Python version to 3.11.2
- Change decision plugin output format from JSON to text
- Remove SVG plugin
- Remove determine_content_type function in favor of plugin system
- Remove generate_additional_content function in favor of plugin-based implementation
- Remove generate_summary function in favor of summary plugin

### Fixed

- Load .env file in transcribe script
- Remove space from python-version to fix script
- Ignore lines with leading whitespace in action item extraction
- Make TODO files md files
- Update MCP package name
- Update mcptools package source
- Make SVG plugin output SVG files
- Update action item plugin prompt formatting rules

### Removed

- SVG plugin
- .python-version file

## [0.0.1] - 2025-04-03

### Added

- Initial release with basic voice memo processing
- Todo extraction functionality
- Plugin system for content extraction
- Summary generation capabilities
- File watching and processing
- Action item extraction and formatting

### Changed

- Clarify prompt instructions for summaries

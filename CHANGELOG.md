# Changelog

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2025-08-22

### Added
- Versioning and changelog system with semantic versioning management
- Docker versioning support with automatic image tag updates
- Markdown linting integration with GitHub Actions
- Comprehensive linting setup with optional pre-commit hooks
- Title plugin for podcast episode title generation
- Mood plugin for sentiment analysis
- Build idea plugin with command execution support
- Command execution support for plugins
- Comprehensive vocabulary corrections for technical terms and names
- Improved transcript file naming patterns
- Consistent logging system across Python files
- Enhanced keyword matching with trigger keywords
- Touch grass philosophy documentation and image

### Changed
- Upgrade default model to `llama3` for better performance
- Suggest `tinyllama` as default model for better performance
- Remove explicit model definitions from plugins, use OLLAMA_MODEL from env
- Make plugin type field optional with default 'and' and ignore when run is 'always'
- Derive plugin names from filename instead of explicit name field
- Reorganize and document Sovereign Engineering section in vocabulary
- Improve SCC section order and fix SECO comment

### Fixed
- Fixed markdown linting issues in CI pipeline by removing problematic `@github/markdownlint-github` dependency
- Resolved module resolution errors in GitHub Actions workflow
- Simplified markdownlint configuration to use standard rules with custom overrides
- Add Node.js setup to GitHub Actions lint workflow
- Resolve all markdown linting issues
- Add error handling for invalid filenames in post_process.py
- Fix add missing SCC space-separated corrections
- Update SimpleX correction to handle lowercase transcription
- Add types-PyYAML dependency to GitHub Actions
- Simplify GitHub Actions to use make lint command
- Update GitHub Actions workflow to remove test directory references
- Resolve all mypy type checking issues
- Update dev-setup.sh to remove test and pre-commit references
- Remove test infrastructure and update linting configuration
- Use absolute path for directory watching
- Watch resolved directory path for voice memos
- Restore working path handling for voice memos
- Handle symlinks consistently across platforms
- Store full paths for voice memo processing
- Use correct base directory for voice memo processing
- Add missing os import in post_process
- Fix parameter order in Plugin instance creation
- Reorder Plugin dataclass fields to fix TypeError
- Add 'ramble' to action_item ignore conditions
- Remove `ignore_if` from therapist and mood plugins
- Add `ignore_if` field to prevent plugin execution based on transcript content
- Fix linting and type checking issues

### Removed
- Remove test infrastructure and excessive linting documentation files
- Disable build_app and svg plugins
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
- File watching and automatic processing
- Action item extraction and formatting

### Changed

- Clarify prompt instructions for summaries

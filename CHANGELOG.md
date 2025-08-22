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

### Fixed
- Fixed markdown linting issues in CI pipeline by removing problematic `@github/markdownlint-github` dependency
- Resolved module resolution errors in GitHub Actions workflow
- Simplified markdownlint configuration to use standard rules with custom overrides

### Added
- Versioning and changelog system
- Semantic versioning management script
- Makefile integration for version commands

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

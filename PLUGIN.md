# Vibeline Plugin System

This document explains the plugin system in Vibeline, how plugins work, and how to create your own plugins.

## Overview

Plugins in Vibeline extend the system's functionality by processing transcripts or other text inputs to generate specific outputs. They are defined in YAML files and managed by the `PluginManager`. 

Plugins can:
- Extract information (like action items or decisions)
- Generate content (like blog posts or summaries)
- Create files with custom extensions
- Trigger commands based on the input

## Plugin Configuration

### Basic Structure

Plugins are defined as YAML files in the `plugins` directory. A simple plugin looks like:

```yaml
name: summary
description: Generate a concise summary of the transcript
type: or
run: always
prompt: |
  Please provide a short, 2-3 sentence summary of the following transcript.
  
  Transcript:
  {transcript}
  
  Summary:
```

### Required Fields

| Field | Description |
|-------|-------------|
| `name` | Unique identifier for the plugin (used for referencing) |
| `description` | Brief explanation of what the plugin does |
| `type` | Comparison type (`and` or `or`) for matching conditions |
| `run` | When to run the plugin (`always` or `matching`) |
| `prompt` | Template used for text generation with placeholders |

### Optional Fields

| Field | Description | Default Value |
|-------|-------------|---------------|
| `model` | Specific language model to use | System default |
| `output_extension` | File extension for the output | `.txt` |
| `command` | Command to execute after generation | None |

## Plugin Types and Run Modes

### Type Field

The `type` field determines how conditions are evaluated for plugin matching:

- `and`: All conditions must match for the plugin to be considered applicable
- `or`: Any condition matching makes the plugin applicable

### Run Field

The `run` field determines when the plugin executes:

- `always`: The plugin runs on every input, regardless of any matching conditions
- `matching`: The plugin only runs when its matching conditions evaluate to true

## Prompt Templates

The `prompt` field contains the template used for generating content. Prompts can include placeholders that will be replaced with actual values:

- `{transcript}`: The main text input (typically a transcript)
- `{summary}`: A summary of the transcript (if available)

Example:
```yaml
prompt: |
  Based on the following transcript, create a blog post.
  
  Transcript:
  {transcript}
  
  Summary:
  {summary}
```

## Command Execution

Plugins can execute commands after generating output using the `command` field. The special placeholder `FILE` will be replaced with the path to the generated output file:

```yaml
command: bun /path/to/script.ts FILE
```

This allows for post-processing of the generated content or triggering additional workflows.

## Example Plugins

### Summary Generator

```yaml
name: summary
description: Generate a concise summary of the transcript
type: or
run: always
prompt: |
  Please provide a short, 2-3 sentence summary of the following transcript.
  
  Transcript:
  {transcript}
  
  Summary:
```

### Action Item Extractor

```yaml
name: action_item
description: Extract action items and todos from the transcript
type: or
run: always
prompt: |
  You are a task extraction specialist. Your job is to identify actionable items.
  
  Transcript:
  {transcript}
  
  Please extract all actionable items from the transcript and format them as a markdown list.
  Each item should start with "- [ ] ".
```

### Blog Post Generator with Custom Extension

```yaml
name: blog_post
description: Generate draft blog posts from transcripts
type: or
run: matching
output_extension: .md
prompt: |
  Based on the transcript and its summary, create a draft blog post.
  
  Transcript:
  {transcript}
  
  Summary:
  {summary}
  
  Blog Post Draft:
```

### SVG Generator with Custom Extension

```yaml
name: svg
description: Generate SVG files based on user descriptions
type: and
run: matching
output_extension: .svg
prompt: |
  You are an SVG generation specialist. Create an SVG file that matches the description.
  
  User request:
  {transcript}
  
  Please generate a valid SVG file with proper XML formatting.
```

### Build Idea Plugin with Command Execution

This plugin executes Roo Code and starts building your idea. It depends on having the [ionutvmi.vscode-commands-executor](https://marketplace.visualstudio.com/items/?itemName=ionutvmi.vscode-commands-executor) vscode extension installed to talk to Roo Code.

```yaml
name: build_idea
description: Generate detailed app idea specifications from transcripts
type: or
run: matching
command: bun /path/to/build_idea.ts FILE
prompt: |
  Based on the transcript and its summary, create a detailed app idea specification.
  
  Transcript:
  {transcript}
  
  Summary:
  {summary}
  
  App Idea Specification:
```

## Creating Your Own Plugin

To create a new plugin:

1. Create a new YAML file in the `plugins` directory (e.g., `my_plugin.yaml`)
2. Define the required fields (name, description, type, run, prompt)
3. Add optional fields as needed (model, output_extension, command)
4. Design your prompt template with appropriate placeholders
5. Save the file and restart the application to load the new plugin

Example of a custom plugin:

```yaml
name: code_snippets
description: Extract code snippets from the transcript
type: or
run: matching
output_extension: .code
prompt: |
  You are a code extraction specialist. Your job is to identify and extract code snippets.
  
  Transcript:
  {transcript}
  
  Please extract all code snippets from the transcript and format them properly with 
  markdown code blocks including the appropriate language identifier.
  
  If no code snippets are found, output:
  No code snippets found in this transcript.
```

## How Plugins Are Loaded and Used

The `PluginManager` handles plugin loading and management:

1. On initialization, it scans the `plugins` directory for YAML files
2. Each plugin file is validated for required fields and field values
3. Valid plugins are instantiated as `Plugin` objects and stored by name
4. The application can retrieve plugins by name, get all plugins, or get plugins by run type

## Plugin Validation

When loading plugins, the system validates:

1. All required fields are present
2. The `type` field is either "and" or "or"
3. The `run` field is either "always" or "matching"

If validation fails, an error is raised and the plugin is not loaded.

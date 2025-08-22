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

Plugins are defined as YAML files in the `plugins` directory. The plugin name is derived from the filename (without the .yaml extension). A simple plugin looks like:

```yaml
description: Generate a concise summary of the transcript
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
| `description` | Brief explanation of what the plugin does |
| `run` | When to run the plugin (`always` or `matching`) |
| `prompt` | Template used for text generation with placeholders |

### Optional Fields

| Field | Description | Default Value |
|-------|-------------|---------------|
| `model` | Specific language model to use | System default |
| `match` | How to match keywords (`any` or `all`) | `all` |
| `output_extension` | File extension for the output | `.txt` |
| `command` | Command to execute after generation | None |
| `keywords` | Keywords to trigger the plugin when in `matching` mode | Derived from plugin name |
| `ignore_if` | Text that prevents the plugin from running if found in transcript | None |

### Keywords

The `keywords` field is used to determine when a plugin should be triggered in `matching` mode. It can be specified in two ways:

1. As a comma-separated string:

```yaml
keywords: blog, post, article
```

1. As a list:

```yaml
keywords:
  - blog
  - post
  - article
```

If no keywords are specified, they will be automatically derived from the plugin name by splitting on underscores. For example:

- `blog_post.yaml` → keywords: ["blog", "post"]
- `app_idea.yaml` → keywords: ["app", "idea"]
- `therapist.yaml` → keywords: ["therapist"]

### Matching Behavior

When a plugin has `run: matching`, its activation depends on the `match` field:

- `match: any` - The plugin will be triggered if ANY of its keywords are found in the text
- `match: all` - The plugin will be triggered only if ALL of its keywords are found in the text

For example:

```yaml
run: matching
match: any
keywords: svg, graphic, logo, illustration
```

This plugin will be triggered if any of the words "svg", "graphic", "logo", or "illustration" appear in the text.

```yaml
run: matching
match: all
keywords: action, item
```

This plugin will only be triggered if both "action" AND "item" appear in the text.

## Plugin Types and Run Modes

### Type Field

The `type` field is optional and determines how the plugin name is matched against the transcript content when `run` is set to `matching`. The plugin name is derived from the filename (e.g., `blog_post.yaml` becomes `blog_post`), and this name is split into words for matching.

- `and` (default): All words from the plugin name must be found in the transcript for the plugin to run
  - Example: For `blog_post.yaml`, both "blog" and "post" must appear in the transcript
  - This is useful for more specific, targeted plugins

- `or`: Only one word from the plugin name needs to be found in the transcript
  - Example: For `blog_post.yaml`, either "blog" or "post" appearing in the transcript is sufficient
  - This is useful for broader, more general plugins

Note: The `type` field is ignored when `run` is set to `always`.

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

### Summary Generator (summary.yaml)

```yaml
description: Generate a concise summary of the transcript
type: or
run: always
prompt: |
  Please provide a short, 2-3 sentence summary of the following transcript.
  
  Transcript:
  {transcript}
  
  Summary:
```

### Action Item Extractor with Ignore Condition (action_item.yaml)

```yaml
description: Extract action items and todos from the transcript
type: or
run: always
ignore_if: rambling  # Will not run if transcript contains the word "rambling"
prompt: |
  You are a task extraction specialist. Your job is to identify actionable items.
  
  Transcript:
  {transcript}
  
  Please extract all actionable items from the transcript and format them as a markdown list.
  Each item should start with "- [ ] ".
```

### Blog Post Generator with Custom Extension (blog_post.yaml)

```yaml
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
description: Generate SVG files based on user descriptions
type: any  # and, or
run: matching  # always, matching
keywords: svg, graphic, logo, illustration
output_extension: .svg
prompt: |
  You are an SVG generation specialist. Your job is to create SVG files based on user descriptions.

  User request:
  {transcript}

  Please generate a valid SVG file that matches the user's description. The SVG should:
  1. Be well-formed and valid XML
  2. Include proper SVG namespace and viewBox
  3. Be optimized for web use
  4. Use appropriate SVG elements and attributes
  5. Include comments explaining the structure

  Rules:
  - Output only the SVG code, no markdown or additional text
  - Use proper XML formatting
  - Include viewBox attribute
  - Use semantic element names
  - Add comments for complex sections
  - Optimize for performance
  - The output will be saved as an SVG file, so ensure it's complete and valid

  Format the output as:
  <?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <!-- SVG content here -->
  </svg>
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
2. Define the required fields (description, type, run, prompt)
3. Add optional fields as needed (model, output_extension, command)
4. Design your prompt template with appropriate placeholders
5. Save the file and restart the application to load the new plugin

Example of a custom plugin:

```yaml
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
3. Valid plugins are instantiated as `Plugin` objects and stored by name (derived from filename)
4. The application can retrieve plugins by name, get all plugins, or get plugins by run type

## Plugin Validation

When loading plugins, the system validates:

1. All required fields are present
2. The `type` field is either "and" or "or"
3. The `run` field is either "always" or "matching"

If validation fails, an error is raised and the plugin is not loaded.

## Audio File Integration

Some plugins may need access to the original audio file (e.g., for uploading). The system supports this through the `AUDIO_FILE` placeholder in plugin commands.

### Using AUDIO_FILE in Commands

When a plugin has a `command` field, you can use `AUDIO_FILE` as a placeholder that will be automatically replaced with the path to the original audio file. The system deduces the audio file path from the transcript file path using the standard directory structure:

- Audio file: `VoiceMemos/voice_memo.m4a`
- Transcript file: `VoiceMemos/transcripts/voice_memo.txt`

```yaml
name: upload_plugin
description: Upload audio file to cloud storage
run: matching
keywords: ["upload", "cloud"]
command: "upload-tool --file AUDIO_FILE --destination cloud"
```

### Environment Variables for Audio Plugins

For plugins that interact with external services, you can use environment variables in commands:

```yaml
name: blossom
description: Upload audio file to Blossom when trigger words are detected
run: matching
keywords: ["upload", "blossom", "share", "cloud"]
match: any
ignore_if: rambling
command: "blossom-cli upload -server $BLOSSOM_SERVER -file AUDIO_FILE -privkey $NOSTR_NSEC"
```

Required environment variables:
- `BLOSSOM_SERVER`: The Blossom server URL
- `NOSTR_NSEC`: Your Nostr private key for authentication

### Example: Blossom Upload Plugin

The blossom plugin demonstrates how to create an upload plugin that:

1. **Triggers on specific keywords** - Runs when "upload", "blossom", "share", or "cloud" are mentioned
2. **Automatically finds the audio file** - Deduces the .m4a file path from the transcript location
3. **Integrates with external services** - Uses blossom-cli to upload to a Blossom server
4. **Handles authentication** - Uses environment variables for sensitive configuration

```yaml
name: blossom
description: Upload audio file to Blossom when trigger words are detected
run: matching
keywords: ["upload", "blossom", "share", "cloud"]
match: any
ignore_if: rambling
prompt: |
  Upload triggered for audio file.
  This plugin will upload the audio file to Blossom server.
command: "blossom-cli upload -server $BLOSSOM_SERVER -file AUDIO_FILE -privkey $BLOSSOM_PRIVKEY"
```

To use this plugin:

1. Install blossom-cli: `go install github.com/girino/blossom-cli@latest`
2. Set environment variables:
   ```bash
   export BLOSSOM_SERVER="http://your-blossom-server.com"
   export NOSTR_NSEC="nsec1yourprivatekey"
   ```
3. Mention trigger words in your voice memo: "I want to upload this to blossom"
4. The plugin will automatically upload the audio file to your Blossom server

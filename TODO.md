# VibeLine TODO List

Steps to glory, aka make this thing awesome forever:

- [ ] Allow plugins to execute stuff using [MCP Tools](https://github.com/patruff/ollama-mcp-bridge)
- [ ] Convert `transcribe` step into a plugin using a [whisper-ollama](https://ollama.com/search?q=whisper) model
- [ ] Allow plugins to have an "input", i.e. which dir they should watch

After that:

- [ ] Create an "archive" plugin that moves old stuff to a separate folder
- [ ] Create even more plugins
- [ ] Dockerize it for easy deployment

Old vibe TODO list:

- [x] Set up basic project structure
- [x] Create voice memo processing system
- [x] Implement dynamic plugin loading system
- [x] Create blog post plugin
- [x] Create app idea plugin
- [x] Create summary plugin
- [x] Set up proper directory structure for outputs
- [x] Implement file organization system
- [x] Add timestamp-based file naming
- [x] Make scripts executable
- [x] Extract llama models to ENV variables
- [x] Create action_item plugin
- [x] Use python library for pluralization
- [x] Use more structured files for the plugins & put metadata into those structured files
- [x] Write README.md with project overview, installation instructions, usage examples, plugin system documentation, and directory structure explanation
- [x] Create LICENSE (MIT recommended)
- [x] Create post-processing step
- [ ] Create graphic generation plugin (SVGs)
- [ ] Create image generation plugin (jpgs - using a local StableDiffusion model)
- [ ] Add error handling for Ollama connection issues
- [ ] Implement plugin validation system
- [ ] Add support for custom output formats
- [ ] Create plugin template system
- [ ] Add tests for core functionality
- [ ] Implement logging system
- [x] Add configuration file support (.env)
- [ ] Create plugin documentation system
- [ ] Modernize CLI structure:
      - Replace bash scripts with a unified Python CLI tool
      - Implement subcommands: run, watch, process, transcribe
      - Use click/typer for better CLI experience
      - Support commands like:
        - vibeline run
        - vibeline watch
        - vibeline process transcript.txt
        - vibeline transcribe memo.m4a

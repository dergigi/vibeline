#!/usr/bin/env python3

from pathlib import Path
import yaml
from typing import Dict, Optional, Literal, List
from dataclasses import dataclass, field

@dataclass
class Plugin:
    name: str
    description: str
    run: Literal["always", "matching"]  # When to run the plugin
    prompt: str
    model: Optional[str] = None
    type: Literal["and", "or"] = field(default="and")  # Default to "and" if not specified
    output_extension: str = field(default=".txt")  # Default to .txt if not specified
    command: Optional[str] = None  # Optional command to run after generation
    keywords: List[str] = field(default_factory=list)  # Keywords for matching

class PluginManager:
    def __init__(self, plugin_dir: Path):
        self.plugin_dir = plugin_dir
        self.plugins: Dict[str, Plugin] = {}
        self.load_plugins()

    def _derive_keywords_from_name(self, name: str) -> List[str]:
        """Derive keywords from plugin name by splitting on underscores."""
        return [word.lower() for word in name.split('_')]

    def load_plugins(self) -> None:
        """Load all YAML plugins from the plugin directory."""
        for plugin_file in self.plugin_dir.glob("*.yaml"):
            with open(plugin_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                
                # Use filename (without .yaml) as name if not provided
                if 'name' not in data:
                    data['name'] = plugin_file.stem
                
                # Validate required fields
                required_fields = ['description', 'run', 'prompt']
                for field in required_fields:
                    if field not in data:
                        raise ValueError(f"Plugin {plugin_file} is missing required field: {field}")
                
                # Validate run field
                if data['run'] not in ['always', 'matching']:
                    raise ValueError(f"Plugin {plugin_file} has invalid run value: {data['run']}. Must be 'always' or 'matching'")
                
                # Validate type field if present
                if 'type' in data and data['type'] not in ['and', 'or']:
                    raise ValueError(f"Plugin {plugin_file} has invalid type: {data['type']}. Must be 'and' or 'or'")
                
                # Handle keywords
                keywords = []
                if 'keywords' in data:
                    # If keywords are provided as a comma-separated string, split them
                    if isinstance(data['keywords'], str):
                        keywords = [k.strip() for k in data['keywords'].split(',')]
                    # If keywords are provided as a list, use them directly
                    elif isinstance(data['keywords'], list):
                        keywords = data['keywords']
                else:
                    # If no keywords provided, derive them from the plugin name
                    keywords = self._derive_keywords_from_name(data['name'])
                
                # Create Plugin instance
                plugin = Plugin(
                    name=data['name'],
                    description=data['description'],
                    run=data['run'],
                    prompt=data['prompt'],
                    model=data.get('model'),  # Optional
                    type=data.get('type', 'and'),  # Default to 'and' if not specified
                    output_extension=data.get('output_extension', '.txt'),  # Default to .txt
                    command=data.get('command'),  # Get the command if present
                    keywords=keywords  # Add keywords
                )
                
                self.plugins[plugin.name] = plugin

    def get_plugin(self, name: str) -> Optional[Plugin]:
        """Get a plugin by name."""
        return self.plugins.get(name)

    def get_all_plugins(self) -> Dict[str, Plugin]:
        """Get all loaded plugins."""
        return self.plugins

    def get_plugins_by_run_type(self, run_type: Literal["always", "matching"]) -> Dict[str, Plugin]:
        """Get all plugins with a specific run type."""
        return {name: plugin for name, plugin in self.plugins.items() 
                if plugin.run == run_type} 
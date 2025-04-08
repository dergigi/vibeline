#!/usr/bin/env python3

from pathlib import Path
import yaml
from typing import Dict, Optional, Literal
from dataclasses import dataclass, field

@dataclass
class Plugin:
    name: str
    description: str
    model: Optional[str]
    type: Literal["and", "or"]  # Comparison type for matching
    run: Literal["always", "matching"]  # When to run the plugin
    prompt: str
    output_extension: str = field(default=".txt")  # Default to .txt if not specified
    command: Optional[str] = None  # Optional command to run after generation

class PluginManager:
    def __init__(self, plugin_dir: Path):
        self.plugin_dir = plugin_dir
        self.plugins: Dict[str, Plugin] = {}
        self.load_plugins()

    def load_plugins(self) -> None:
        """Load all YAML plugins from the plugin directory."""
        for plugin_file in self.plugin_dir.glob("*.yaml"):
            with open(plugin_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                
                # Validate required fields
                required_fields = ['name', 'description', 'type', 'run', 'prompt']
                for field in required_fields:
                    if field not in data:
                        raise ValueError(f"Plugin {plugin_file} is missing required field: {field}")
                
                # Validate type and run fields
                if data['type'] not in ['and', 'or']:
                    raise ValueError(f"Plugin {plugin_file} has invalid type: {data['type']}. Must be 'and' or 'or'")
                if data['run'] not in ['always', 'matching']:
                    raise ValueError(f"Plugin {plugin_file} has invalid run value: {data['run']}. Must be 'always' or 'matching'")
                
                # Create Plugin instance
                plugin = Plugin(
                    name=data['name'],
                    description=data['description'],
                    model=data.get('model'),  # Optional
                    type=data['type'],
                    run=data['run'],
                    prompt=data['prompt'],
                    output_extension=data.get('output_extension', '.txt'),  # Default to .txt
                    command=data.get('command') # Get the command if present
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
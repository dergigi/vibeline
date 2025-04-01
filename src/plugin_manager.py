#!/usr/bin/env python3

from pathlib import Path
import yaml
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class Plugin:
    name: str
    description: str
    model: Optional[str]
    type: str  # or, and, all
    prompt: str

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
                required_fields = ['name', 'description', 'type', 'prompt']
                for field in required_fields:
                    if field not in data:
                        raise ValueError(f"Plugin {plugin_file} is missing required field: {field}")
                
                # Create Plugin instance
                plugin = Plugin(
                    name=data['name'],
                    description=data['description'],
                    model=data.get('model'),  # Optional
                    type=data['type'],
                    prompt=data['prompt']
                )
                
                self.plugins[plugin.name] = plugin

    def get_plugin(self, name: str) -> Optional[Plugin]:
        """Get a plugin by name."""
        return self.plugins.get(name)

    def get_all_plugins(self) -> Dict[str, Plugin]:
        """Get all loaded plugins."""
        return self.plugins

    def get_plugins_by_type(self, plugin_type: str) -> Dict[str, Plugin]:
        """Get all plugins of a specific type."""
        return {name: plugin for name, plugin in self.plugins.items() 
                if plugin.type == plugin_type} 
#!/usr/bin/env python3
"""
Simple version management script for VibeLine.
Handles version bumping and changelog updates.
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent


def get_current_version() -> str:
    """Get current version from pyproject.toml."""
    pyproject_path = PROJECT_ROOT / "pyproject.toml"
    with open(pyproject_path, "r") as f:
        content = f.read()
        match = re.search(r'version\s*=\s*"([^"]+)"', content)
        if match:
            return match.group(1)
    raise ValueError("Could not find version in pyproject.toml")


def bump_version(current_version: str, bump_type: str) -> str:
    """Bump version according to semantic versioning."""
    major, minor, patch = map(int, current_version.split("."))

    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    elif bump_type == "patch":
        patch += 1
    else:
        raise ValueError(f"Invalid bump type: {bump_type}")

    return f"{major}.{minor}.{patch}"


def update_pyproject_version(new_version: str) -> None:
    """Update version in pyproject.toml."""
    pyproject_path = PROJECT_ROOT / "pyproject.toml"
    with open(pyproject_path, "r") as f:
        content = f.read()

    content = re.sub(r'version\s*=\s*"[^"]+"', f'version = "{new_version}"', content)

    with open(pyproject_path, "w") as f:
        f.write(content)


def update_changelog(new_version: str, release_date: str = None) -> None:
    """Update CHANGELOG.md with new version."""
    changelog_path = PROJECT_ROOT / "CHANGELOG.md"

    if not changelog_path.exists():
        print("Warning: CHANGELOG.md not found. Creating it...")
        create_initial_changelog(changelog_path)

    with open(changelog_path, "r") as f:
        content = f.read()

    if release_date is None:
        release_date = datetime.now().strftime("%Y-%m-%d")

    # Preserve the preamble and leave a fresh Unreleased section.
    content, count = re.subn(
        r"^## \[Unreleased\]$",
        f"## [Unreleased]\n\n## [{new_version}] - {release_date}",
        content,
        count=1,
        flags=re.MULTILINE,
    )
    if count != 1:
        raise ValueError("CHANGELOG.md must contain an [Unreleased] section")

    with open(changelog_path, "w") as f:
        f.write(content)


def create_initial_changelog(changelog_path: Path) -> None:
    """Create initial CHANGELOG.md if it doesn't exist."""
    initial_content = """# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

"""
    with open(changelog_path, "w") as f:
        f.write(initial_content)


def update_docker_compose(new_version: str) -> None:
    """Update docker-compose.yml to use the new version."""
    docker_compose_path = PROJECT_ROOT / "docker-compose.yml"

    if not docker_compose_path.exists():
        print("Warning: docker-compose.yml not found")
        return

    with open(docker_compose_path, "r") as f:
        content = f.read()

    content = re.sub(
        r"(image: ghcr\.io/dergigi/vibeline(?:-ui)?):[^\s]+",
        lambda match: f"{match.group(1)}:{new_version}",
        content,
    )

    with open(docker_compose_path, "w") as f:
        f.write(content)

    print(f"Updated docker-compose.yml to use version {new_version}")


def update_npm_versions(new_version: str) -> None:
    """Keep root tooling and UI manifests and lockfiles on the release version."""
    for directory in [PROJECT_ROOT, PROJECT_ROOT / "ui"]:
        for filename in ["package.json", "package-lock.json"]:
            file_path = directory / filename
            data = json.loads(file_path.read_text())
            data["version"] = new_version
            if "packages" in data:
                data["packages"][""]["version"] = new_version
            file_path.write_text(json.dumps(data, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Version management for VibeLine")
    parser.add_argument("bump_type", choices=["major", "minor", "patch"], help="Type of version bump")
    parser.add_argument("--date", help="Release date (YYYY-MM-DD format, defaults to today)")
    parser.add_argument("--no-tag", action="store_true", help="Accepted for compatibility; tags are always created manually")

    args = parser.parse_args()

    try:
        # Get current version
        current_version = get_current_version()
        print(f"Current version: {current_version}")

        # Calculate new version
        new_version = bump_version(current_version, args.bump_type)
        print(f"New version: {new_version}")

        # Update files
        update_pyproject_version(new_version)
        print("Updated pyproject.toml")

        update_changelog(new_version, args.date)
        print("Updated CHANGELOG.md")

        update_docker_compose(new_version)

        update_npm_versions(new_version)

        print(f"\n✅ Successfully bumped version to {new_version}")
        print("Don't forget to:")
        print("1. Review and update the changelog entries")
        print("2. Commit your changes")
        print(f"3. Create tag v{new_version} on the release commit")
        print("4. Push the commit and tag to publish both images")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

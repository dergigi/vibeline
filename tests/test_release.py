"""Verify releases in an isolated checkout without tagging or touching real data."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ReleaseTests(unittest.TestCase):
    def test_unified_release(self):
        with tempfile.TemporaryDirectory() as directory:
            checkout = Path(directory)
            files = [
                "scripts/version.py",
                "pyproject.toml",
                "CHANGELOG.md",
                "docker-compose.yml",
                "package.json",
                "package-lock.json",
                "ui/package.json",
                "ui/package-lock.json",
            ]
            for name in files:
                destination = checkout / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / name, destination)

            # No .git directory: a version bump must not attempt to tag or push.
            result = subprocess.run(
                [sys.executable, "scripts/version.py", "minor", "--date", "2026-09-29"],
                cwd=checkout,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            current = json.loads((ROOT / "package.json").read_text())["version"]
            major, minor, _ = map(int, current.split("."))
            expected = f"{major}.{minor + 1}.0"
            for prefix in ["", "ui/"]:
                package = json.loads((checkout / f"{prefix}package.json").read_text())
                lock = json.loads((checkout / f"{prefix}package-lock.json").read_text())
                self.assertEqual(package["version"], expected)
                self.assertEqual(lock["version"], expected)
                self.assertEqual(lock["packages"][""]["version"], expected)
            self.assertIn(f'version = "{expected}"', (checkout / "pyproject.toml").read_text())
            compose = (checkout / "docker-compose.yml").read_text()
            for image in ["vibeline", "vibeline-ui"]:
                self.assertIn(f"image: ghcr.io/dergigi/{image}:{expected}", compose)
            changelog = (checkout / "CHANGELOG.md").read_text()
            self.assertEqual(changelog.count("## [Unreleased]"), 1)
            self.assertIn(f"## [Unreleased]\n\n## [{expected}] - 2026-09-29", changelog)
            self.assertLess(changelog.index("The format"), changelog.index("## [Unreleased]"))
            self.assertNotIn("\n- \n", changelog)


if __name__ == "__main__":
    unittest.main()

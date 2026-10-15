"""Incomplete SyncThing copies should be skipped instead of transcribed."""

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from watch_voice_memos import audio_duration_seconds  # noqa: E402


class IncompleteAudioTests(unittest.TestCase):
    def test_empty_file_has_no_duration(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "empty.m4a"
            audio.write_bytes(b"")
            self.assertIsNone(audio_duration_seconds(audio))

    def test_transcribe_skips_empty_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "20261015_120000.m4a"
            audio.write_bytes(b"")
            env = {**os.environ, "VOICE_MEMOS_DIR": directory}
            result = subprocess.run(
                ["./transcribe.sh", str(audio)],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertIn("Audio is empty", result.stdout)
            self.assertFalse((Path(directory) / "transcripts" / "20261015_120000.txt").exists())

    def test_process_skips_empty_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "20261015_120000.m4a"
            audio.write_bytes(b"")
            env = {**os.environ, "VOICE_MEMOS_DIR": directory}
            result = subprocess.run(
                ["./process.sh", str(audio)],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("Audio is not ready", result.stdout)
            self.assertFalse((Path(directory) / "titles").exists())


if __name__ == "__main__":
    unittest.main()

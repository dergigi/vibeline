"""Smoke-test the built UI against temporary files, never the user's memos."""

import json
import os
import socket
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless((ROOT / "ui/.next/BUILD_ID").exists(), "Run npm run ui:build first")
class UISmokeTests(unittest.TestCase):
    def test_shared_filesystem(self):
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            for filename, base in [
                ("20260929_120000", data),
                ("20250801_120000", data / "archive/2025-08"),
            ]:
                for folder in ["transcripts", "summaries", "titles", "TODOs"]:
                    (base / folder).mkdir(parents=True, exist_ok=True)
                (base / f"{filename}.m4a").write_bytes(b"fixture")
                (base / "transcripts" / f"{filename}.txt").write_text("A test recording.")
                (base / "titles" / f"{filename}.txt").write_text("Fixture title")
                (base / "TODOs" / f"{filename}.md").write_text("- [ ] Test task\n")

            with socket.socket() as listener:
                listener.bind(("127.0.0.1", 0))
                port = listener.getsockname()[1]
            env = {**os.environ, "VOICE_MEMOS_DIR": str(data), "PORT": str(port)}
            with tempfile.TemporaryFile() as log:
                server = subprocess.Popen(
                    ["npm", "run", "ui:start"],
                    cwd=ROOT,
                    env=env,
                    stdout=log,
                    stderr=log,
                    start_new_session=True,
                )
                try:
                    origin = f"http://localhost:{port}"

                    def request(route, payload=None):
                        body = json.dumps(payload).encode() if payload is not None else None
                        req = Request(origin + route, data=body, headers={"Content-Type": "application/json"})
                        with urlopen(req, timeout=10) as response:
                            return response.read()

                    deadline = time.monotonic() + 30
                    while True:
                        try:
                            memos = json.loads(request("/api/memos"))
                            break
                        except URLError:
                            if time.monotonic() >= deadline or server.poll() is not None:
                                log.seek(0)
                                self.fail(log.read().decode())
                            time.sleep(0.2)

                    self.assertEqual(len(memos), 2)
                    self.assertEqual(memos[0]["title"], "Fixture title")
                    self.assertEqual(memos[1]["archivePath"], "2025-08")
                    self.assertTrue(json.loads(request("/api/archive")))
                    self.assertTrue(json.loads(request("/api/plugins")))
                    for route in ["/", "/plugins", "/plugins/titles", "/memos/20250801_120000"]:
                        self.assertIn(b"<!DOCTYPE html>", request(route))
                    request("/api/titles/update", {"filename": "20260929_120000", "title": "Edited title"})
                    self.assertEqual((data / "titles/20260929_120000.txt").read_text(), "Edited title")
                    request(
                        "/api/todos/toggle",
                        {"filePath": "TODOs/20250801_120000.md", "lineNumber": 0, "completed": True},
                    )
                    self.assertEqual((data / "archive/2025-08/TODOs/20250801_120000.md").read_text(), "- [x] Test task\n")
                finally:
                    # npm starts a child server; stop the entire test process group.
                    import signal

                    try:
                        os.killpg(server.pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass
                    server.wait(timeout=10)


if __name__ == "__main__":
    unittest.main()

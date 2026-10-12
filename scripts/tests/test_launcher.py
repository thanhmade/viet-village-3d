"""Real loopback/Windows launcher regressions; no Google account or production data."""
import contextlib
import functools
import http.server
import importlib.util
import io
import json
import os
from pathlib import Path
import socketserver
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("launcher", ROOT / "scripts/serve-game.py")
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class LauncherTests(unittest.TestCase):
    def setUp(self):
        scratch = ROOT / ".cache/launcher-tests"
        scratch.mkdir(parents=True, exist_ok=True)
        self.assertTrue(scratch.resolve().is_relative_to(ROOT))
        temporary = tempfile.TemporaryDirectory(prefix="launch-", dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)

    def fixture(self, root=None):
        root = root or self.root
        paths = ["index.html", launcher.ENTRY, "SOURCE-CODE/js/auth-entry.js",
                 "SOURCE-CODE/js/auth-session.js", "SOURCE-CODE/js/firebase-config.js",
                 "ASSETS/vendor/gltf-r160/GLTFLoader.js", "MAP/scene.js", "SOURCE-CODE/css/game.css"]
        for name in paths:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("", encoding="utf-8")
        (root / launcher.ENTRY).write_text('<script src="../MAP/scene.js?v=1"></script><link rel="stylesheet" href="css/game.css">', encoding="utf-8")
        (root / "SOURCE-CODE/load-order.json").write_text('["MAP/scene.js"]', encoding="utf-8")
        folder = root / "MAP/regions/lang-viet"
        folder.mkdir(parents=True, exist_ok=True)
        for name in ("dialogues", "quests"):
            (folder / (name + ".json")).write_text("{}", encoding="utf-8")
        (folder / "gameplay.json").write_text(json.dumps({"mapId": "lang-viet", "npcs": [
            {"id": "fixture-npc", "model": {"url": "../CHARACTERS/npc.glb"}}]}), encoding="utf-8")
        (root / "CHARACTERS").mkdir(exist_ok=True)
        (root / "CHARACTERS/npc.glb").write_bytes(b"glTF-fixture-header-only")
        return root

    def running(self, server):
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        def stop():
            server.shutdown()
            server.server_close()
            worker.join(3)
        self.addCleanup(stop)
        return server.server_address[1]

    def test_actual_checkout_has_eight_npcs_and_complete_boot_assets(self):
        self.assertEqual(launcher.validate_checkout(ROOT), 8)

    def test_preflight_reports_missing_npc_before_launch(self):
        self.fixture()
        (self.root / "CHARACTERS/npc.glb").unlink()
        with self.assertRaisesRegex(ValueError, "CHARACTERS/npc.glb"):
            launcher.validate_checkout(self.root)

    def test_preflight_rejects_lfs_pointer_and_missing_css(self):
        self.fixture()
        (self.root / "CHARACTERS/npc.glb").write_text("version https://git-lfs.github.com/spec/v1")
        with self.assertRaisesRegex(ValueError, "Invalid GLB"):
            launcher.validate_checkout(self.root)
        (self.root / "CHARACTERS/npc.glb").write_bytes(b"glTF")
        (self.root / "SOURCE-CODE/css/game.css").unlink()
        with self.assertRaisesRegex(ValueError, "game.css"):
            launcher.validate_checkout(self.root)

    def test_http_is_rooted_in_checkout_and_bypasses_stale_cache(self):
        self.fixture()
        port = self.running(launcher.LocalGameServer(0, self.root))
        url = "http://127.0.0.1:%s/MAP/scene.js" % port
        (self.root / "MAP/scene.js").write_text("new source")
        with urlopen(Request(url, headers={"If-Modified-Since": "Wed, 21 Oct 2099 07:28:00 GMT"})) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertEqual(response.read(), b"new source")
        self.assertTrue(launcher.matches_server("127.0.0.1", port, launcher.identity(self.root)))

    def test_repeated_launch_reuses_same_server_without_binding_another(self):
        port = self.running(launcher.LocalGameServer(0, self.fixture()))
        for _ in range(3):
            server, selected = launcher.select_server(self.root, port)
            self.assertIsNone(server)
            self.assertEqual(selected, port)

    def test_identical_copy_in_another_directory_is_not_reused(self):
        self.fixture()
        other = self.fixture(self.root / "another copy")
        old_port = self.running(launcher.LocalGameServer(0, other))
        server, new_port = launcher.select_server(self.root, old_port)
        self.addCleanup(server.server_close)
        self.assertNotEqual(old_port, new_port)
        self.assertTrue(launcher.matches_server("127.0.0.1", old_port, launcher.identity(other)))

    def test_legacy_or_foreign_http_server_is_left_alive(self):
        self.fixture()
        foreign = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=self.root))
        port = self.running(foreign)
        server, selected = launcher.select_server(self.root, port)
        self.addCleanup(server.server_close)
        self.assertNotEqual(port, selected)
        with urlopen("http://127.0.0.1:%s/" % port) as response:
            self.assertEqual(response.status, 200)

    def test_non_http_listener_and_ipv6_conflict_do_not_open_wrong_game(self):
        class NotHTTP(socketserver.StreamRequestHandler):
            def handle(self):
                self.rfile.readline()
                self.wfile.write(b"Not an HTTP service\r\n")
        port = self.running(socketserver.ThreadingTCPServer(("127.0.0.1", 0), NotHTTP))
        server, selected = launcher.select_server(self.fixture(), port)
        self.addCleanup(server.server_close)
        self.assertNotEqual(port, selected)
        with patch.object(launcher, "ipv6_listener", side_effect=lambda p: p == port), patch.object(launcher, "matches_server", return_value=False):
            second, selected = launcher.select_server(self.root, port, attempts=1)
            self.addCleanup(second.server_close)
            self.assertNotEqual(port, selected)

    def test_cli_reuse_opens_exact_http_url_and_no_browser_option(self):
        port = self.running(launcher.LocalGameServer(0, self.fixture()))
        with patch.object(launcher, "ROOT", self.root), patch.object(launcher.webbrowser, "open", return_value=True) as opened, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(launcher.main(["--port", str(port)]), 0)
            opened.assert_called_once_with("http://localhost:%s/SOURCE-CODE/index.html" % port)
            self.assertEqual(launcher.main(["--port", str(port), "--no-browser"]), 0)
            self.assertEqual(opened.call_count, 1)

    @unittest.skipUnless(os.name == "nt", "Windows batch launcher")
    def test_windows_batch_from_other_cwd_reuses_exact_checkout(self):
        port = self.running(launcher.LocalGameServer(0, ROOT))
        command = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", str(ROOT / "START-GAME.bat"), "--port", str(port), "--no-browser"]
        result = subprocess.run(command, cwd=self.root, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Reusing verified server", result.stdout)
        self.assertIn(str(ROOT), result.stdout)
        self.assertIn("http://localhost:%s/SOURCE-CODE/index.html" % port, result.stdout)

    @unittest.skipUnless(os.name == "nt", "Windows runtime discovery")
    def test_windows_batch_falls_back_to_python_without_py_and_guides_if_missing(self):
        port = self.running(launcher.LocalGameServer(0, ROOT))
        command = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", str(ROOT / "START-GAME.bat"), "--port", str(port), "--no-browser"]
        system32 = str(Path(os.environ["SystemRoot"]) / "System32")
        env = dict(os.environ, PATH=str(Path(sys.executable).parent) + os.pathsep + system32)
        result = subprocess.run(command, cwd=self.root, env=env, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Reusing verified server", result.stdout)
        env["PATH"] = system32
        result = subprocess.run(command, cwd=self.root, env=env, capture_output=True, text=True, timeout=20)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Python 3.10", result.stdout)
        self.assertIn("No software has been installed", result.stdout)


if __name__ == "__main__":
    unittest.main()

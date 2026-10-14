"""Start/reuse this checkout's loopback HTTP server without stopping other apps."""
import argparse
import functools
import hashlib
from html.parser import HTMLParser
import http.client
import http.server
import json
import os
import re
import queue
import shutil
from pathlib import Path
import socket
import subprocess
import sys
import threading
from urllib.parse import unquote, urljoin, urlsplit
from urllib.error import HTTPError
from urllib.request import ProxyHandler, build_opener
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
ENTRY = "SOURCE-CODE/index.html"
HEALTH = "/__viet_village_launcher__/health"
LEARNING = "/__viet_village_learning__/"
PROTOCOL = "viet-village-local-v1"
LAUNCHER_HASH = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def identity(root):
    canonical = os.path.normcase(str(Path(root).resolve()))
    return {"protocol": PROTOCOL, "rootId": hashlib.sha256(canonical.encode()).hexdigest(),
            "launcher": LAUNCHER_HASH, "entry": ENTRY}


class EntryLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        value = attrs.get("src") if tag == "script" else (
            attrs.get("href") if tag == "link" and attrs.get("rel") == "stylesheet" else None)
        if value and not urlsplit(value).scheme and not value.startswith("//"):
            self.paths.append(unquote(urlsplit(urljoin("/" + ENTRY, value)).path).lstrip("/"))


def validate_checkout(root):
    """Fail clearly for a partial copy or missing NPC, before opening a browser."""
    root = Path(root).resolve()
    required = {"index.html", ENTRY, "SOURCE-CODE/load-order.json",
                "SOURCE-CODE/js/auth-entry.js", "SOURCE-CODE/js/auth-session.js",
                "SOURCE-CODE/js/firebase-config.js", "ASSETS/vendor/gltf-r160/GLTFLoader.js"}
    required.update("MAP/regions/lang-viet/" + name + ".json"
                    for name in ("gameplay", "dialogues", "quests"))
    missing = sorted(name for name in required if not (root / name).is_file())
    if missing:
        raise ValueError("Missing project files: " + ", ".join(missing))
    required.update(json.loads((root / "SOURCE-CODE/load-order.json").read_text(encoding="utf-8-sig")))
    parser = EntryLinks()
    parser.feed((root / ENTRY).read_text(encoding="utf-8-sig"))
    required.update(parser.paths)
    gameplay = json.loads((root / "MAP/regions/lang-viet/gameplay.json").read_text(encoding="utf-8-sig"))
    if gameplay.get("mapId") != "lang-viet" or not gameplay.get("npcs"):
        raise ValueError("Invalid Lang Viet NPC configuration.")
    for npc in gameplay["npcs"]:
        url = npc.get("model", {}).get("url")
        if url:
            if urlsplit(url).scheme or url.startswith("//"):
                raise ValueError("NPC model must be a local asset: " + npc["id"])
            required.add(unquote(urlsplit(urljoin("/" + ENTRY, url)).path).lstrip("/"))
    missing = []
    for name in sorted(required):
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            missing.append(name)
        elif path.suffix.lower() == ".glb":
            with path.open("rb") as model:
                if model.read(4) != b"glTF":
                    raise ValueError("Invalid GLB (possibly an undownloaded LFS pointer): " + name)
    if missing:
        raise ValueError("Missing project files: " + ", ".join(missing))
    return len(gameplay["npcs"])


class GameHandler(http.server.SimpleHTTPRequestHandler):
    def public_path(self):
        # This server serves a source checkout, not just a compiled public folder.
        # Never expose teacher answers, server code, source archives or account data.
        raw = unquote(urlsplit(self.path).path).replace("\\", "/")
        if any(ord(c) < 32 for c in raw):
            return False
        parts = [part for part in raw.split("/") if part]
        if not parts or any(part in (".", "..") or part.startswith(".") or ":" in part for part in parts):
            return not parts
        relative = "/".join(parts)
        shared = relative in ("firebase/functions/shared/experience-config.js", "firebase/functions/shared/experience-core.js")
        if relative.startswith("public-game/"):
            relative = relative[len("public-game/"):]
            parts = relative.split("/")
            shared = relative in ("firebase/functions/shared/experience-config.js", "firebase/functions/shared/experience-core.js")
        if not shared and (any(part.lower() in {
                "firebase", "node_modules", "backup", "scripts", "tests", "documents", "docs", "design",
                "_import_zip", "_archive_zip", "lang_viet_npc_portal_de_xuat"} for part in parts) or
                re.search(r"teacher|answer[-_]?key|service[-_]?account|credential|secret|player[-_]?data|players-export", relative, re.I)):
            return False
        if not shared and parts[0] not in {"index.html", "SOURCE-CODE", "ASSETS", "MAP", "BUILDINGS", "CHARACTERS", "ENVIRONMENT", "INTERIORS", "LEARNING"}:
            return False
        path = Path(self.translate_path(self.path))
        root = Path(self.directory).resolve()
        if not path.resolve().is_relative_to(root) or path.is_dir():
            return False
        cursor = path
        while cursor != root and cursor.is_relative_to(root):
            if cursor.is_symlink():
                return False
            cursor = cursor.parent
        return path.suffix.lower() in {".html", ".js", ".css", ".json", ".glb", ".gltf", ".bin", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".mp3", ".ogg", ".wav", ".woff2", ".txt"}

    def send_head(self):
        if not self.public_path():
            self.send_error(404, "Not found")
            return None
        # Ignore old browser validators too, including edits within one second.
        for header in ("If-Modified-Since", "If-None-Match"):
            if header in self.headers:
                del self.headers[header]
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, "Not found")
        return None

    def end_headers(self):
        # Local development must not mix cached scripts/JSON/GLBs from older edits.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == HEALTH:
            body = json.dumps(self.server.game_identity).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        method = urlsplit(self.path).path.removeprefix(LEARNING)
        if not self.path.startswith(LEARNING) or method not in {"state", "begin", "collect", "answer", "assign", "approve", "turnIn", "review"}:
            self.send_error(404, "Not found")
            return
        origin = self.headers.get("Origin")
        if origin not in {"http://localhost:" + str(self.server.server_port), "http://127.0.0.1:" + str(self.server.server_port)}:
            self.send_error(403, "Origin rejected")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 32768 or self.headers.get_content_type() != "application/json":
                raise ValueError("Invalid request")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Invalid request object")
            token = self.headers.get("Authorization", "")
            if not token.startswith("Bearer "):
                raise ValueError("Google login required")
            result = self.server.learning_request({"method": method, "data": payload.get("data"), "context": payload.get("context"), "token": token[7:]})
        except (ValueError, TypeError, OSError, queue.Empty):
            result = {"ok": False, "error": {"code": "unavailable", "message": "Chưa kết nối được bộ nhiệm vụ local. Cần Node 22 và thư viện Firebase Admin đã cài; hãy khởi động lại START-GAME.bat."}}
        body = json.dumps(result, ensure_ascii=False).encode("utf-8")
        self.send_response(200 if result.get("ok") else 503)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Keep the launch URL readable; still report failed requests.
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(format, *args)


class LocalGameServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = False
    daemon_threads = True

    def __init__(self, port, root):
        self.root = Path(root)
        self.learning_worker = None
        self.learning_lock = threading.Lock()
        self.learning_answers = queue.Queue()
        self.game_identity = identity(root)
        handler = functools.partial(GameHandler, directory=str(root))
        super().__init__(("127.0.0.1", port), handler)

    def learning_request(self, payload):
        with self.learning_lock:
            if self.learning_worker is None or self.learning_worker.poll() is not None:
                candidates = sorted((self.root / ".local-tools/node-22").glob("node-v22.*-win-x64/node.exe"))
                node = str(candidates[-1]) if candidates else shutil.which("node")
                if not node:
                    raise OSError("Node.js unavailable")
                self.learning_answers = queue.Queue()
                options = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}
                self.learning_worker = subprocess.Popen([node, str(self.root / "scripts/learning-preview-worker.mjs")],
                    cwd=self.root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                    text=True, encoding="utf-8", **options)
                answers, worker = self.learning_answers, self.learning_worker
                def read_answers():
                    for line in worker.stdout:
                        answers.put(line)
                threading.Thread(target=read_answers, daemon=True).start()
            try:
                self.learning_worker.stdin.write(json.dumps(payload) + "\n")
                self.learning_worker.stdin.flush()
                return json.loads(self.learning_answers.get(timeout=25))
            except (queue.Empty, ValueError, OSError):
                self.learning_worker.terminate()  # Only the child created by this server.
                self.learning_worker = None
                raise

    def server_close(self):
        if self.learning_worker is not None and self.learning_worker.poll() is None:
            self.learning_worker.terminate()
        super().server_close()

    def server_bind(self):
        # Unlike SO_REUSEADDR, this prevents a second Windows listener on this port.
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def ipv6_listener(port):
    try:
        with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as probe:
            probe.settimeout(0.2)
            return probe.connect_ex(("::1", port)) == 0
    except OSError:
        return False


def matches_server(host, port, expected):
    try:
        # Never send the loopback identity probe through a machine proxy.
        with build_opener(ProxyHandler({})).open(
                "http://" + host + ":" + str(port) + HEALTH, timeout=0.5) as response:
            return response.status == 200 and json.loads(response.read(4096)) == expected
    except HTTPError as error:
        error.close()
        return False
    except (OSError, ValueError, http.client.HTTPException):
        return False


def select_server(root, preferred, attempts=20):
    """Return (new server or None when reused, port). Never kill another process."""
    expected = identity(root)
    for port in range(preferred, min(65536, preferred + attempts)):
        v6 = ipv6_listener(port)
        if v6 and not matches_server("[::1]", port, expected):
            print("Port", port, "has another IPv6 listener; left unchanged.", flush=True)
            continue
        try:
            return LocalGameServer(port, root), port
        except OSError:
            if matches_server("127.0.0.1", port, expected):
                return None, port
            print("Port", port, "is busy/unavailable (other or legacy server); left unchanged.", flush=True)
    # Let Windows choose a free port if the nearby range is full/reserved.
    for _ in range(attempts):
        server = LocalGameServer(0, root)
        port = server.server_address[1]
        if not ipv6_listener(port):
            return server, port
        server.server_close()
    raise OSError("No unambiguous localhost port is available.")


def git_version(root):
    try:
        options = {"cwd": root, "capture_output": True, "text": True, "timeout": 3}
        if os.name == "nt":
            options["creationflags"] = subprocess.CREATE_NO_WINDOW
        branch = subprocess.run(["git", "branch", "--show-current"], **options)
        commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], **options)
        if branch.returncode == commit.returncode == 0:
            return branch.stdout.strip() + " @ " + commit.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        pass
    return "Git version unavailable (Git is optional for playing)."


def open_game(url, no_browser):
    if no_browser:
        return
    try:
        if webbrowser.open(url):
            return
    except (OSError, webbrowser.Error):
        pass
    print("Browser did not open. Copy the Game URL above into Chrome or Edge.", flush=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8001, help="preferred port; a free port is chosen if occupied")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    try:
        npc_count = validate_checkout(ROOT)
        server, port = select_server(ROOT, args.port)
    except (OSError, ValueError, TypeError, KeyError) as error:
        print("Cannot launch CAP-NHAT:", error, file=sys.stderr)
        print("Keep the complete project, including MAP, CHARACTERS, ASSETS and SOURCE-CODE."
              " Run START-GAME.bat from its root; do not open HTML directly.", file=sys.stderr)
        return 1
    url = "http://localhost:" + str(port) + "/" + ENTRY
    print("Project: " + str(ROOT) + "\nVersion: " + git_version(ROOT), flush=True)
    print("NPC definitions/models found: " + str(npc_count), flush=True)
    print(("Reusing verified server" if server is None else "Started project server")
          + "\nGame: " + url, flush=True)
    if server is None:
        open_game(url, args.no_browser)
        return 0
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        open_game(url, args.no_browser)
        print("Keep this window open. Stop this server with Ctrl+C.", flush=True)
        while worker.is_alive():
            worker.join(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()
        worker.join()
    return 0


if __name__ == "__main__":
    sys.exit(main())


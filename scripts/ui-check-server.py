"""Local browser UI-check server for developers (127.0.0.1 only).

Serves the game files with the same rules as START-GAME.bat plus the test-only
fixture page SOURCE-CODE/tests/ui-check/index.html, which uses fake local UIDs
instead of Google sign-in. It never answers the launcher health probe (so the
real launcher cannot mistake it for a game server), has no learning worker and
is not part of the Hosting package. Players keep using START-GAME.bat.
"""
import argparse
import functools
import http.server
import importlib.util
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = (ROOT / "SOURCE-CODE" / "tests" / "ui-check").resolve()
_spec = importlib.util.spec_from_file_location("serve_game", ROOT / "scripts" / "serve-game.py")
serve_game = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(serve_game)


class UICheckHandler(serve_game.GameHandler):
    def public_path(self):
        raw = unquote(urlsplit(self.path).path)
        if raw.startswith("/SOURCE-CODE/tests/ui-check/"):
            path = Path(self.translate_path(self.path)).resolve()
            return path.parent == FIXTURE and path.suffix in (".html", ".js") and path.is_file()
        return super().public_path()

    def do_GET(self):
        if urlsplit(self.path).path == serve_game.HEALTH:
            self.send_error(404, "Not a game launcher")
            return
        super().do_GET()

    def do_POST(self):
        self.send_error(404, "No learning worker in UI checks")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8014)
    args = parser.parse_args(argv)
    handler = functools.partial(UICheckHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print("UI check (fake local UIDs, no Google/Firebase): http://localhost:%d/SOURCE-CODE/tests/ui-check/index.html?player=a" % args.port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

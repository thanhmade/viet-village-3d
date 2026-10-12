"""Local-only HTTP server rooted at this CAP-NHAT checkout, never file://."""
import argparse
import functools
import http.server
from pathlib import Path
import socket
import sys
import webbrowser


class LocalGameServer(http.server.ThreadingHTTPServer):
    # HTTPServer enables SO_REUSEADDR, which can allow two listeners on Windows.
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    root = Path(__file__).resolve().parents[1]
    if not (root / "SOURCE-CODE/index.html").is_file():
        parser.error("SOURCE-CODE/index.html is missing from this checkout")
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    try:
        server = LocalGameServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        print(f"Cannot start port {args.port}: {error}", file=sys.stderr)
        print("An existing server was left unchanged. Choose another free port with --port.", file=sys.stderr)
        return 1
    url = f"http://localhost:{args.port}/SOURCE-CODE/index.html"
    with server:
        print(f"Serving: {root}\nGame: {url}\nStop: Ctrl+C", flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Real loopback HTTP boundary tests, without Google credentials or player data.

The POST worker is replaced by a test stub: these checks prove routing, origin,
payload limits and static file protection, not successful Google authentication.
"""
import functools
from contextlib import closing
import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("learning_http_server", ROOT / "scripts/serve-game.py")
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)


class QuietGameHandler(server_module.GameHandler):
    def log_message(self, *_):
        pass


class LearningHTTPBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cache = ROOT / ".cache"
        cache.mkdir(exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(prefix="learning-http-test-", dir=cache)
        cls.fixture = Path(cls.temp.name).resolve()
        cls.fixture.relative_to(cache.resolve())  # Cleanup can only touch our fixture.
        files = {
            "index.html": "<!doctype html><title>Loopback test fixture</title>",
            "SOURCE-CODE/index.html": "<!doctype html><title>Source test</title>",
            "SOURCE-CODE/js/app.js": "/* public test script */",
            "LEARNING/TV1-HK1/catalog.json": '{"testFixture":true}',
            "LEARNING/TV1-HK1/questions.public.json": "[]",
            "firebase/functions/shared/experience-core.js": "/* shared public core */",
            "firebase/functions/shared/experience-config.js": "/* shared public config */",
            "firebase/functions/private/test.questions.teacher.json": "PRIVATE_TEST_SENTINEL",
            "firebase/functions/quest-service.cjs": "PRIVATE_TEST_SENTINEL",
            "SOURCE-CODE/questions.teacher.json": "PRIVATE_TEST_SENTINEL",
            "MAP/regions/answer-key.json": "PRIVATE_TEST_SENTINEL",
            ".cache/quest-import/test.json": "PRIVATE_TEST_SENTINEL",
            ".git/config": "PRIVATE_TEST_SENTINEL",
            "BACKUP/source.txt": "PRIVATE_TEST_SENTINEL",
            "scripts/test.js": "PRIVATE_TEST_SENTINEL",
            "DOCUMENTS/test.txt": "PRIVATE_TEST_SENTINEL",
            "MAP/_ARCHIVE_ZIP/test.zip": "PRIVATE_TEST_SENTINEL",
            "LEARNING/.env": "PRIVATE_TEST_SENTINEL",
            "public-game/index.html": "<!doctype html><title>Built test</title>",
            "public-game/SOURCE-CODE/index.html": "<!doctype html><title>Built source</title>",
            "public-game/LEARNING/TV1-HK1/catalog.json": "{}",
            "public-game/firebase/functions/shared/experience-core.js": "/* shared built core */",
            "public-game/firebase/functions/private/test.questions.teacher.json": "PRIVATE_TEST_SENTINEL",
            "public-game/.cache/test.json": "PRIVATE_TEST_SENTINEL",
        }
        for relative, content in files.items():
            path = cls.fixture / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        cls.server = server_module.LocalGameServer(0, cls.fixture)
        cls.server.RequestHandlerClass = functools.partial(QuietGameHandler, directory=str(cls.fixture))
        cls.calls = []

        def stub_worker(payload):
            cls.calls.append(payload)
            return {"ok": True, "result": {"scope": "http-boundary-test-only"}}

        cls.server.learning_request = stub_worker
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_port

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)
        cls.fixture.relative_to((ROOT / ".cache").resolve())
        cls.temp.cleanup()

    def request(self, method, path, body=None, headers=None):
        with closing(http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)) as connection:
            connection.request(method, path, body=body, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()

    def post(self, body=b'{}', path="/__viet_village_learning__/state", **overrides):
        headers = {"Origin": f"http://localhost:{self.port}", "Content-Type": "application/json",
                   "Authorization": "Bearer boundary-test-only-not-a-real-token"}
        headers.update(overrides)
        return self.request("POST", path, body, headers)

    def test_public_source_and_build_entries_are_served(self):
        for path in ["/", "/index.html", "/SOURCE-CODE/index.html", "/SOURCE-CODE/js/app.js",
                     "/LEARNING/TV1-HK1/catalog.json", "/LEARNING/TV1-HK1/questions.public.json",
                     "/public-game/index.html", "/public-game/SOURCE-CODE/index.html",
                     "/public-game/LEARNING/TV1-HK1/catalog.json"]:
            with self.subTest(path=path):
                status, headers, body = self.request("GET", path)
                self.assertEqual(status, 200)
                self.assertEqual(headers.get("Cache-Control"), "no-store")
                self.assertNotIn(b"PRIVATE_TEST_SENTINEL", body)

    def test_only_exp_shared_backend_files_are_public(self):
        for path in ["/firebase/functions/shared/experience-core.js",
                     "/firebase/functions/shared/experience-config.js",
                     "/public-game/firebase/functions/shared/experience-core.js"]:
            with self.subTest(path=path):
                self.assertEqual(self.request("GET", path)[0], 200)
                self.assertEqual(self.request("HEAD", path)[0], 200)

    def test_private_files_denied_for_get_and_head(self):
        paths = ["/.cache/quest-import/test.json", "/.git/config", "/BACKUP/source.txt",
                 "/scripts/test.js", "/DOCUMENTS/test.txt", "/MAP/_ARCHIVE_ZIP/test.zip",
                 "/LEARNING/.env", "/firebase/functions/private/test.questions.teacher.json",
                 "/firebase/functions/quest-service.cjs", "/SOURCE-CODE/questions.teacher.json",
                 "/MAP/regions/answer-key.json", "/public-game/.cache/test.json",
                 "/public-game/firebase/functions/private/test.questions.teacher.json"]
        for method in ["GET", "HEAD"]:
            for path in paths:
                with self.subTest(method=method, path=path):
                    status, _, body = self.request(method, path)
                    self.assertEqual(status, 404)
                    self.assertNotIn(b"PRIVATE_TEST_SENTINEL", body)

    def test_percent_encoded_traversal_and_private_segments_denied(self):
        paths = ["/%2ecache/quest-import/test.json", "/%2egit/config",
                 "/SOURCE-CODE/%2e%2e/.cache/quest-import/test.json",
                 "/SOURCE-CODE/../.cache/quest-import/test.json",
                 "/SOURCE-CODE/%2e%2e%5c.cache%5cquest-import%5ctest.json",
                 "/SOURCE-CODE/questions.%74eacher.json",
                 "/%66irebase/functions/private/test.questions.teacher.json",
                 "/SOURCE-CODE/%252e%252e/%252ecache/test.json",
                 "/public-game/%2e%2e/.cache/quest-import/test.json",
                 "/SOURCE-CODE/C%3A/private.json"]
        for method in ["GET", "HEAD"]:
            for path in paths:
                with self.subTest(method=method, path=path):
                    status, _, body = self.request(method, path)
                    self.assertEqual(status, 404)
                    self.assertNotIn(b"PRIVATE_TEST_SENTINEL", body)

    def test_no_directory_listing(self):
        for path in ["/SOURCE-CODE", "/SOURCE-CODE/", "/MAP/", "/LEARNING/TV1-HK1/",
                     "/firebase/functions/shared/", "/public-game/", "/.cache/"]:
            with self.subTest(path=path):
                status, _, body = self.request("GET", path)
                self.assertEqual(status, 404)
                self.assertNotIn(b"Directory listing", body)

    def test_nul_path_is_rejected_without_aborting_connection(self):
        self.assertEqual(self.request("GET", "/SOURCE-CODE/a%00.json")[0], 404)

    def test_health_only_exposes_checkout_identity(self):
        status, _, body = self.request("GET", server_module.HEALTH)
        self.assertEqual(status, 200)
        result = json.loads(body)
        self.assertEqual(set(result), {"protocol", "rootId", "launcher", "entry"})
        self.assertNotIn(str(self.fixture).encode(), body)

    def test_post_rejects_wrong_or_missing_origin(self):
        count = len(self.calls)
        for origin in ["null", "https://localhost:" + str(self.port),
                       "http://attacker.example", "http://localhost:1", ""]:
            with self.subTest(origin=origin):
                self.assertEqual(self.post(Origin=origin)[0], 403)
        self.assertEqual(self.request("POST", server_module.LEARNING + "state", b'{}',
                                     {"Content-Type": "application/json"})[0], 403)
        self.assertEqual(len(self.calls), count)

    def test_post_rejects_unknown_endpoints_and_other_methods(self):
        count = len(self.calls)
        for path in [server_module.LEARNING + "delete", "/begin", server_module.LEARNING + "%62egin"]:
            self.assertEqual(self.post(path=path)[0], 404)
        self.assertEqual(self.request("GET", server_module.LEARNING + "begin")[0], 404)
        self.assertEqual(self.request("PUT", server_module.LEARNING + "begin", b'{}')[0], 501)
        self.assertEqual(self.request("OPTIONS", server_module.LEARNING + "begin")[0], 501)
        self.assertEqual(len(self.calls), count)

    def test_post_body_bounds_content_type_json_and_auth(self):
        count = len(self.calls)
        cases = [
            (b"{}", {"Content-Type": "text/plain"}),
            (b"{}", {"Content-Length": "-1"}),
            (b"{}", {"Content-Length": "not-a-number"}),
            (b"", {}), (b"{" + b" " * 32769 + b"}", {}),
            (b"not JSON", {}), (b"\xff", {}),
            (b"[]", {}), (b"null", {}), (b"1", {}), (b'"text"', {}),
            (b"{}", {"Authorization": ""}),
        ]
        for body, headers in cases:
            with self.subTest(body_type=body[:15], headers=headers):
                status, _, response = self.post(body, **headers)
                self.assertIn(status, (400, 401, 403, 413, 503))
                self.assertNotIn(b"PRIVATE_TEST_SENTINEL", response)
        self.assertEqual(len(self.calls), count)

    def test_same_origin_well_formed_request_reaches_stub_without_auth_claim(self):
        count = len(self.calls)
        status, _, response = self.post(json.dumps({"data": {"questId": "test"}, "context": {}}).encode())
        self.assertEqual(status, 200)
        self.assertEqual(len(self.calls), count + 1)
        self.assertEqual(json.loads(response)["result"]["scope"], "http-boundary-test-only")
        self.assertEqual(self.calls[-1]["method"], "state")
        self.assertEqual(self.post(Origin=f"http://127.0.0.1:{self.port}")[0], 200)


if __name__ == "__main__":
    unittest.main()

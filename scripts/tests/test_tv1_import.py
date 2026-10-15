"""Safety and idempotency checks; no answers printed or player state changed."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("tv1_import", ROOT / "scripts/import-tv1-quests.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportSafetyTests(unittest.TestCase):
    def test_rejects_path_traversal_and_drive_names(self):
        for name in ["../secret", "C:/secret", "/secret", "folder/../../secret", "folder\\..\\..\\secret"]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                importer.safe_archive_path(name)

    def test_valid_path_keeps_unicode(self):
        self.assertEqual(str(importer.safe_archive_path("gói/DATA/vần.json")), "gói/DATA/vần.json")

    def test_rejects_duplicate_ids(self):
        with self.assertRaises(ValueError):
            importer.unique_by_id([{"id": "one"}, {"id": "one"}])

    def test_public_scan_checks_deep_fields(self):
        for field in importer.FORBIDDEN_PUBLIC_KEYS:
            with self.subTest(field=field), self.assertRaises(ValueError):
                importer.assert_public_safe({"questions": [{"payload": {field: "private"}}]})

    def test_unplaced_is_never_marked_ready(self):
        source = {"id": "SP1", "zone_ref": "Z_POND", "position": None, "constraints": []}
        quest = {"id": "Q1", "steps": [{"id": "collect", "item_ref": "I1"}]}
        result = importer.spawn_record(source, quest)
        self.assertIsNone(result["position"])
        self.assertFalse(result["validated"])
        self.assertEqual(result["candidates"], [])

    def test_checked_position_requires_finite_xyz_and_evidence(self):
        source = {"id": "SP1", "zone_ref": "Z_POND", "position": None, "constraints": []}
        quest = {"id": "Q1", "steps": [{"id": "collect", "item_ref": "I1"}]}
        for position in [{"x": 0, "y": None, "z": 1}, {"x": float("nan"), "y": 0, "z": 1},
                         {"x": True, "y": 0, "z": 1}]:
            with self.subTest(position=position), self.assertRaises(ValueError):
                importer.spawn_record(source, quest, {"position": position, "validated": True}, "test")
        with self.assertRaises(ValueError):
            importer.spawn_record(source, quest, {"position": {"x": 0, "y": 0, "z": 1}, "validated": True})

    def test_checked_candidate_pool_retains_ids(self):
        source = {"id": "SP1", "zone_ref": "Z_POND", "position": None, "constraints": []}
        quest = {"id": "Q1", "steps": [{"id": "collect", "item_ref": "I1"}]}
        points = [{"id": "p1", "position": {"x": 0, "y": .3, "z": 1}, "validated": True},
                  {"id": "p2", "position": {"x": 1, "y": .3, "z": 1}, "validated": True}]
        result = importer.spawn_record(source, quest, points, {"method": "test fixture"})
        self.assertTrue(result["validated"])
        self.assertEqual([p["id"] for p in result["candidates"]], ["p1", "p2"])

    def test_same_import_is_byte_identical_and_not_appended(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".cache") as directory:
            project = Path(directory)
            outputs = {"LEARNING/test.json": {"quests": [{"id": "one", "title": "Đọc tiếng Việt"}]}}
            self.assertEqual(len(importer.write_outputs(project, outputs)), 1)
            first = (project / "LEARNING/test.json").read_bytes()
            self.assertEqual(importer.write_outputs(project, outputs), [])
            outputs["LEARNING/test.json"]["quests"][0]["title"] = "Tên cập nhật"
            importer.write_outputs(project, outputs)
            self.assertNotEqual(first, (project / "LEARNING/test.json").read_bytes())
            self.assertEqual(len(importer.read_json(project / "LEARNING/test.json")["quests"]), 1)

    def test_registry_replaces_by_pack_id_and_keeps_other_packs(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".cache") as directory:
            project = Path(directory)
            other = {"packId": "toan-2-hk1-v1", "version": 1, "idPrefix": "T2", "catalog": "T2/catalog.json"}
            first = importer.registry_with(project, dict(importer.PACK_ENTRY))
            importer.write_outputs(project, {importer.REGISTRY: {**first, "packs": first["packs"] + [other]}})
            updated = importer.registry_with(project, dict(importer.PACK_ENTRY, version=2))
            self.assertEqual([p["packId"] for p in updated["packs"]], ["toan-2-hk1-v1", "tv1-hk1-v1"])
            self.assertEqual(next(p for p in updated["packs"] if p["packId"] == "tv1-hk1-v1")["version"], 2)
            with self.assertRaises(ValueError):
                importer.registry_with(project, dict(importer.PACK_ENTRY, packId="clash", idPrefix="T2"))
            (project / importer.REGISTRY).write_text('{"schemaVersion": 9}', encoding="utf-8")
            with self.assertRaises(ValueError):
                importer.registry_with(project, dict(importer.PACK_ENTRY))

    def test_practice_keys_skip_rubrics_and_never_publish_answers(self):
        questions = [
            {"id": "Q_A", "type": "multi_select", "assessment": {"mode": "deterministic", "correct": ["b", "a"]}},
            {"id": "Q_B", "type": "oral_response", "assessment": {"mode": "teacher_rubric", "correct": None, "rubric": [{"id": "r"}]}},
        ]
        keys = importer.practice_keys(questions, "0" * 64)
        self.assertEqual(list(keys["keys"]), ["Q_A"])
        importer.assert_public_safe(keys)
        self.assertNotIn('"a"', json.dumps(keys))
        self.assertEqual(importer.canonical_answer("multi_select", ["b", "a", "a"]), "multi_select:a,b")
        self.assertEqual(importer.canonical_answer("match_pairs", {"L2": "R1", "L1": "R2"}), "match_pairs:L1=R2,L2=R1")
        with self.assertRaises(ValueError):
            importer.canonical_answer("single_choice", ["not", "a", "string"])

    def test_archive_rejects_windows_case_collision(self):
        with tempfile.TemporaryDirectory(dir=ROOT / ".cache") as directory:
            project = Path(directory)
            source = project / "test.zip"
            with zipfile.ZipFile(source, "w") as archive:
                archive.writestr("pack/FILE.json", "{}")
                archive.writestr("pack/file.json", "{}")
            with self.assertRaises(ValueError):
                importer.extract_archive(source, project)


class ImportedDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        catalog = ROOT / "LEARNING/TV1-HK1/catalog.json"
        if not catalog.exists():
            raise unittest.SkipTest("Run the importer after securing the local server")
        cls.catalog = importer.read_json(catalog)
        cls.questions = importer.read_json(ROOT / "LEARNING/TV1-HK1/questions.public.json")

    def test_expected_counts_without_duplicate_ids(self):
        self.assertEqual(self.catalog["counts"], {"weeks": 18, "quests": 87, "variants": 435})
        self.assertEqual(len({q["id"] for q in self.catalog["quests"]}), 87)
        self.assertEqual(len({q["id"] for q in self.questions}), 435)

    def test_no_answer_keys_or_teacher_labels_in_public_data(self):
        importer.assert_public_safe(self.catalog)
        importer.assert_public_safe(self.questions)
        self.assertEqual([entry["student_label"] for entry in self.catalog["levels"]], importer.LEVEL_LABELS)

    def test_bai33_uses_real_npc_ids_and_shared_reward(self):
        quest = next(q for q in self.catalog["quests"] if q["id"] == "QUEST_TV1_B033")
        self.assertEqual(quest["giver_npc_ref"], "NPC_LANG_VIET_TUAN_DINH")
        self.assertEqual(quest["return_npc_ref"], "NPC_LANG_VIET_THAY_DO")
        self.assertEqual(quest["map_id"], "lang-viet")
        self.assertEqual({v["reward_exp"] for v in quest["variants"]}, {230})
        self.assertEqual(quest["reward_policy"]["repeat_exp"], 0)
        self.assertEqual(quest["canonical_quest_id"], quest["id"])

    def test_registry_and_practice_keys_match_the_imported_pack(self):
        registry = importer.read_json(ROOT / importer.REGISTRY)
        entry = next(p for p in registry["packs"] if p["packId"] == importer.PACK_ID)
        self.assertEqual(entry["counts"], self.catalog["counts"])
        self.assertEqual(entry["sourceArchiveSha256"], self.catalog["sourceArchiveSha256"])
        keys = importer.read_json(ROOT / "LEARNING/TV1-HK1/practice-keys.json")
        importer.assert_public_safe(keys)
        auto = [q for q in self.questions if q["type"] in importer.AUTO_TYPES]
        self.assertEqual(set(keys["keys"]), {q["id"] for q in auto})

    def test_vietnamese_graphemes_and_story_provenance_preserved(self):
        lesson = next(l for l in self.catalog["lessons"] if l["id"] == "TV1_B033")
        self.assertEqual(lesson["targets"], ["en", "ên", "in", "un"])
        stories = [l for l in self.catalog["lessons"] if l.get("game_passage")]
        self.assertEqual(len(stories), 16)
        self.assertTrue(all(l.get("original_story_title") for l in stories))


if __name__ == "__main__":
    unittest.main()

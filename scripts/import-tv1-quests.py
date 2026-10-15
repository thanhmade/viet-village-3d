"""Import the reviewed TV1 pack without publishing teacher answers.

Only the files owned by this pack are replaced, by stable ID, never appended.
The original ZIP is read-only. Authoring files stay in .cache; answer keys stay
in firebase/functions/private. Both paths must be denied by the local server.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PACK_ID = "tv1-hk1-v1"
PACK_DIRECTORY = "TV1_HK1_LANG_VIET_NHIEM_VU_v1"
AUDITED_VALIDATOR_SHA256 = "62034ef58a9960b8a0b18f7368c7ff8bbbe4914d99ed3646ca4c14404e17b846"
NPC_IDS = {
    "NPC_TUAN_DINH": "NPC_LANG_VIET_TUAN_DINH",
    "NPC_LY_TRUONG": "NPC_LANG_VIET_LY_TRUONG",
    "NPC_THAY_DO": "NPC_LANG_VIET_THAY_DO",
    "NPC_NONG_DAN": "NPC_LANG_VIET_NONG_DAN",
    "NPC_TAP_HOA": "NPC_LANG_VIET_TAP_HOA",
}
LEVEL_LABELS = ["Khởi đầu", "Cơ bản", "Tiến bộ", "Thử thách", "Chinh phục"]
PUBLIC_QUESTION_FIELDS = {
    "id", "lesson_id", "week", "difficulty", "student_label", "type",
    "prompt", "skill", "options", "payload", "source_refs", "provenance",
    "delivery", "review_status",
}
FORBIDDEN_PUBLIC_KEYS = {"assessment", "correct", "answer", "answers", "hint", "explanation", "teacher_label", "rubric"}
REGISTRY = "LEARNING/packs.json"
# Registry entry: the game discovers packs from data. Every pack keeps its own
# packId/version and a unique ID prefix so subjects and grades never share IDs.
PACK_ENTRY = {
    "packId": PACK_ID, "version": 1, "title": "Tiếng Việt 1 – Học kì 1",
    "subject": "tieng-viet", "grade": 1, "semester": 1, "mapId": "lang-viet", "idPrefix": "TV1",
    "catalog": "TV1-HK1/catalog.json", "questions": "TV1-HK1/questions.public.json",
    "practiceKeys": "TV1-HK1/practice-keys.json",
}
AUTO_TYPES = {"single_choice", "multi_select", "order_tokens", "match_pairs"}


def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def json_bytes(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def safe_archive_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name.replace("\\", "/"))
    if not path.parts or path.is_absolute() or ".." in path.parts or ":" in name:
        raise ValueError("Unsafe archive member")
    return path


def extract_archive(source: Path, project: Path) -> tuple[Path, str]:
    archive_hash = digest_bytes(source.read_bytes())
    target = project / ".cache" / "quest-import" / archive_hash[:12]
    with zipfile.ZipFile(source) as archive:
        members = archive.infolist()
        if sum(item.file_size for item in members) > 64 * 1024 * 1024:
            raise ValueError("Quest archive exceeds the reviewed 64 MiB extraction budget")
        names = set()
        manifest = None
        for item in members:
            rel = safe_archive_path(item.filename)
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError("Archive symlinks are not supported")
            if str(rel).casefold() in names:
                raise ValueError("Duplicate or Windows case-colliding archive member")
            names.add(str(rel).casefold())
            if rel.name == "MANIFEST_SHA256.json":
                manifest = json.loads(archive.read(item))
        if not isinstance(manifest, dict):
            raise ValueError("Missing package SHA256 manifest")
        for item in members:
            rel = safe_archive_path(item.filename)
            out = target.joinpath(*rel.parts)
            out.resolve().relative_to(target.resolve())
            if item.is_dir():
                out.mkdir(parents=True, exist_ok=True)
                continue
            data = archive.read(item)  # zipfile verifies the member CRC.
            key = str(PurePosixPath(*rel.parts[1:]))
            if key in manifest and digest_bytes(data) != manifest[key]:
                raise ValueError("Package manifest checksum mismatch: " + key)
            out.parent.mkdir(parents=True, exist_ok=True)
            if out.exists() and out.read_bytes() != data:
                # The reviewed validator regenerates this report; never replace
                # other cached authoring edits silently on a later import.
                if key != "DATA/validation-report.json":
                    raise ValueError("Existing extracted file differs: " + key)
            elif not out.exists():
                out.write_bytes(data)
    package = target / PACK_DIRECTORY
    if not (package / "DATA/quests.json").is_file():
        raise ValueError("Unexpected package layout; no nested extraction attempted")
    return package, archive_hash


def run_reviewed_validator(package: Path) -> dict:
    validator = package / "validate_pack.py"
    if digest_bytes(validator.read_bytes()) != AUDITED_VALIDATOR_SHA256:
        raise ValueError("Validator changed: inspect it before approving a new hash")
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    result = subprocess.run([sys.executable, str(validator)], cwd=package,
                            env=env, capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise ValueError("Package validator failed: " + result.stderr[-1200:])
    report = read_json(package / "DATA/validation-report.json")
    if report.get("status") != "passed":
        raise ValueError("Package did not pass validation")
    return {key: value for key, value in report.items() if key != "checks"}


def unique_by_id(records: list, key="id") -> list:
    result = {}
    for record in records:
        item_id = record.get(key)
        if not isinstance(item_id, str) or not item_id or item_id in result:
            raise ValueError("Missing or duplicate stable ID")
        result[item_id] = copy.deepcopy(record)
    return list(result.values())


def assert_public_safe(value):
    if isinstance(value, dict):
        bad = FORBIDDEN_PUBLIC_KEYS.intersection(value)
        if bad:
            raise ValueError("Teacher-only fields reached public output: " + ", ".join(sorted(bad)))
        for child in value.values():
            assert_public_safe(child)
    elif isinstance(value, list):
        for child in value:
            assert_public_safe(child)


def canonical_answer(question_type: str, correct) -> str:
    """Same canonical form as canonicalAnswer() in SOURCE-CODE/js/learning-practice.js."""
    if question_type == "single_choice" and isinstance(correct, str):
        value = correct
    elif question_type == "multi_select" and isinstance(correct, list):
        value = ",".join(sorted(set(correct)))
    elif question_type == "order_tokens" and isinstance(correct, list):
        value = ",".join(correct)
    elif question_type == "match_pairs" and isinstance(correct, dict):
        value = ",".join(sorted(f"{left}={right}" for left, right in correct.items()))
    else:
        raise ValueError("Unsupported auto-graded answer: " + question_type)
    return question_type + ":" + value


def practice_keys(questions: list, archive_hash: str, pack_id: str = PACK_ID) -> dict:
    """Salted hashes for browser practice feedback only; rubrics and hints stay private.

    A static website cannot hide a grading key: these hashes stop casual reading,
    not guessing. Practice results are never EXP or proof of completion.
    """
    keys = {}
    for question in questions:
        if question["assessment"].get("mode") != "deterministic":
            continue
        if question["type"] not in AUTO_TYPES:
            raise ValueError("Deterministic question has an unsupported type: " + question["id"])
        salt = digest_bytes(f"practice-salt|{archive_hash}|{question['id']}".encode("utf-8"))[:16]
        answer = canonical_answer(question["type"], question["assessment"]["correct"])
        keys[question["id"]] = {"type": question["type"], "salt": salt,
                                "sha256": digest_bytes(f"{pack_id}|{question['id']}|{salt}|{answer}".encode("utf-8"))}
    return {"schemaVersion": 1, "packId": pack_id, "sourceArchiveSha256": archive_hash,
            "algorithm": "sha256(packId|questionId|salt|type:canonical)",
            "purpose": "Practice feedback on static web hosting only; not authoritative and guessable by testing options. No EXP.",
            "keys": keys}


def registry_with(project: Path, entry: dict) -> dict:
    """Insert or replace one pack by packId; other packs are kept unchanged."""
    path = project / REGISTRY
    registry = read_json(path) if path.is_file() else {"schemaVersion": 1, "packs": []}
    if registry.get("schemaVersion") != 1 or not isinstance(registry.get("packs"), list):
        raise ValueError("Unsupported pack registry; existing file kept unchanged")
    packs = [copy.deepcopy(pack) for pack in registry["packs"] if pack.get("packId") != entry["packId"]]
    if any(pack.get("idPrefix") == entry["idPrefix"] for pack in packs):
        raise ValueError("Another pack already uses ID prefix " + entry["idPrefix"])
    packs.append(copy.deepcopy(entry))
    packs.sort(key=lambda pack: pack["packId"])
    return {"schemaVersion": 1,
            "purpose": "Danh mục gói nhiệm vụ học tập công khai; thêm gói mới bằng dữ liệu, không sửa giao diện.",
            "packs": packs}


def spawn_record(source: dict, quest: dict, overlay: list | dict | None = None,
                 evidence: dict | str | None = None) -> dict:
    collect = next(step for step in quest["steps"] if step["id"] == "collect")
    result = {
        "id": source["id"], "itemId": collect["item_ref"],
        "questId": quest["id"], "mapId": "lang-viet", "zoneId": source["zone_ref"],
        "position": None, "validated": False, "candidates": [],
        "constraints": source["constraints"], "sourcePositionWasNull": source["position"] is None,
    }
    entries = overlay if isinstance(overlay, list) else [overlay] if overlay else []
    for candidate in entries:
        position = candidate.get("position")
        if candidate.get("validated") is not True or not isinstance(position, dict):
            continue
        if not all(isinstance(position.get(axis), (float, int)) and not isinstance(position[axis], bool)
                   and math.isfinite(position[axis]) for axis in ("x", "y", "z")):
            raise ValueError("Invalid checked spawn position: " + source["id"])
        proof = candidate.get("validationEvidence", evidence)
        if candidate.get("mapId", "lang-viet") != "lang-viet" or not proof:
            raise ValueError("Validated spawn requires correct MAP and evidence")
        result["candidates"].append({"id": candidate.get("id", source["id"] + "-default"),
                                     "position": position, "validated": True})
        result["validationEvidence"] = proof
    if result["candidates"]:
        unique_by_id(result["candidates"])
        result.update({"position": result["candidates"][0]["position"], "validated": True})
    return result


def build_outputs(package: Path, project: Path, archive_hash: str, validation: dict,
                  placement_overlay: dict | None = None) -> dict[str, object]:
    data = package / "DATA"
    load = lambda name: read_json(data / (name + ".json"))
    lessons = unique_by_id(load("lessons"))
    quests = unique_by_id(load("quests"))
    items = unique_by_id(load("items"))
    teacher_questions = unique_by_id(load("questions.teacher"))
    public_questions = unique_by_id(load("questions.public"))
    real_npc_ids = {npc["id"] for npc in read_json(project / "MAP/regions/lang-viet/gameplay.json")["npcs"]}
    if not set(NPC_IDS.values()).issubset(real_npc_ids):
        raise ValueError("Runtime NPC mapping no longer matches Làng Việt")
    for quest in quests:
        quest["map_id"] = "lang-viet"
        for field in ("giver_npc_ref", "return_npc_ref"):
            quest[field] = NPC_IDS[quest[field]]
        for step in quest["steps"]:
            if "npc_ref" in step:
                step["npc_ref"] = NPC_IDS[step["npc_ref"]]
        quest["canonical_quest_id"] = quest["id"]
        quest["pack_id"] = PACK_ID
        quest["subject"] = "tieng-viet"
        quest["grade"] = 1
        quest["runtime_status"] = "adapter_imported_requires_server_assignment_and_checked_spawn"
    quests_by_id = {quest["id"]: quest for quest in quests}
    overlay = placement_overlay or {}
    overlays_by_id = {p["id"]: p for p in overlay.get("spawnPoints", [])}
    zones = overlay.get("zones", {})
    spawns = [spawn_record(spawn, quests_by_id[spawn["quest_id"]],
                          overlays_by_id.get(spawn["id"], zones.get(spawn["zone_ref"])),
                          overlay.get("validation"))
              for spawn in unique_by_id(load("spawn-points"))]
    public_quests = copy.deepcopy(quests)
    for quest in public_quests:
        quest["practice"].pop("criteria", None)
    public_questions = [{key: value for key, value in q.items() if key in PUBLIC_QUESTION_FIELDS}
                        for q in public_questions]
    for question in public_questions:
        question["student_label"] = LEVEL_LABELS[question["difficulty"] - 1]
    common = {
        "schemaVersion": 1, "packId": PACK_ID, "sourceArchiveSha256": archive_hash,
        "title": "Tiếng Việt 1 – Học kì 1", "subject": "tieng-viet", "grade": 1, "semester": 1,
        "levels": [{"difficulty": i + 1, "student_label": name} for i, name in enumerate(LEVEL_LABELS)],
        "counts": {"weeks": 18, "quests": len(quests), "variants": len(public_questions)},
        "firstQuestId": "QUEST_TV1_B033", "npcBindings": NPC_IDS,
    }
    public = dict(common, lessons=lessons, quests=public_quests, items=items,
                  dialogues=unique_by_id(load("dialogues"), "quest_ref"), spawnPoints=spawns,
                  sources=load("sources"),
                  sourceIssues=[{key: issue.get(key) for key in ("id", "week", "lesson")}
                                for issue in load("source-issues")],
                  assetRequirements=load("asset-requirements"),
                  provenance="Bài tập và truyện game tự biên soạn bổ trợ theo KHBD; không thay bài/truyện gốc SGK.",
                  questionsUrl="questions.public.json", serverRequired=True)
    private = dict(common, quests=quests, questions=teacher_questions, items=items,
                   spawnPoints=spawns, progressionProposal=load("progression-config"),
                   sources=load("sources"), sourceIssues=load("source-issues"))
    keys = practice_keys(teacher_questions, archive_hash)
    entry = dict(PACK_ENTRY, sourceArchiveSha256=archive_hash, counts=common["counts"])
    registry = registry_with(project, entry)
    for value in (public, public_questions, keys, registry):
        assert_public_safe(value)
    report = {
        "schemaVersion": 1, "packId": PACK_ID, "sourceArchiveSha256": archive_hash,
        "sourceValidator": validation,
        "checkedSpawnCount": sum(p["validated"] for p in spawns),
        "publicFiles": ["LEARNING/TV1-HK1/catalog.json", "LEARNING/TV1-HK1/questions.public.json",
                        "LEARNING/TV1-HK1/practice-keys.json", REGISTRY],
        "practiceKeyPolicy": "Hashed deterministic answers for static-web practice feedback only; guessable, never EXP.",
        "privateFile": "firebase/functions/private/tv1-hk1-v1.questions.teacher.json",
        "progressionPolicy": "Keep existing shared experience table version 1; proposed table retained server-side for review. No profile migration.",
        "npcBindings": NPC_IDS,
        "limitations": ["Requires trusted teacher assignment and confirmation", "Audio and writing exemplars not supplied", "Content remains draft for teacher review"],
    }
    return {"LEARNING/TV1-HK1/catalog.json": public,
            "LEARNING/TV1-HK1/questions.public.json": public_questions,
            "LEARNING/TV1-HK1/practice-keys.json": keys,
            REGISTRY: registry,
            "firebase/functions/private/tv1-hk1-v1.questions.teacher.json": private,
            "DOCUMENTS/TV1-HK1-IMPORT-AUDIT.json": report}


def write_outputs(project: Path, outputs: dict[str, object]) -> list[str]:
    changed = []
    for relative, value in outputs.items():
        path = project / relative
        path.resolve().relative_to(project.resolve())
        content = json_bytes(value)
        if path.exists() and path.read_bytes() == content:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + ".importing")
        temporary.write_bytes(content)
        temporary.replace(path)
        changed.append(relative)
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Read-only source ZIP")
    parser.add_argument("--placements", type=Path, help="Reviewed real-world placement overlay")
    args = parser.parse_args()
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    package, archive_hash = extract_archive(args.source.resolve(), ROOT)
    validation = run_reviewed_validator(package)
    placements_path = args.placements or ROOT / "LEARNING/TV1-HK1/spawn-placements.json"
    overlay = read_json(placements_path) if placements_path.is_file() else None
    outputs = build_outputs(package, ROOT, archive_hash, validation, overlay)
    changed = write_outputs(ROOT, outputs)
    if digest_bytes(args.source.read_bytes()) != archive_hash:
        raise ValueError("Source archive changed during import")
    print(json.dumps({"status": "passed", "changedFiles": changed,
                      "validatorChecks": validation["checks_passed"],
                      "counts": outputs["LEARNING/TV1-HK1/catalog.json"]["counts"],
                      "checkedSpawnCount": outputs["DOCUMENTS/TV1-HK1-IMPORT-AUDIT.json"]["checkedSpawnCount"]},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

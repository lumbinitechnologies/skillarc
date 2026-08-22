import importlib.util
import json
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "migrate_arca_legacy.py"
spec = importlib.util.spec_from_file_location("arca_legacy_migration", SCRIPT)
migration = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(migration)


ORG = "00000000-0000-0000-0000-000000000001"
INST = "00000000-0000-0000-0000-000000000002"
OWNER = "00000000-0000-0000-0000-000000000003"
DEPT = "00000000-0000-0000-0000-000000000004"


def test_mapping_rejects_invalid_scope_without_importing_it(tmp_path):
    mapping_path = tmp_path / "mapping.json"
    mapping_path.write_text(
        json.dumps(
            {
                "valid": {
                    "organization_id": ORG,
                    "institution_id": INST,
                    "owner_id": OWNER,
                    "visibility": "institution",
                },
                "invalid": {
                    "organization_id": "not-a-uuid",
                    "institution_id": INST,
                    "owner_id": OWNER,
                    "visibility": "institution",
                },
            }
        )
    )

    valid, rejected = migration._load_mapping(str(mapping_path))

    assert set(valid) == {"valid"}
    assert rejected == [{"legacy_id": "invalid", "reason": "scope contains invalid UUID"}]


def test_authority_snapshot_checks_relationship_institution(tmp_path):
    mapping = {
        "doc-a": {
            "organization_id": ORG,
            "institution_id": INST,
            "owner_id": OWNER,
            "department_id": DEPT,
            "visibility": "department",
        }
    }
    snapshot = {
        "organizations": [ORG],
        "institutions": [{"id": INST}],
        "users": [{"id": OWNER, "institution_id": INST}],
        "departments": [{"id": DEPT, "institution_id": "00000000-0000-0000-0000-000000000099"}],
    }
    snapshot_path = tmp_path / "authority-snapshot.json"
    snapshot_path.write_text(json.dumps(snapshot))
    valid, rejected = migration._validate_against_snapshot(mapping, str(snapshot_path))

    assert valid == {}
    assert rejected[0]["legacy_id"] == "doc-a"
    assert "department_id" in rejected[0]["reason"]

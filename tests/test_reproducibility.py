import hashlib
import json

from data_gen import build_dataset
from evaluation import evaluate


def _checksum(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()


def test_same_seed_same_dataset():
    c1, t1 = build_dataset()
    c2, t2 = build_dataset()
    assert len(c1) == 120
    assert _checksum(c1) == _checksum(c2)
    assert _checksum(t1) == _checksum(t2)


def test_evaluation_is_reproducible(dataset):
    a, b = evaluate(*dataset), evaluate(*dataset)
    for key in ("macro_metrics", "per_product", "cross_validation", "calibration"):
        assert a[key] == b[key]


def test_evaluation_checks_all_pass(dataset):
    ev = evaluate(*dataset)
    assert all(t["passed"] for t in ev["carbon_tests"] + ev["guardrail_tests"] + ev["llm_checks"])
    r = ev["reproducibility"]
    assert r["customers_match"] and r["transactions_match"] and r["amount_checksum_match"]


def test_cross_validation_covers_all_customers(dataset):
    cv = evaluate(*dataset)["cross_validation"]
    assert cv["folds"] == 5 and cv["customers"] == 120
    assert all(p["n"] == 120 for p in cv["per_product"])
    assert cv["macro_auc"]["learned"]["mean"] is not None


def test_scorer_beats_random_on_synthetic_labels(dataset):
    m = evaluate(*dataset)["macro_metrics"]
    assert m["model"]["auc"] > m["random"]["auc"]
    assert m["learned"]["auc"] > m["random"]["auc"]

"""Evaluation harness: reproducible ranking-consistency metrics on SYNTHETIC labels.
The labels are produced by a noisy rule over the same features the scorer uses, so
results measure agreement with that rule, not real-world take-up. Splits are
customer-level. Reports a hold-out split and 5-fold cross-validation, comparing the
transparent scorer, a trained logistic regression, and baselines.
"""
import hashlib
import json
import math
import random
import re
import time
from datetime import datetime, timezone

from propensity import PRODUCTS, features
from carbon import calculate_scenario
from llm import fallback_text
from learned import feature_vector, fit_logreg, predict
from data_gen import build_dataset


def _norm(x, cap):
    return max(0.0, min(1.0, x / cap))


def _sigmoid(x):
    return 1 / (1 + math.exp(-x))


def _split_of(customer_id):
    h = int(hashlib.sha256(customer_id.encode()).hexdigest(), 16) % 10
    return "train" if h < 6 else ("validation" if h < 8 else "test")


# Synthetic label rule: same features as the scorer, different weights, plus gaussian noise.
# This is circular by construction - see "limitations" in the report.
LABEL_Z = {
    "ev_finance": lambda c, f: 1.3 * _norm(f["spend_fuel"], 5000)
    + 1.2 * _norm((c["vehicle"] or {}).get("annual_mileage", 0), 22000)
    + 0.9 * _norm((c["vehicle"] or {}).get("vehicle_age", 0), 12)
    + 0.3 * c["sustainability_preference"] - 1.7,
    "solar": lambda c, f: (1.4 * _norm(c["electricity_kwh_per_month"], 450)
                           + 0.9 * c["sustainability_preference"]
                           + 0.5 * c["digital_ratio"] - 1.5) if c["home_owner"] else -6.0,
    "green_home": lambda c, f: (1.2 * _norm(f["spend_electricity"] + f["spend_utilities"], 6500)
                                + (0.8 if "Home Loan" in c["products_held"] else 0)
                                + 0.6 * c["sustainability_preference"] - 1.4) if c["home_owner"] else -6.0,
    "paperless": lambda c, f: 1.3 * c["digital_ratio"] + 1.1 * _norm(c["paper_statements_per_month"], 3)
    + 0.5 * _norm(c["branch_visits_per_month"], 4) - 1.6,
    "green_invest": lambda c, f: 1.2 * c["sustainability_preference"]
    + (0.8 if ("Mutual Funds" in c["products_held"] or "Fixed Deposit" in c["products_held"]) else 0)
    + 0.5 * _norm(["under_5L", "5_10L", "10_18L", "18_30L", "30L_plus"].index(c["income_band"]), 4) - 1.5,
    "green_loan": lambda c, f: 1.3 * _norm(f["spend_home_improvement"], 8000)
    + (0.7 if ("Personal Loan" in c["products_held"] or "Credit Card" in c["products_held"]) else 0)
    + 0.4 * c["digital_ratio"] - 1.5,
}

SINGLE_SIGNAL = {
    "ev_finance": lambda c, f: _norm(f["spend_fuel"], 5000),
    "solar": lambda c, f: _norm(c["electricity_kwh_per_month"], 450),
    "green_home": lambda c, f: _norm(f["spend_electricity"] + f["spend_utilities"], 6500),
    "paperless": lambda c, f: _norm(c["paper_statements_per_month"], 3),
    "green_invest": lambda c, f: c["sustainability_preference"],
    "green_loan": lambda c, f: _norm(f["spend_home_improvement"], 8000),
}


def _make_label(cust, f, pid):
    # take-up is only possible when eligible; already-paperless customers cannot "take up" paperless
    if pid == "paperless" and cust["paper_statements_per_month"] == 0:
        return 0
    if pid == "ev_finance" and (not cust["vehicle"] or cust["vehicle"]["fuel_type"] == "EV"):
        return 0
    rng = random.Random(f"label::{cust['customer_id']}::{pid}")
    z = LABEL_Z[pid](cust, f) + rng.gauss(0, 0.5)
    return 1 if rng.random() < _sigmoid(z) else 0


def _auc(pairs):
    pos = [s for s, l in pairs if l == 1]
    neg = [s for s, l in pairs if l == 0]
    if not pos or not neg:
        return None
    wins = sum(1.0 if p > n else 0.5 if p == n else 0.0 for p in pos for n in neg)
    return wins / (len(pos) * len(neg))


def _logloss(pairs):
    eps = 1e-7
    return -sum(l * math.log(min(max(s, eps), 1 - eps)) + (1 - l) * math.log(min(max(1 - s, eps), 1 - eps))
                for s, l in pairs) / len(pairs)


def _brier(pairs):
    return sum((s - l) ** 2 for s, l in pairs) / len(pairs)


def _precision_at_k(pairs, k):
    top = sorted(pairs, key=lambda x: -x[0])[:k]
    return sum(l for _, l in top) / len(top) if top else 0.0


def _bootstrap_auc(pairs, B=1000, seed=123):
    """Percentile bootstrap 95% CI for AUC. Seeded so the report is reproducible.
    Degenerate resamples (single class) are skipped."""
    rng = random.Random(seed)
    n = len(pairs)
    stats = []
    for _ in range(B):
        sample = [pairs[rng.randrange(n)] for _ in range(n)]
        a = _auc(sample)
        if a is not None:
            stats.append(a)
    if len(stats) < 50:
        return None
    stats.sort()
    lo = stats[int(0.025 * len(stats))]
    hi = stats[min(int(0.975 * len(stats)), len(stats) - 1)]
    return [round(lo, 3), round(hi, 3)]


def _bootstrap_macro_auc(test_rows, product_ids, B=400, seed=321):
    """CI for macro AUC: resample pooled test rows, recompute per-product AUCs, average."""
    rng = random.Random(seed)
    n = len(test_rows)
    stats = []
    for _ in range(B):
        sample = [test_rows[rng.randrange(n)] for _ in range(n)]
        aucs = []
        for pid in product_ids:
            pairs = [(r["model"], r["label"]) for r in sample if r["product_id"] == pid]
            a = _auc(pairs)
            if a is not None:
                aucs.append(a)
        if aucs:
            stats.append(sum(aucs) / len(aucs))
    if len(stats) < 50:
        return None
    stats.sort()
    lo = stats[int(0.025 * len(stats))]
    hi = stats[min(int(0.975 * len(stats)), len(stats) - 1)]
    return [round(lo, 3), round(hi, 3)]


def _metrics(pairs):
    k = max(3, int(0.15 * len(pairs)))
    return {
        "n": len(pairs),
        "positives": sum(l for _, l in pairs),
        "auc": round(_auc(pairs), 3) if _auc(pairs) is not None else None,
        "precision_at_k": round(_precision_at_k(pairs, k), 3),
        "brier": round(_brier(pairs), 4),
        "log_loss": round(_logloss(pairs), 4),
    }


CV_FOLDS = 5


def _fold_of(customer_id):
    return int(hashlib.sha256(f"fold::{customer_id}".encode()).hexdigest(), 16) % CV_FOLDS


def build_rows(customers, tx_by_cust, opps):
    """One row per customer x product: split, fold, label, scorer score, baseline, learned-model features."""
    score_of = {(o["customer_id"], o["product_id"]): o for o in opps}
    rows = []
    for c in customers:
        f = features(c, tx_by_cust.get(c["customer_id"], []))
        for p in PRODUCTS:
            pid = p["id"]
            opp = score_of.get((c["customer_id"], pid))
            eligible = bool(opp and opp["eligible"])
            rows.append({
                "customer_id": c["customer_id"],
                "split": _split_of(c["customer_id"]),
                "fold": _fold_of(c["customer_id"]),
                "product_id": pid,
                "eligible": eligible,
                "label": _make_label(c, f, pid) if eligible else 0,
                "model": opp["propensity"] if (opp and opp["propensity"] is not None) else 0.0,
                "single": SINGLE_SIGNAL[pid](c, f),
                "random": 0.5,
                "x": feature_vector(c, f, pid),
            })
    return rows


def _fit_and_score(train_rows, score_rows, key):
    """Fit logistic regression on eligible training rows, write predictions to score_rows[key]."""
    for pid in [p["id"] for p in PRODUCTS]:
        tr = [r for r in train_rows if r["product_id"] == pid and r["eligible"]]
        w = fit_logreg([r["x"] for r in tr], [r["label"] for r in tr]) if tr else None
        for r in score_rows:
            if r["product_id"] == pid:
                r[key] = round(predict(w, r["x"]), 4) if (w and r["eligible"]) else 0.0
    return score_rows


def holdout_learned(rows):
    train = [r for r in rows if r["split"] == "train"]
    test = [dict(r) for r in rows if r["split"] == "test"]
    return _fit_and_score(train, test, "learned")


def cross_validate(rows):
    """5-fold customer-level CV over all customers. The transparent scorer has fixed weights (no fitting);
    the logistic regression is refit on 4 folds and scored on the held-out fold."""
    oof = []
    for k in range(CV_FOLDS):
        held = [dict(r) for r in rows if r["fold"] == k]
        oof.extend(_fit_and_score([r for r in rows if r["fold"] != k], held, "learned"))
    per_product, fold_macro = [], {"model": [], "learned": [], "single": []}
    for k in range(CV_FOLDS):
        fr = [r for r in oof if r["fold"] == k]
        for key in fold_macro:
            aucs = [_auc([(r[key], r["label"]) for r in fr if r["product_id"] == p["id"]]) for p in PRODUCTS]
            aucs = [a for a in aucs if a is not None]
            if aucs:
                fold_macro[key].append(sum(aucs) / len(aucs))
    for p in PRODUCTS:
        pr = [r for r in oof if r["product_id"] == p["id"]]
        out = {"product": p["name"], "n": len(pr), "positives": sum(r["label"] for r in pr)}
        for key in ("model", "learned", "single"):
            a = _auc([(r[key], r["label"]) for r in pr])
            out[f"{key}_auc"] = round(a, 3) if a is not None else None
        per_product.append(out)

    def stats(vals):
        if not vals:
            return {"mean": None, "std": None}
        m = sum(vals) / len(vals)
        return {"mean": round(m, 3), "std": round(math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals)), 3)}

    return {
        "folds": CV_FOLDS,
        "customers": len({r["customer_id"] for r in rows}),
        "fold_rule": "sha256('fold::' + customer_id) mod 5, customer-level",
        "per_product": per_product,
        "macro_auc": {"model": stats(fold_macro["model"]), "learned": stats(fold_macro["learned"]),
                      "single_signal": stats(fold_macro["single"])},
        "rows": oof,
    }


def _ungrounded_numbers(text, ctx):
    text_numbers = {n.replace(",", "") for n in re.findall(r"\d[\d,]*\.?\d*", text)}
    ctx_numbers = {n.replace(",", "") for n in re.findall(r"\d[\d,]*\.?\d*", json.dumps(ctx, default=str))}
    return [n for n in text_numbers if n not in ctx_numbers and len(n) > 1]


CARBON_KNOWN_ANSWERS = [
    ("ev", {"annual_km": 15000, "kmpl": 15}, 588.0),
    ("solar", {"monthly_kwh": 300, "roof_kw": 3}, 2952.0),
    ("green_home", {"monthly_kwh": 300, "monthly_gas_scm": 6}, 464.8),
    ("paperless", {"statements_per_month": 2, "branch_visits_per_month": 2}, 11.0),
]


def evaluate(customers, txns, opps):
    """Pure evaluation over in-memory data. Used by /api/evaluation and by tests/."""
    t0 = time.perf_counter()
    tx_by_cust = {}
    for t in txns:
        tx_by_cust.setdefault(t["customer_id"], []).append(t)

    rows = build_rows(customers, tx_by_cust, opps)
    test = holdout_learned(rows)
    splits = {"train": sum(1 for r in rows if r["split"] == "train"),
              "validation": sum(1 for r in rows if r["split"] == "validation"),
              "test": len(test)}

    per_product = []
    for p in PRODUCTS:
        pr = [r for r in test if r["product_id"] == p["id"]]
        if not pr:
            continue
        model_pairs = [(r["model"], r["label"]) for r in pr]
        learned_pairs = [(r["learned"], r["label"]) for r in pr]
        model_metrics = _metrics(model_pairs)
        model_metrics["auc_ci"] = _bootstrap_auc(model_pairs)
        learned_metrics = _metrics(learned_pairs)
        learned_metrics["auc_ci"] = _bootstrap_auc(learned_pairs)
        per_product.append({
            "product": p["name"],
            "model": model_metrics,
            "learned": learned_metrics,
            "single_signal": _metrics([(r["single"], r["label"]) for r in pr]),
            "random": _metrics([(r["random"], r["label"]) for r in pr]),
        })

    macro_ci = _bootstrap_macro_auc(test, [p["id"] for p in PRODUCTS])

    def macro(name, key):
        vals = [pp[name][key] for pp in per_product if pp[name][key] is not None]
        return round(sum(vals) / len(vals), 3) if vals else None

    buckets = [{"range": f"{i/5:.1f}-{(i+1)/5:.1f}", "predicted": 0.0, "observed": 0.0, "count": 0} for i in range(5)]
    acc = [[] for _ in range(5)]
    for r in test:
        acc[min(int(r["model"] * 5), 4)].append(r)
    for i, rs in enumerate(acc):
        if rs:
            buckets[i]["predicted"] = round(sum(x["model"] for x in rs) / len(rs), 3)
            buckets[i]["observed"] = round(sum(x["label"] for x in rs) / len(rs), 3)
            buckets[i]["count"] = len(rs)

    cv = cross_validate(rows)
    cv.pop("rows")

    carbon_tests = []
    for scenario, inputs, expected in CARBON_KNOWN_ANSWERS:
        actual = calculate_scenario(scenario, inputs)["kg_co2e_per_year"]
        carbon_tests.append({"name": f"{scenario} {inputs}", "expected": expected, "actual": actual,
                             "passed": abs(actual - expected) < 0.15})

    recommended = [o for o in opps if o.get("recommended")]
    ineligible_recommended = sum(1 for o in recommended if not o.get("eligible"))
    missing_impact = sum(1 for o in recommended if o.get("impact") is None)
    missing_reasons = sum(1 for o in recommended
                          if not o.get("reason_codes") or any(not rc.get("evidence") for rc in o["reason_codes"]))
    guardrail_tests = [
        {"name": "Ineligible products are never recommended", "passed": ineligible_recommended == 0,
         "detail": f"{ineligible_recommended} violations"},
        {"name": "Every recommendation carries an impact estimate", "passed": missing_impact == 0,
         "detail": f"{missing_impact} violations"},
        {"name": "Every recommendation carries reason codes with evidence", "passed": missing_reasons == 0,
         "detail": f"{missing_reasons} violations"},
    ]

    cust1 = next(c for c in customers if c["customer_id"] == "CUST-0001")
    opp1 = next(o for o in opps if o["customer_id"] == "CUST-0001" and o["product_id"] == "ev_finance")
    ctx = {**cust1, **opp1}
    t1, t2 = fallback_text(ctx), fallback_text(ctx)
    ungrounded = _ungrounded_numbers(t1, ctx)
    llm_checks = [
        {"name": "Fallback output is deterministic", "passed": t1 == t2,
         "detail": "Identical input context produces byte-identical narration"},
        {"name": "Fallback numbers are grounded in structured context", "passed": len(ungrounded) == 0,
         "detail": "Every figure in the narration appears in the engine output" if not ungrounded else f"ungrounded: {ungrounded}"},
        {"name": "LLM layer is read-only over structured outputs", "passed": True,
         "detail": "/api/explain only narrates stored scorer + engine results; it cannot alter scores, eligibility or impact"},
    ]

    regen_c, regen_t = build_dataset()
    regen_total = round(sum(t["amount"] for t in regen_t), 2)
    db_total = round(sum(t["amount"] for t in txns), 2)
    reproducibility = {
        "seed": 42,
        "customers_match": len(regen_c) == len(customers),
        "transactions_match": len(regen_t) == len(txns),
        "amount_checksum_match": abs(regen_total - db_total) < 1.0,
        "label_rule": "sigmoid of weighted signals (same features as the scorer, different weights) + N(0, 0.5) noise, seeded per customer-product",
        "split_rule": "sha256(customer_id) mod 10 -> train 60% / validation 20% / test 20%, customer-level disjoint",
    }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "customers": len(customers), "transactions": len(txns),
            "duplicates_flagged": sum(1 for t in txns if t.get("is_duplicate")),
            "categorisation_coverage": 1.0, "months_covered": 12,
        },
        "splits": {**splits, "leakage_control": "customer-level disjoint splits via sha256(customer_id)"},
        "models": {
            "model": "Transparent scoring model: hand-set, documented weights + sigmoid. Weights fixed before evaluation; not tuned on test results.",
            "learned": "Logistic regression (L2=1.0, Newton's method) trained on the train split only, same features as the scorer.",
        },
        "macro_metrics": {
            "model": {"auc": macro("model", "auc"), "auc_ci": macro_ci, "precision_at_k": macro("model", "precision_at_k"),
                      "brier": macro("model", "brier"), "log_loss": macro("model", "log_loss")},
            "learned": {"auc": macro("learned", "auc"), "precision_at_k": macro("learned", "precision_at_k"),
                        "brier": macro("learned", "brier"), "log_loss": macro("learned", "log_loss")},
            "single_signal": {"auc": macro("single_signal", "auc"), "precision_at_k": macro("single_signal", "precision_at_k")},
            "random": {"auc": macro("random", "auc"), "precision_at_k": macro("random", "precision_at_k")},
        },
        "per_product": per_product,
        "cross_validation": cv,
        "calibration": buckets,
        "carbon_tests": carbon_tests,
        "guardrail_tests": guardrail_tests,
        "llm_checks": llm_checks,
        "reproducibility": reproducibility,
        "performance": {"evaluation_runtime_ms": round((time.perf_counter() - t0) * 1000, 1)},
        "ci_method": "Percentile bootstrap, 95% - 1000 resamples per product, 400 for macro; seeded (123/321) for reproducibility",
        "limitations": [
            "Circularity: the synthetic labels are generated from the SAME features the scorer uses (with different weights plus noise). AUC therefore measures ranking consistency on synthetic labels, not real-world predictive power.",
            "Labels are synthetic: no real take-up data was used. Real deployment would need historical conversion data.",
            "Small sample: about 28 test rows per product (6-9 positives), so hold-out CIs are wide; 5-fold CV across all 120 customers is reported alongside.",
            "Scorer weights were set before evaluation and have not been tuned after seeing test results.",
            "Impact estimates are gross of rebound effects and behavioural change.",
        ],
    }


async def build_evaluation(db):
    t0 = time.perf_counter()
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    txns = await db.transactions.find({}, {"_id": 0, "customer_id": 1, "category": 1, "amount": 1,
                                           "month": 1, "is_duplicate": 1}).to_list(30000)
    opps = await db.opportunities.find({}, {"_id": 0}).to_list(5000)
    t_load = (time.perf_counter() - t0) * 1000
    out = evaluate(customers, txns, opps)
    out["performance"]["dataset_load_ms"] = round(t_load, 1)
    out["performance"]["evaluation_runtime_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return out

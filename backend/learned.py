"""A small learned model used as a benchmark against the transparent scorer.

L2-regularised logistic regression fitted by Newton's method in pure Python
(deterministic, no extra dependencies). Inputs are the same normalised features
the transparent scorer and the synthetic label rule use - this is stated openly
in the evaluation report.
"""
import math

INCOME_ORDER = ["under_5L", "5_10L", "10_18L", "18_30L", "30L_plus"]


def _norm(x, cap):
    return max(0.0, min(1.0, x / cap))


def _has(c, *products):
    return 1.0 if any(p in c["products_held"] for p in products) else 0.0


FEATURE_SPEC = {
    "ev_finance": [
        ("fuel_spend", lambda c, f: _norm(f["spend_fuel"], 5000)),
        ("annual_mileage", lambda c, f: _norm((c["vehicle"] or {}).get("annual_mileage", 0), 22000)),
        ("vehicle_age", lambda c, f: _norm((c["vehicle"] or {}).get("vehicle_age", 0), 12)),
        ("sustainability", lambda c, f: c["sustainability_preference"]),
    ],
    "solar": [
        ("electricity_kwh", lambda c, f: _norm(c["electricity_kwh_per_month"], 450)),
        ("sustainability", lambda c, f: c["sustainability_preference"]),
        ("digital_ratio", lambda c, f: c["digital_ratio"]),
    ],
    "green_home": [
        ("utility_spend", lambda c, f: _norm(f["spend_electricity"] + f["spend_utilities"], 6500)),
        ("has_home_loan", lambda c, f: _has(c, "Home Loan")),
        ("sustainability", lambda c, f: c["sustainability_preference"]),
    ],
    "paperless": [
        ("digital_ratio", lambda c, f: c["digital_ratio"]),
        ("paper_statements", lambda c, f: _norm(c["paper_statements_per_month"], 3)),
        ("branch_visits", lambda c, f: _norm(c["branch_visits_per_month"], 4)),
    ],
    "green_invest": [
        ("sustainability", lambda c, f: c["sustainability_preference"]),
        ("has_investments", lambda c, f: _has(c, "Mutual Funds", "Fixed Deposit")),
        ("income_band", lambda c, f: _norm(INCOME_ORDER.index(c["income_band"]), 4)),
    ],
    "green_loan": [
        ("home_improvement_spend", lambda c, f: _norm(f["spend_home_improvement"], 8000)),
        ("has_credit", lambda c, f: _has(c, "Personal Loan", "Credit Card")),
        ("digital_ratio", lambda c, f: c["digital_ratio"]),
    ],
}


def feature_vector(cust, f, pid):
    return [fn(cust, f) for _, fn in FEATURE_SPEC[pid]]


def _sigmoid(z):
    if z < -35:
        return 0.0
    if z > 35:
        return 1.0
    return 1 / (1 + math.exp(-z))


def _solve(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r, c=col: abs(M[r][c]))
        M[col], M[piv] = M[piv], M[col]
        for r in range(n):
            if r != col and M[col][col] != 0:
                k = M[r][col] / M[col][col]
                M[r] = [a - k * p for a, p in zip(M[r], M[col])]
    return [M[i][n] / M[i][i] if M[i][i] else 0.0 for i in range(n)]


def fit_logreg(X, y, l2=1.0, iters=25):
    """Returns weights [bias, w1..wk]. Bias is not penalised."""
    k = len(X[0]) if X else 0
    w = [0.0] * (k + 1)
    rows = [[1.0] + x for x in X]
    for _ in range(iters):
        grad = [0.0] * (k + 1)
        H = [[0.0] * (k + 1) for _ in range(k + 1)]
        for xi, yi in zip(rows, y):
            p = _sigmoid(sum(a * b for a, b in zip(w, xi)))
            s = p * (1 - p)
            for a in range(k + 1):
                grad[a] += (p - yi) * xi[a]
                for b in range(k + 1):
                    H[a][b] += s * xi[a] * xi[b]
        for a in range(1, k + 1):
            grad[a] += l2 * w[a]
            H[a][a] += l2
        H[0][0] += 1e-6
        step = _solve(H, grad)
        w = [wi - si for wi, si in zip(w, step)]
        if max(abs(s) for s in step) < 1e-8:
            break
    return w


def predict(w, x):
    return _sigmoid(w[0] + sum(a * b for a, b in zip(w[1:], x)))

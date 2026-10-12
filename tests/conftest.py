import pytest

from data_gen import build_dataset
from propensity import compute_opportunities

TS = "2026-01-01"


@pytest.fixture(scope="session")
def dataset():
    customers, txns = build_dataset()
    by_cust = {}
    for t in txns:
        by_cust.setdefault(t["customer_id"], []).append(t)
    opps = []
    for c in customers:
        opps.extend(compute_opportunities(c, by_cust[c["customer_id"]], TS))
    return customers, txns, opps


@pytest.fixture(autouse=True)
def no_llm_key(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)

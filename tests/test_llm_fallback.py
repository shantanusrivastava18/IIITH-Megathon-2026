import asyncio

from evaluation import _ungrounded_numbers
from llm import fallback_text, fallback_answer, stream_explanation, stream_chat_reply


def _ctx(dataset, cid="CUST-0001", pid="ev_finance"):
    customers, _, opps = dataset
    cust = next(c for c in customers if c["customer_id"] == cid)
    opp = next(o for o in opps if o["customer_id"] == cid and o["product_id"] == pid)
    return {**cust, **opp}


async def _collect(gen):
    return "".join([c async for c in gen])


def test_fallback_is_deterministic(dataset):
    ctx = _ctx(dataset)
    assert fallback_text(ctx) == fallback_text(ctx)


def test_fallback_numbers_are_grounded(dataset):
    _, _, opps = dataset
    for o in [o for o in opps if o["recommended"]][:40]:
        ctx = _ctx(dataset, o["customer_id"], o["product_id"])
        assert _ungrounded_numbers(fallback_text(ctx), ctx) == []


def test_explain_without_key_uses_fallback(dataset):
    ctx = _ctx(dataset)
    out = asyncio.run(_collect(stream_explanation(ctx, "t")))
    assert out == fallback_text(ctx)
    assert "estimate" in out and "eligibility is assessed separately" in out


def test_chat_without_key_is_deterministic():
    ctx = {"name": "Asha Rao", "opportunities": [], "monthly_emissions_latest": {"kg_co2e": 210.5},
           "monthly_emissions_avg": 205.0, "electricity_kwh_month": 300, "top_spend_categories": []}
    a = asyncio.run(_collect(stream_chat_reply(ctx, [], "What's my footprint?", "t")))
    b = asyncio.run(_collect(stream_chat_reply(ctx, [], "What's my footprint?", "t")))
    assert a == b == fallback_answer(ctx, "What's my footprint?")
    assert "210.5" in a

"""Customer memory: a persistent record of how each customer responded to past
insights (viewed / interested / not_interested / dismissed). Memory adapts the
ORDERING and PRESENTATION of recommendations only.

GUARDRAIL (hard rule from the brief): memory can never change propensity,
confidence, eligibility or impact values. Those are owned by the scoring model,
the deterministic rules, and the carbon engine respectively.
"""

VALID_EVENTS = {"viewed", "interested", "not_interested", "dismissed"}

WEIGHTS = {
    "interested": 1.0,
    "viewed": 0.15,
    "dismissed": -0.5,
    "not_interested": -1.0,
}

EVENT_LABELS = {
    "viewed": "viewed",
    "interested": "marked as interested",
    "not_interested": "said not for me",
    "dismissed": "dismissed",
}


def summarize_memory(events):
    """Per-product sentiment rollup for display and audit."""
    summary = {}
    for e in events:
        pid = e["product_id"]
        s = summary.setdefault(pid, {"product_id": pid, "score": 0.0, "events": 0,
                                     "last_event": None, "last_ts": None})
        s["score"] += WEIGHTS.get(e["event"], 0)
        s["events"] += 1
        if not s["last_ts"] or e["ts"] > s["last_ts"]:
            s["last_event"] = e["event"]
            s["last_ts"] = e["ts"]
    for s in summary.values():
        s["score"] = round(s["score"], 2)
    return summary


def apply_memory(opps, events):
    """Re-rank recommendations using memory. Values are never mutated:
    each item keeps its original propensity/confidence/impact and gains a
    `memory` annotation (state, note, rank_shift) for transparency."""
    sentiment = summarize_memory(events)

    def state_of(pid):
        score = sentiment.get(pid, {}).get("score", 0)
        if score >= 1.0:
            return "boosted"
        if score <= -0.5:
            return "suppressed"
        return "neutral"

    rankable = [o for o in opps if o.get("propensity") is not None]
    orig_rank = {o["product_id"]: i for i, o in enumerate(sorted(rankable, key=lambda o: -o["propensity"]))}

    state_order = {"boosted": 0, "neutral": 1, "suppressed": 2}

    def sort_key(o):
        p = o.get("propensity")
        if p is None:
            return (3, 0)
        return (state_order[state_of(o["product_id"])], -p)

    out = []
    for o in sorted(opps, key=sort_key):
        pid = o["product_id"]
        st = state_of(pid) if o.get("propensity") is not None else "neutral"
        s = sentiment.get(pid)
        memory = {
            "state": st,
            "score": s["score"] if s else 0,
            "events": s["events"] if s else 0,
            "note": {
                "boosted": "Moved up because of your earlier positive feedback",
                "suppressed": "Shown less prominently based on your earlier feedback",
                "neutral": None,
            }[st],
        }
        if o.get("propensity") is not None:
            new_rank = sorted([x for x in opps if x.get("propensity") is not None], key=sort_key).index(o)
            memory["rank_shift"] = orig_rank[pid] - new_rank
        out.append({**o, "memory": memory})
    return out

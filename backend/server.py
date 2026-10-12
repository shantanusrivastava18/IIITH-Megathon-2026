from fastapi import FastAPI, APIRouter, Request, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
import re
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta

from data_gen import build_dataset
from propensity import PRODUCTS, compute_opportunities
from carbon import EMISSION_FACTORS, ASSUMPTIONS, calculate_scenario
from llm import stream_explanation, stream_chat_reply
from memory import apply_memory, summarize_memory, VALID_EVENTS
from evaluation import build_evaluation
from ingest import process_csv, sample_csv, MAX_BYTES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Green Finance Assistant")
api_router = APIRouter(prefix="/api")

DATA_TIMESTAMP = datetime.now(timezone.utc).date().isoformat()


@app.on_event("startup")
async def seed():
    await seed_memory()
    if await db.customers.count_documents({}) > 0:
        return
    customers, transactions = build_dataset()
    await db.customers.insert_many(customers)
    await db.transactions.insert_many(transactions)
    tx_by_cust = {}
    for t in transactions:
        tx_by_cust.setdefault(t["customer_id"], []).append(t)
    opps = []
    for c in customers:
        opps.extend(compute_opportunities(c, tx_by_cust[c["customer_id"]], DATA_TIMESTAMP))
    await db.opportunities.insert_many(opps)
    await db.emission_factors.insert_many(EMISSION_FACTORS)
    await db.transactions.create_index("customer_id")
    await db.opportunities.create_index("customer_id")
    logging.getLogger(__name__).info("Seeded %d customers, %d transactions, %d opportunities",
                                     len(customers), len(transactions), len(opps))


async def seed_memory():
    """Starter memory so the timeline demonstrates adaptation immediately."""
    if await db.memory.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    starter = [
        ("CUST-0001", "ev_finance", "viewed", 3),
        ("CUST-0001", "ev_finance", "interested", 2),
        ("CUST-0003", "ev_finance", "dismissed", 4),
        ("CUST-0002", "paperless", "not_interested", 5),
    ]
    docs = [{"customer_id": c, "product_id": p, "event": e, "source": "seed",
             "ts": (now - timedelta(days=d)).isoformat()}
            for c, p, e, d in starter]
    await db.memory.insert_many(docs)


@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "Green Finance Assistant", "data_timestamp": DATA_TIMESTAMP}


@api_router.get("/overview")
async def overview():
    customers = await db.customers.count_documents({})
    txns = await db.transactions.count_documents({})
    dups = await db.transactions.count_documents({"is_duplicate": True})
    opps = await db.opportunities.find({"recommended": True}, {"_id": 0}).to_list(5000)
    total_value = sum(o.get("indicative_value_inr", 0) for o in opps)
    total_co2 = sum((o.get("impact") or {}).get("kg_co2e_per_year", 0) for o in opps)
    props = [o["propensity"] for o in opps]
    by_product = {}
    for o in opps:
        b = by_product.setdefault(o["product"], {"count": 0, "co2e": 0.0, "value": 0})
        b["count"] += 1
        b["co2e"] += (o.get("impact") or {}).get("kg_co2e_per_year", 0)
        b["value"] += o.get("indicative_value_inr", 0)
    buckets = [{"range": f"{i/10:.1f}-{i/10+0.1:.1f}", "count": 0} for i in range(10)]
    for p in props:
        buckets[min(int(p * 10), 9)]["count"] += 1
    cust_docs = await db.customers.find({}, {"_id": 0, "segment": 1}).to_list(1000)
    segments = {}
    for c in cust_docs:
        segments[c["segment"]] = segments.get(c["segment"], 0) + 1
    return {
        "customers_analyzed": customers,
        "transactions_processed": txns,
        "duplicates_flagged": dups,
        "opportunities_detected": len(opps),
        "opportunity_value_inr": total_value,
        "avg_propensity": round(sum(props) / len(props), 3) if props else 0,
        "co2e_tonnes_per_year": round(total_co2 / 1000, 1),
        "by_product": [{"product": k, **v, "co2e": round(v["co2e"], 1)} for k, v in by_product.items()],
        "propensity_distribution": buckets,
        "segments": [{"segment": k, "count": v} for k, v in segments.items()],
        "data_timestamp": DATA_TIMESTAMP,
    }


@api_router.get("/customers")
async def list_customers(search: str = Query("", max_length=60), segment: str = Query("", max_length=60),
                         page: int = Query(1, ge=1, le=1000), page_size: int = Query(12, ge=1, le=100)):
    q = {}
    if search:
        q["name"] = {"$regex": re.escape(search), "$options": "i"}
    if segment:
        q["segment"] = segment
    total = await db.customers.count_documents(q)
    cursor = db.customers.find(q, {"_id": 0, "monthly_emissions": 0, "levels": 0}) \
        .sort("is_featured", -1).skip((page - 1) * page_size).limit(page_size)
    items = await cursor.to_list(page_size)
    ids = [c["customer_id"] for c in items]
    top_opps = await db.opportunities.find(
        {"customer_id": {"$in": ids}, "recommended": True},
        {"_id": 0, "customer_id": 1, "product": 1, "propensity": 1}).to_list(2000)
    by_cust = {}
    for o in top_opps:
        by_cust.setdefault(o["customer_id"], []).append({"product": o["product"], "propensity": o["propensity"]})
    for c in items:
        c["top_opportunities"] = sorted(by_cust.get(c["customer_id"], []), key=lambda x: -x["propensity"])[:3]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@api_router.get("/customers/{customer_id}")
async def customer_360(customer_id: str):
    cust = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    if not cust:
        return {"error": "not found"}
    txns = await db.transactions.find({"customer_id": customer_id}, {"_id": 0}).to_list(500)
    cat_totals = {}
    for t in txns:
        if not t.get("is_duplicate"):
            cat_totals[t["category"]] = cat_totals.get(t["category"], 0) + t["amount"]
    cust["category_spend"] = [{"category": k, "total": round(v, 2)} for k, v in sorted(cat_totals.items(), key=lambda x: -x[1])]
    cust["transactions_processed"] = len(txns)
    cust["duplicates_flagged"] = sum(1 for t in txns if t.get("is_duplicate"))
    return cust


@api_router.get("/customers/{customer_id}/transactions")
async def customer_transactions(customer_id: str, category: str = "", limit: int = Query(60, ge=1, le=500)):
    q = {"customer_id": customer_id}
    if category:
        q["category"] = category
    txns = await db.transactions.find(q, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return {"items": txns, "total": await db.transactions.count_documents(q)}


@api_router.get("/customers/{customer_id}/opportunities")
async def customer_opportunities(customer_id: str):
    opps = await db.opportunities.find({"customer_id": customer_id}, {"_id": 0}).to_list(20)
    events = await db.memory.find({"customer_id": customer_id}, {"_id": 0}).to_list(500)
    adapted = apply_memory(opps, events)
    return {"items": adapted, "data_timestamp": DATA_TIMESTAMP, "memory_events": len(events),
            "guardrail": "Memory adapts ordering and presentation only - propensity, confidence, eligibility and impact are unchanged."}


class MemoryEventInput(BaseModel):
    customer_id: str
    product_id: str
    event: str
    source: str = "companion"


@api_router.post("/memory/event")
async def record_memory_event(payload: MemoryEventInput):
    if payload.event not in VALID_EVENTS:
        return {"error": f"event must be one of {sorted(VALID_EVENTS)}"}
    if not await db.customers.find_one({"customer_id": payload.customer_id}):
        return {"error": "customer not found"}
    doc = {**payload.model_dump(), "ts": datetime.now(timezone.utc).isoformat()}
    await db.memory.insert_one(doc)
    doc.pop("_id", None)
    return {"recorded": doc}


@api_router.get("/memory/{customer_id}")
async def get_memory(customer_id: str):
    events = await db.memory.find({"customer_id": customer_id}, {"_id": 0}).sort("ts", -1).to_list(100)
    return {"items": events, "summary": list(summarize_memory(events).values()),
            "guardrail": "Memory never changes propensity, eligibility or impact - only ordering and presentation."}


@api_router.get("/opportunities")
async def list_opportunities(product_id: str = "", min_propensity: float = Query(0.0, ge=0.0, le=1.0)):
    q = {"recommended": True}
    if product_id:
        q["product_id"] = product_id
    if min_propensity:
        q["propensity"] = {"$gte": min_propensity}
    opps = await db.opportunities.find(q, {"_id": 0}).sort("propensity", -1).limit(300).to_list(300)
    return {"items": opps, "total": len(opps), "products": PRODUCTS}


@api_router.get("/segments")
async def segments():
    custs = await db.customers.find({}, {"_id": 0, "customer_id": 1, "segment": 1}).to_list(1000)
    opps = await db.opportunities.find({"recommended": True},
                                       {"_id": 0, "customer_id": 1, "propensity": 1, "impact": 1, "indicative_value_inr": 1}).to_list(5000)
    seg = {}
    cust_seg = {c["customer_id"]: c["segment"] for c in custs}
    for c in custs:
        s = seg.setdefault(c["segment"], {"segment": c["segment"], "customers": 0, "opportunities": 0,
                                          "avg_propensity": 0.0, "co2e": 0.0, "value": 0, "_p": []})
        s["customers"] += 1
    for o in opps:
        s = seg.get(cust_seg.get(o["customer_id"]))
        if not s:
            continue
        s["opportunities"] += 1
        s["_p"].append(o["propensity"])
        s["co2e"] += (o.get("impact") or {}).get("kg_co2e_per_year", 0)
        s["value"] += o.get("indicative_value_inr", 0)
    out = []
    for s in seg.values():
        out.append({"segment": s["segment"], "customers": s["customers"], "opportunities": s["opportunities"],
                    "avg_propensity": round(sum(s["_p"]) / len(s["_p"]), 3) if s["_p"] else 0,
                    "co2e_tonnes": round(s["co2e"] / 1000, 2), "value_inr": s["value"]})
    return {"items": sorted(out, key=lambda x: -x["co2e_tonnes"])}


@api_router.get("/transactions/summary")
async def transactions_summary():
    txns = await db.transactions.find({}, {"_id": 0, "category": 1, "amount": 1, "is_duplicate": 1, "month": 1}).to_list(30000)
    by_cat, by_month = {}, {}
    dups = 0
    months = set()
    for t in txns:
        months.add(t["month"])
        if t.get("is_duplicate"):
            dups += 1
            continue
        by_cat[t["category"]] = by_cat.get(t["category"], 0) + t["amount"]
        by_month[t["month"]] = by_month.get(t["month"], 0) + t["amount"]
    return {
        "total": len(txns), "duplicates_flagged": dups, "months_covered": len(months),
        "categories": [{"category": k, "total": round(v, 2)} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])],
        "monthly_volume": [{"month": k, "total": round(v, 2)} for k, v in sorted(by_month.items())],
        "categorisation_coverage": 1.0,
    }


@api_router.get("/carbon/factors")
async def carbon_factors():
    return {"factors": EMISSION_FACTORS, "assumptions": ASSUMPTIONS}


class CalcInput(BaseModel):
    scenario: str
    inputs: dict = {}


@api_router.post("/carbon/calculate")
async def carbon_calculate(payload: CalcInput):
    return calculate_scenario(payload.scenario, payload.inputs)


class ExplainInput(BaseModel):
    customer_id: str
    product_id: str


@api_router.post("/explain")
async def explain(payload: ExplainInput):
    cust = await db.customers.find_one({"customer_id": payload.customer_id}, {"_id": 0})
    opp = await db.opportunities.find_one(
        {"customer_id": payload.customer_id, "product_id": payload.product_id}, {"_id": 0})
    if not cust or not opp:
        return {"error": "not found"}
    ctx = {**cust, **opp, "name": cust["name"], "data_timestamp": opp.get("data_timestamp", DATA_TIMESTAMP)}

    async def gen():
        async for chunk in stream_explanation(ctx, f"{payload.customer_id}-{payload.product_id}"):
            yield f"data: {json.dumps({'delta': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class ChatInput(BaseModel):
    customer_id: str = Field(max_length=40)
    message: str = Field(max_length=500)


@api_router.post("/companion/chat")
async def companion_chat(payload: ChatInput):
    cust = await db.customers.find_one({"customer_id": payload.customer_id}, {"_id": 0})
    if not cust or not payload.message.strip():
        return {"error": "customer not found or empty message"}
    opps = await db.opportunities.find(
        {"customer_id": payload.customer_id, "recommended": True}, {"_id": 0}).to_list(10)
    opps = sorted(opps, key=lambda o: -o["propensity"])
    txns = await db.transactions.find({"customer_id": payload.customer_id, "is_duplicate": False},
                                      {"_id": 0, "category": 1, "amount": 1}).to_list(500)
    cat_totals = {}
    for t in txns:
        cat_totals[t["category"]] = cat_totals.get(t["category"], 0) + t["amount"]
    events = await db.memory.find({"customer_id": payload.customer_id}, {"_id": 0}).sort("ts", -1).to_list(5)
    history = await db.chat_messages.find({"customer_id": payload.customer_id}, {"_id": 0}) \
        .sort("ts", -1).limit(6).to_list(6)
    history.reverse()
    emissions = cust.get("monthly_emissions", [])
    ctx = {
        "name": cust["name"], "age": cust["age"], "city": cust["city"], "segment": cust["segment"],
        "digital_pct": int(cust["digital_ratio"] * 100),
        "paper_statements": cust["paper_statements_per_month"],
        "branch_visits": cust["branch_visits_per_month"],
        "electricity_kwh_month": cust["electricity_kwh_per_month"],
        "gas_scm_month": cust["gas_scm_per_month"],
        "vehicle": cust.get("vehicle"),
        "products_held": cust["products_held"],
        "monthly_emissions_latest": emissions[-1] if emissions else None,
        "monthly_emissions_avg": round(sum(e["kg_co2e"] for e in emissions) / len(emissions), 1) if emissions else 0,
        "top_spend_categories": [{"category": k, "total": round(v, 0)} for k, v in
                                 sorted(cat_totals.items(), key=lambda x: -x[1])[:3]],
        "opportunities": [{"product": o["product"], "propensity": o["propensity"],
                           "confidence": o["confidence"], "reason_codes": o["reason_codes"],
                           "impact": o["impact"]} for o in opps],
        "recent_feedback": [{"product": e["product_id"], "event": e["event"]} for e in events],
        "guardrail": "Answers must use only these facts; estimates are never guarantees; eligibility is separate.",
    }
    user_doc = {"customer_id": payload.customer_id, "role": "user", "content": payload.message.strip(),
                "ts": datetime.now(timezone.utc).isoformat()}
    await db.chat_messages.insert_one(user_doc)

    async def gen():
        full = ""
        async for chunk in stream_chat_reply(ctx, history, payload.message.strip(),
                                             f"chat-{payload.customer_id}"):
            full += chunk
            yield f"data: {json.dumps({'delta': chunk})}\n\n"
        await db.chat_messages.insert_one({"customer_id": payload.customer_id, "role": "assistant",
                                           "content": full, "ts": datetime.now(timezone.utc).isoformat()})
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.delete("/companion/chat/{customer_id}")
async def clear_chat(customer_id: str):
    res = await db.chat_messages.delete_many({"customer_id": customer_id})
    return {"deleted": res.deleted_count}


@api_router.get("/companion/chat/{customer_id}")
async def chat_history(customer_id: str):
    msgs = await db.chat_messages.find({"customer_id": customer_id}, {"_id": 0}).sort("ts", 1).to_list(50)
    return {"items": msgs}


class VerifyCustomerInput(BaseModel):
    customer_id: str
    product_id: str


VERIFY_SCENARIOS = {
    "ev_finance": lambda c: ("ev", {"annual_km": (c.get("vehicle") or {}).get("annual_mileage", 0),
                                    "kmpl": ASSUMPTIONS["fuel_efficiency_kmpl"]}),
    "solar": lambda c: ("solar", {"monthly_kwh": c["electricity_kwh_per_month"],
                                  "roof_kw": ASSUMPTIONS["solar_roof_kw"]}),
    "green_home": lambda c: ("green_home", {"monthly_kwh": c["electricity_kwh_per_month"],
                                            "monthly_gas_scm": c["gas_scm_per_month"]}),
    "paperless": lambda c: ("paperless", {"statements_per_month": c["paper_statements_per_month"],
                                          "branch_visits_per_month": c["branch_visits_per_month"]}),
}


@api_router.get("/verify/pairs")
async def verify_pairs():
    """Featured customers with recommended, quantified opportunities that judges can recompute."""
    custs = await db.customers.find({"is_featured": True}, {"_id": 0, "customer_id": 1, "name": 1}).to_list(10)
    out = []
    for c in custs:
        opps = await db.opportunities.find(
            {"customer_id": c["customer_id"], "recommended": True, "product_id": {"$in": list(VERIFY_SCENARIOS)}},
            {"_id": 0, "product_id": 1, "product": 1, "impact": 1}).to_list(10)
        for o in opps:
            if o.get("impact") and o["impact"].get("kg_co2e_per_year", 0) > 0:
                out.append({"customer_id": c["customer_id"], "name": c["name"],
                            "product_id": o["product_id"], "product": o["product"],
                            "kg_co2e_per_year": o["impact"]["kg_co2e_per_year"]})
    return {"items": out}


@api_router.post("/verify/customer")
async def verify_customer(payload: VerifyCustomerInput):
    """End-to-end recompute: pull the customer's raw inputs, run them through the live
    carbon engine, and compare against the stored recommendation figure."""
    cust = await db.customers.find_one({"customer_id": payload.customer_id}, {"_id": 0})
    opp = await db.opportunities.find_one(
        {"customer_id": payload.customer_id, "product_id": payload.product_id}, {"_id": 0})
    if not cust or not opp or not opp.get("impact"):
        return {"error": "customer or quantified opportunity not found"}
    if payload.product_id not in VERIFY_SCENARIOS:
        return {"error": "product not verifiable via the public engine"}
    scenario, raw_inputs = VERIFY_SCENARIOS[payload.product_id](cust)
    recomputed = calculate_scenario(scenario, raw_inputs)
    stored = opp["impact"]["kg_co2e_per_year"]
    actual = recomputed["kg_co2e_per_year"]
    return {
        "customer_id": cust["customer_id"], "name": cust["name"],
        "product_id": payload.product_id, "product": opp["product"],
        "scenario": scenario, "raw_inputs": raw_inputs,
        "formula": opp["impact"]["formula"],
        "assumptions": opp["impact"]["assumptions"],
        "stored_kg_co2e": stored, "recomputed_kg_co2e": actual,
        "steps": recomputed.get("steps", []),
        "tolerance": 0.15,
        "match": abs(actual - stored) < 0.15,
        "note": "Raw inputs come from the customer record; the recompute uses only the public deterministic engine and documented assumptions.",
    }


@api_router.get("/upload/template")
async def upload_template():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(sample_csv(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=green_finance_sample.csv"})


@api_router.post("/upload/csv")
async def upload_csv(request: Request):
    """Ingest a judge-provided transactions CSV into the SANDBOX collections only."""
    too_big = {"error": f"File too large (max {MAX_BYTES // 1_000_000} MB)"}
    if int(request.headers.get("content-length") or 0) > MAX_BYTES:
        return too_big
    buf = bytearray()
    async for chunk in request.stream():
        buf += chunk
        if len(buf) > MAX_BYTES:
            return too_big
    text = buf.decode("utf-8", errors="replace")
    result, err = process_csv(text)
    if err:
        return {"error": err}
    await db.sandbox_customers.delete_many({})
    await db.sandbox_transactions.delete_many({})
    await db.sandbox_opportunities.delete_many({})
    await db.sandbox_customers.insert_many(result["customers"])
    await db.sandbox_transactions.insert_many(result["transactions"])
    await db.sandbox_opportunities.insert_many(result["opportunities"])
    return await _sandbox_summary(result["rejected"], result["data_timestamp"])


async def _sandbox_summary(rejected=0, data_timestamp=None):
    customers = await db.sandbox_customers.count_documents({})
    txns = await db.sandbox_transactions.count_documents({})
    opps = await db.sandbox_opportunities.find({"recommended": True}, {"_id": 0}).to_list(500)
    txn_docs = await db.sandbox_transactions.find({}, {"_id": 0, "category": 1, "amount": 1}).to_list(10000)
    by_cat = {}
    for t in txn_docs:
        by_cat[t["category"]] = by_cat.get(t["category"], 0) + t["amount"]
    return {
        "active": customers > 0,
        "customers": customers, "transactions": txns, "rows_rejected": rejected,
        "data_timestamp": data_timestamp,
        "categories": [{"category": k, "total": round(v, 2)} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])],
        "opportunities": sorted([o for o in opps], key=lambda o: -o["propensity"]),
        "opportunities_detected": len(opps),
        "co2e_kg_per_year": round(sum((o.get("impact") or {}).get("kg_co2e_per_year", 0) for o in opps), 1),
        "note": "Sandbox dataset: the curated demo data is untouched. Profiles are derived from transactions using documented heuristics.",
    }


@api_router.get("/upload/summary")
async def upload_summary():
    return await _sandbox_summary()


@api_router.post("/upload/reset")
async def upload_reset():
    await db.sandbox_customers.delete_many({})
    await db.sandbox_transactions.delete_many({})
    await db.sandbox_opportunities.delete_many({})
    return {"reset": True}


@api_router.get("/evaluation")
async def evaluation():
    return await build_evaluation(db)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=[o.strip() for o in os.environ['CORS_ORIGINS'].split(',') if o.strip()],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

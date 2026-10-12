"""CSV ingestion for judge-provided transaction data.
Keyword-rule categorisation + documented profile-derivation heuristics.
Everything lands in sandbox collections - the curated seed-42 dataset is never touched.
"""
import csv
import io
import random
from datetime import datetime, timezone

from propensity import compute_opportunities

CATEGORY_KEYWORDS = {
    "Fuel": ["PETROL", "FUEL", "DIESEL", "IOCL", "INDIAN OIL", "HP PETRO", "BPCL", "GAS STATION"],
    "Electricity": ["ELECTRIC", "POWER", "BESCOM", "TATA POWER", "ADANI", "DISCOM", "KSEB", "MSEB"],
    "Gas": ["LPG", "INDANE", "PNG", "MAHANAGAR GAS", "GAS AGENCY"],
    "Public Transport": ["IRCTC", "METRO", "BUS", "RAIL", "OLA", "UBER", "RAPIDO", "AUTO "],
    "Home Improvement": ["PAINT", "HARDWARE", "INTERIOR", "PLYWOOD", "CEMENT", "LUMBER", "RENOVATION"],
    "Automotive": ["SERVICE CENT", "TYRE", "OIL CHANGE", "GARAGE", "SPARE", "CAR WASH"],
    "Utilities": ["BROADBAND", "FIBER", "JIO", "AIRTEL", "VODAFONE", "VI ", "WATER", "RECHARGE", "POSTPAID", "DTH"],
}
DEFAULT_CATEGORY = "Other"

PRICE_KWH_INR = 7.5        # blended Indian residential tariff
PRICE_PETROL_L_INR = 105.0
PRICE_GAS_SCM_INR = 55.0
VEHICLE_AGE_DEFAULT = 6
MAX_ROWS = 5000
MAX_BYTES = 2_000_000

DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d")


def categorize(merchant):
    m = (merchant or "").upper()
    for cat, keys in CATEGORY_KEYWORDS.items():
        if any(k in m for k in keys):
            return cat
    return DEFAULT_CATEGORY


def _parse_date(raw):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw.strip(), fmt).date().isoformat()
        except (ValueError, AttributeError):
            continue
    return None


def parse_transactions(text):
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return [], 0, "empty file"
    headers = {h.strip().lower(): h for h in reader.fieldnames}
    missing = [c for c in ("customer_id", "date", "amount") if c not in headers]
    if missing:
        return [], 0, f"missing required columns: {', '.join(missing)} (need customer_id, date, amount)"
    txns, rejected = [], 0
    for i, row in enumerate(reader):
        if i >= MAX_ROWS:
            return [], rejected, f"row limit exceeded ({MAX_ROWS})"
        try:
            amount = float(str(row[headers["amount"]]).replace(",", "").strip())
            date = _parse_date(row[headers["date"]])
            cid = str(row[headers["customer_id"]]).strip()
            if not cid or date is None or amount <= 0:
                rejected += 1
                continue
            merchant = str(row.get(headers.get("merchant_description", ""), "") or "").strip() or "UNKNOWN MERCHANT"
            age = 35
            if "age" in headers:
                try:
                    age = int(float(str(row[headers["age"]]).strip()))
                except (ValueError, TypeError):
                    age = 35
            txns.append({
                "transaction_id": f"UP-{i:05d}",
                "customer_id": cid,
                "customer_name": str(row.get(headers.get("customer_name", ""), "") or "").strip(),
                "customer_age": age,
                "date": date, "month": date[:7],
                "merchant_description": merchant,
                "amount": round(amount, 2),
                "debit_credit": "debit",
                "category": categorize(merchant),
                "is_duplicate": False,
            })
        except (ValueError, TypeError):
            rejected += 1
    return txns, rejected, None


def derive_customers(txns):
    """Documented heuristics: everything below is derived ONLY from the uploaded rows."""
    by_cust = {}
    for t in txns:
        by_cust.setdefault(t["customer_id"], []).append(t)
    customers = []
    for idx, (cid, rows) in enumerate(sorted(by_cust.items()), start=1):
        months = sorted({r["month"] for r in rows})
        n_months = max(len(months), 1)
        cat_m = {}
        for r in rows:
            cat_m[r["category"]] = cat_m.get(r["category"], 0) + r["amount"]
        cat_m = {k: v / n_months for k, v in cat_m.items()}
        fuel_m = cat_m.get("Fuel", 0)
        elec_m = cat_m.get("Electricity", 0)
        elec_kwh = round(elec_m / PRICE_KWH_INR, 1)
        gas_scm = round(cat_m.get("Gas", 0) / PRICE_GAS_SCM_INR, 1)
        home_owner = elec_kwh > 150 or cat_m.get("Home Improvement", 0) > 500
        vehicle = None
        if fuel_m > 800:
            annual_km = int(fuel_m / PRICE_PETROL_L_INR * 15 * 12)
            vehicle = {"vehicle_type": "Car (inferred)", "fuel_type": "Petrol",
                       "vehicle_age": VEHICLE_AGE_DEFAULT, "annual_mileage": annual_km}
        digital_hits = sum(1 for r in rows if any(k in r["merchant_description"].upper()
                                                  for k in ("UPI", "ONLINE", "APP", "PAY", "NEFT", "IMPS")))
        digital_ratio = round(digital_hits / len(rows), 2) if rows else 0.5
        paper = 1 if any("STATEMENT" in r["merchant_description"].upper() for r in rows) else 0
        branch = round(sum(1 for r in rows if any(k in r["merchant_description"].upper() for k in ("BRANCH", "ATM CASH"))) / n_months)
        monthly_total = sum(r["amount"] for r in rows) / n_months
        # heuristic: households spend ~50% of income -> income ~= 2x monthly spend
        est_income = monthly_total * 2.0
        income_band = ("under_5L" if est_income < 40000 else "5_10L" if est_income < 85000
                       else "10_18L" if est_income < 150000 else "18_30L" if est_income < 250000 else "30L_plus")
        products_held = ["Savings Account"]
        merchants_upper = " ".join(r["merchant_description"].upper() for r in rows)
        if "HOME LOAN" in merchants_upper or "HOUSING LOAN" in merchants_upper:
            products_held.append("Home Loan")
        if "CREDIT CARD" in merchants_upper:
            products_held.append("Credit Card")
        series = []
        for m in months:
            mr = [r for r in rows if r["month"] == m]
            spend = {}
            for r in mr:
                spend[r["category"]] = spend.get(r["category"], 0) + r["amount"]
            kge = (spend.get("Electricity", 0) / PRICE_KWH_INR) * 0.82 \
                + (spend.get("Gas", 0) / PRICE_GAS_SCM_INR) * 2.04 \
                + (spend.get("Fuel", 0) / PRICE_PETROL_L_INR) * 2.31
            series.append({"month": m, "kg_co2e": round(kge, 1)})
        name = next((r["customer_name"] for r in rows if r["customer_name"]), f"Uploaded customer {idx}")
        age = rows[0].get("customer_age", 35)
        customers.append({
            "customer_id": cid, "name": name, "age": age, "city": "Uploaded cohort",
            "segment": "Uploaded cohort", "income_band": income_band, "home_owner": home_owner,
            "sustainability_preference": 0.5, "digital_ratio": digital_ratio,
            "paper_statements_per_month": paper, "branch_visits_per_month": branch,
            "electricity_kwh_per_month": elec_kwh, "gas_scm_per_month": gas_scm,
            "vehicle": vehicle, "products_held": products_held,
            "monthly_emissions": series, "txn_count": len(rows), "is_featured": False,
        })
    return customers


def process_csv(text):
    if len(text.encode()) > MAX_BYTES:
        return None, f"file too large (max {MAX_BYTES // 1000} KB)"
    txns, rejected, err = parse_transactions(text)
    if err:
        return None, err
    if not txns:
        return None, "no valid rows after parsing"
    customers = derive_customers(txns)
    ts = datetime.now(timezone.utc).date().isoformat()
    opps = []
    for c in customers:
        opps.extend(compute_opportunities(c, [t for t in txns if t["customer_id"] == c["customer_id"]], ts))
    return {"customers": customers, "transactions": txns, "opportunities": opps,
            "rejected": rejected, "data_timestamp": ts}, None


def sample_csv():
    """Deterministic 3-customer sample judges can download and re-upload."""
    rng = random.Random(7)
    lines = ["customer_id,customer_name,age,date,merchant_description,amount,debit_credit"]
    profiles = [
        ("DEMO-001", "Ravi Kumar", 34, [("INDIAN OIL PETROL PUMP", 5, (2200, 4200)), ("TATA POWER ELECTRICITY", 1, (1000, 1600)),
                                        ("JIO FIBER BROADBAND", 1, (699, 999)), ("DMART GROCERY UPI", 3, (600, 2200)),
                                        ("MARUTI SERVICE CENTRE", 1, (2000, 5000))]),
        ("DEMO-002", "Meena Krishnan", 44, [("BESCOM ELECTRICITY", 1, (4800, 5600)), ("ASIAN PAINTS DEALER", 1, (3000, 9000)),
                                            ("INDANE LPG GAS", 1, (900, 1200)), ("PAPER STATEMENT FEE", 1, (50, 120)),
                                            ("BRANCH CASH DEPOSIT", 2, (1000, 5000)), ("DMART GROCERY UPI", 2, (800, 2000)),
                                            ("MUNICIPAL WATER TAX", 1, (400, 900)), ("HOME LOAN EMI", 1, (18000, 19000))]),
        ("DEMO-003", "Farah Ali", 27, [("METRO CARD RECHARGE UPI", 4, (200, 800)), ("IRCTC RAIL ONLINE", 1, (400, 1500)),
                                       ("ADANI ELECTRICITY", 1, (800, 1400)), ("SWIGGY ONLINE PAY", 3, (300, 900)),
                                       ("AMAZON PAY UPI", 2, (700, 3000))]),
    ]
    for cid, name, age, spec in profiles:
        for m in range(1, 13):
            month = f"2025-{m:02d}"
            for merch, count, (lo, hi) in spec:
                for _ in range(count):
                    day = rng.randint(1, 28)
                    lines.append(f"{cid},{name},{age},{month}-{day:02d},{merch},{rng.uniform(lo, hi):.2f},debit")
    return "\n".join(lines) + "\n"

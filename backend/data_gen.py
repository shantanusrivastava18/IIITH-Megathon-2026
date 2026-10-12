"""Synthetic Indian retail-banking dataset generator for Green Finance Assistant.
Fictional customers only. Deterministic (seeded) so results are reproducible.
"""
import random
from datetime import datetime, timedelta, timezone

SEED = 42

CATEGORIES = [
    "Fuel", "Electricity", "Gas", "Public Transport",
    "Home Improvement", "Automotive", "Utilities", "Other",
]

MERCHANTS = {
    "Fuel": [("INDIAN OIL PETROL PUMP", 1200, 4600), ("HP PETRO BUNK", 1100, 4300), ("BPCL FUEL STATION", 1300, 4700)],
    "Electricity": [("TATA POWER DDL BILL", 700, 5400), ("ADANI ELECTRICITY MUMBAI", 800, 5200), ("BESCOM BENGALURU", 600, 4900)],
    "Gas": [("INDANE LPG BOOKING", 850, 1250), ("MAHANAGAR GAS PNG", 450, 1600)],
    "Public Transport": [("IRCTC TRAIN BOOKING", 300, 2400), ("METRO CARD TOPUP", 200, 900), ("BMTC BUS PASS", 500, 1200)],
    "Home Improvement": [("ASIAN PAINTS DEALER", 2500, 18000), ("HOMELANE INTERIORS", 5000, 42000), ("HARDWARE TRADERS", 1500, 9000)],
    "Automotive": [("MARUTI SERVICE CENTRE", 1800, 7600), ("CASTROL OIL CHANGE", 900, 3200), ("TYRE POINT ALIGNMENT", 1200, 5800)],
    "Utilities": [("JIO FIBER BROADBAND", 699, 1499), ("MUNICIPAL WATER TAX", 400, 1100), ("AIRTEL POSTPAID", 499, 1299)],
    "Other": [("DMART AVENUE SUPERMART", 800, 6500), ("AMAZON PAY INDIA", 500, 9000), ("SWIGGY", 250, 1400), ("BOOKMYSHOW", 300, 1500), ("CULT FIT MEMBERSHIP", 900, 2500)],
}

FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ishita", "Aditya", "Kavya", "Nikhil", "Tanvi",
         "Farhan", "Lakshmi", "Dev", "Anika", "Sahil", "Nandini", "Varun", "Pooja", "Karan", "Ritika"]
LAST = ["Nair", "Gupta", "Kulkarni", "Reddy", "Bose", "Chauhan", "Menon", "Joshi", "Das", "Kapoor",
        "Verma", "Bhatt", "Pillai", "Saxena", "Khan", "Mukherjee", "Agarwal", "Rane", "Pawar", "Kaur"]
CITIES = ["Bengaluru", "Mumbai", "Pune", "Chennai", "Hyderabad", "Delhi NCR", "Ahmedabad", "Kolkata", "Jaipur", "Kochi"]
INCOME_BANDS = ["under_5L", "5_10L", "10_18L", "18_30L", "30L_plus"]
SEGMENTS = ["Urban Salaried", "Suburban Homeowner", "SME Owner", "Young Digital Native", "Retiree", "Rural Emerging"]

FEATURED = [
    dict(name="Arjun Mehta", age=32, city="Bengaluru", segment="Urban Salaried", income_band="18_30L",
         home_owner=False, fuel=0.95, elec=0.5, gas=0.2, pt=0.35, digital=0.95, paper=False,
         sustainability_preference=0.8,
         vehicle=dict(vehicle_type="Hatchback", fuel_type="Petrol", vehicle_age=9, annual_mileage=18500)),
    dict(name="Priya Sharma", age=41, city="Pune", segment="Suburban Homeowner", income_band="18_30L",
         home_owner=True, fuel=0.45, elec=0.95, gas=0.6, pt=0.2, digital=0.75, paper=True,
         sustainability_preference=0.65,
         vehicle=dict(vehicle_type="Sedan", fuel_type="Petrol", vehicle_age=6, annual_mileage=11000)),
    dict(name="Rajesh Patel", age=48, city="Ahmedabad", segment="SME Owner", income_band="30L_plus",
         home_owner=True, fuel=0.7, elec=0.8, gas=0.5, pt=0.05, digital=0.3, paper=True,
         sustainability_preference=0.4,
         vehicle=dict(vehicle_type="SUV", fuel_type="Diesel", vehicle_age=8, annual_mileage=22000)),
    dict(name="Ananya Iyer", age=29, city="Chennai", segment="Young Digital Native", income_band="10_18L",
         home_owner=False, fuel=0.15, elec=0.4, gas=0.1, pt=0.85, digital=0.98, paper=False,
         sustainability_preference=0.9, vehicle=None),
    dict(name="Vikram Singh", age=55, city="Delhi NCR", segment="Urban Salaried", income_band="30L_plus",
         home_owner=True, fuel=0.9, elec=0.7, gas=0.4, pt=0.15, digital=0.55, paper=True,
         sustainability_preference=0.5,
         vehicle=dict(vehicle_type="SUV", fuel_type="Diesel", vehicle_age=11, annual_mileage=19500)),
    dict(name="Sunita Rao", age=63, city="Hyderabad", segment="Retiree", income_band="10_18L",
         home_owner=True, fuel=0.1, elec=0.85, gas=0.7, pt=0.3, digital=0.35, paper=True,
         sustainability_preference=0.75, vehicle=None),
]


def _rand_name(rng):
    return f"{rng.choice(FIRST)} {rng.choice(LAST)}"


def _mk_customer(rng, idx, spec=None):
    if spec:
        p = dict(spec)
    else:
        seg = rng.choice(SEGMENTS)
        home = seg in ("Suburban Homeowner", "Retiree", "SME Owner") or rng.random() < 0.35
        has_vehicle = rng.random() < (0.25 if seg == "Young Digital Native" else 0.7)
        p = dict(
            name=_rand_name(rng), age=rng.randint(23, 68), city=rng.choice(CITIES), segment=seg,
            income_band=rng.choice(INCOME_BANDS), home_owner=home,
            fuel=rng.uniform(0.05, 0.95) if has_vehicle else rng.uniform(0, 0.12),
            elec=rng.uniform(0.15, 0.95), gas=rng.uniform(0.05, 0.7), pt=rng.uniform(0.05, 0.9),
            digital=rng.uniform(0.2, 0.98), paper=rng.random() < 0.45,
            sustainability_preference=round(rng.uniform(0.1, 0.95), 2),
            vehicle=(dict(vehicle_type=rng.choice(["Hatchback", "Sedan", "SUV", "Two-Wheeler"]),
                          fuel_type=rng.choice(["Petrol", "Petrol", "Diesel", "CNG"]),
                          vehicle_age=rng.randint(1, 14),
                          annual_mileage=rng.randint(4000, 24000)) if has_vehicle else None),
        )
    elec_kwh = 90 + p["elec"] * 420
    gas_scm = 2 + p["gas"] * 9
    cust = {
        "customer_id": f"CUST-{idx:04d}",
        "name": p["name"], "age": p["age"], "city": p["city"], "segment": p["segment"],
        "income_band": p["income_band"], "home_owner": p["home_owner"],
        "sustainability_preference": p["sustainability_preference"],
        "digital_ratio": round(p["digital"], 2),
        "paper_statements_per_month": (rng.randint(1, 3) if p["paper"] else 0),
        "branch_visits_per_month": (rng.randint(1, 4) if p["paper"] else rng.choice([0, 0, 1])),
        "electricity_kwh_per_month": round(elec_kwh, 1),
        "gas_scm_per_month": round(gas_scm, 1),
        "vehicle": p["vehicle"],
        "products_held": rng.sample(["Savings Account", "Fixed Deposit", "Credit Card", "Home Loan", "Personal Loan", "Mutual Funds"], k=rng.randint(2, 4)),
        "levels": {k: p[k] for k in ("fuel", "elec", "gas", "pt", "digital")},
        "onboarded": (datetime.now(timezone.utc) - timedelta(days=rng.randint(400, 2200))).date().isoformat(),
        "is_featured": bool(spec),
    }
    return cust


def _mk_transactions(rng, cust):
    txns = []
    lv = cust["levels"]
    months = 12
    base = datetime.now(timezone.utc).replace(day=1) - timedelta(days=365)
    weights = {
        "Fuel": lv["fuel"] * 8, "Electricity": 1.0, "Gas": 0.8 + lv["gas"],
        "Public Transport": lv["pt"] * 5, "Home Improvement": 0.7 if cust["home_owner"] else 0.15,
        "Automotive": 1.6 if cust["vehicle"] else 0.05, "Utilities": 3.0, "Other": 12.0,
    }
    cats = list(weights)
    wts = [weights[c] for c in cats]
    n = rng.randint(85, 130)
    for i in range(n):
        cat = rng.choices(cats, weights=wts, k=1)[0]
        merch, lo, hi = rng.choice(MERCHANTS[cat])
        mult = 1 + lv.get("fuel", 0.3) if cat == "Fuel" else 1
        if cat == "Electricity":
            amount = cust["electricity_kwh_per_month"] * rng.uniform(6.2, 8.4)
        else:
            amount = rng.uniform(lo, hi) * mult
        day = base + timedelta(days=rng.randint(0, 364), hours=rng.randint(6, 22))
        txns.append({
            "transaction_id": f"TXN-{cust['customer_id']}-{i:04d}",
            "customer_id": cust["customer_id"],
            "date": day.date().isoformat(),
            "month": day.strftime("%Y-%m"),
            "merchant_description": merch,
            "amount": round(amount, 2),
            "debit_credit": "debit",
            "category": cat,
            "is_duplicate": False,
        })
    # inject a couple of flagged duplicates for the data-quality story
    for j in range(rng.randint(1, 3)):
        if txns:
            dup = dict(rng.choice(txns))
            dup["transaction_id"] = f"TXN-{cust['customer_id']}-D{j:02d}"
            dup["is_duplicate"] = True
            txns.append(dup)
    return txns


def _monthly_emissions(cust):
    rng = random.Random(cust["customer_id"])
    series = []
    now = datetime.now(timezone.utc).replace(day=1)
    for m in range(11, -1, -1):
        month = (now - timedelta(days=30 * m)).strftime("%Y-%m")
        elec = cust["electricity_kwh_per_month"] * 0.82
        gas = cust["gas_scm_per_month"] * 2.04
        fuel = 0.0
        if cust["vehicle"]:
            fuel = (cust["vehicle"]["annual_mileage"] / 12) / 15.0 * 2.31
        jitter = rng.uniform(0.9, 1.1)
        series.append({"month": month, "kg_co2e": round((elec + gas + fuel) * jitter, 1)})
    return series


def build_dataset():
    rng = random.Random(SEED)
    customers, transactions = [], []
    specs = FEATURED + [None] * 114
    for i, spec in enumerate(specs, start=1):
        cust = _mk_customer(rng, i, spec)
        cust["monthly_emissions"] = _monthly_emissions(cust)
        txns = _mk_transactions(rng, cust)
        cust["txn_count"] = len(txns)
        customers.append(cust)
        transactions.extend(txns)
    return customers, transactions

"""Transparent propensity engine.
Interpretable weighted-score model (documented weights, sigmoid squashing) so every
score can be decomposed into human-readable reason codes. No black boxes.
"""
import math
from carbon import IMPACT_FNS

PRODUCTS = [
    {"id": "ev_finance", "name": "EV Finance", "category": "Vehicle Lending", "indicative_value_inr": 900000,
     "tagline": "Switch from petrol to electric with a green auto loan"},
    {"id": "solar", "name": "Solar Rooftop Finance", "category": "Home Energy", "indicative_value_inr": 250000,
     "tagline": "Finance a 3 kW rooftop solar system"},
    {"id": "green_home", "name": "Green Home Loan", "category": "Home Lending", "indicative_value_inr": 3500000,
     "tagline": "Retrofit your home for energy efficiency"},
    {"id": "paperless", "name": "Paperless Banking", "category": "Digital", "indicative_value_inr": 0,
     "tagline": "Go fully digital - statements, service requests, journeys"},
    {"id": "green_invest", "name": "Green Investments", "category": "Wealth", "indicative_value_inr": 500000,
     "tagline": "ESG-screened funds and green deposits"},
    {"id": "green_loan", "name": "Green Personal Loan", "category": "Personal Lending", "indicative_value_inr": 400000,
     "tagline": "Fund efficient appliances and home upgrades"},
]
PRODUCT_MAP = {p["id"]: p for p in PRODUCTS}

INCOME_ORDER = ["under_5L", "5_10L", "10_18L", "18_30L", "30L_plus"]


def _sigmoid(x):
    return 1 / (1 + math.exp(-x))


def _clamp01(x):
    return max(0.0, min(1.0, x))


def features(cust, txns):
    """Customer-level features derived from the last 12 months of transactions."""
    by_cat = {}
    months = set()
    for t in txns:
        if t.get("is_duplicate"):
            continue
        by_cat[t["category"]] = by_cat.get(t["category"], 0) + t["amount"]
        months.add(t["month"])
    n_months = max(len(months), 1)
    f = {f"spend_{c.lower().replace(' ', '_')}": round(by_cat.get(c, 0) / n_months, 2) for c in
         ["Fuel", "Electricity", "Gas", "Public Transport", "Home Improvement", "Automotive", "Utilities", "Other"]}
    f["months_observed"] = n_months
    f["txn_count"] = len(txns)
    return f


def check_eligibility(cust, product_id):
    """Deterministic eligibility rules - completely separate from propensity."""
    income_idx = INCOME_ORDER.index(cust["income_band"])
    if product_id == "ev_finance":
        if cust["age"] < 21 or income_idx < 1:
            return False, "Minimum age 21 and income band 5L+ required"
        if cust["vehicle"] and cust["vehicle"]["fuel_type"] == "EV":
            return False, "Vehicle already electric"
    if product_id in ("solar", "green_home"):
        if not cust["home_owner"]:
            return False, "Home ownership required"
    if product_id == "green_invest" and income_idx < 2:
        return False, "Income band 10L+ required for advisory products"
    if product_id == "green_loan" and income_idx < 1:
        return False, "Income band 5L+ required"
    return True, "Eligible per product rules"


def score_product(cust, f, product_id):
    """Returns (propensity, reason_codes). Weights documented inline."""
    v = cust["vehicle"]
    if product_id == "ev_finance":
        if not v:
            return 0.03, []
        z = -3.4
        z += 1.9 * _clamp01(f["spend_fuel"] / 5000)
        z += 1.3 * _clamp01(v["annual_mileage"] / 22000)
        z += 1.0 * _clamp01(v["vehicle_age"] / 12)
        z += 0.4 * cust["sustainability_preference"]
        codes = []
        if f["spend_fuel"] > 2500:
            codes.append({"code": "HIGH_FUEL_SPEND", "evidence": f"Rs {f['spend_fuel']:,.0f}/month on fuel on average"})
        if v["annual_mileage"] > 12000:
            codes.append({"code": "HIGH_ANNUAL_MILEAGE", "evidence": f"{v['annual_mileage']:,} km/year"})
        if v["vehicle_age"] >= 7:
            codes.append({"code": "AGING_ICE_VEHICLE", "evidence": f"{v['vehicle_type']} ({v['fuel_type']}), {v['vehicle_age']} years old"})
        return round(_sigmoid(z), 3), codes

    if product_id == "solar":
        if not cust["home_owner"]:
            return 0.02, []
        z = -3.8 + 2.6 * _clamp01(cust["electricity_kwh_per_month"] / 450) \
            + 0.9 * cust["sustainability_preference"] + 0.4 * cust["digital_ratio"]
        codes = []
        if cust["electricity_kwh_per_month"] > 250:
            codes.append({"code": "HIGH_ELECTRICITY_USE", "evidence": f"{cust['electricity_kwh_per_month']:,.0f} kWh/month"})
        codes.append({"code": "HOME_OWNER", "evidence": f"Owns home in {cust['city']}"})
        if cust["sustainability_preference"] > 0.6:
            codes.append({"code": "GREEN_AFFINITY", "evidence": f"Sustainability preference score {cust['sustainability_preference']}"})
        return round(_sigmoid(z), 3), codes

    if product_id == "green_home":
        if not cust["home_owner"]:
            return 0.02, []
        utility = f["spend_electricity"] + f["spend_utilities"]
        z = -4.0 + 2.2 * _clamp01(utility / 6000) + 1.1 * (1 if "Home Loan" in cust["products_held"] else 0) \
            + 0.6 * cust["sustainability_preference"]
        codes = []
        if "Home Loan" in cust["products_held"]:
            codes.append({"code": "EXISTING_MORTGAGE", "evidence": "Active home loan relationship"})
        if utility > 3500:
            codes.append({"code": "HIGH_UTILITY_SPEND", "evidence": f"Rs {utility:,.0f}/month on electricity + utilities"})
        return round(_sigmoid(z), 3), codes

    if product_id == "paperless":
        if cust["paper_statements_per_month"] == 0:
            return 0.02, []
        z = -3.2 + 1.8 * cust["digital_ratio"] + 1.5 * _clamp01(cust["paper_statements_per_month"] / 3) \
            + 0.7 * _clamp01(cust["branch_visits_per_month"] / 4)
        codes = [{"code": "PAPER_STATEMENTS_ACTIVE", "evidence": f"{cust['paper_statements_per_month']} paper statement(s)/month"}]
        if cust["digital_ratio"] > 0.5:
            codes.append({"code": "HIGH_DIGITAL_ACTIVITY", "evidence": f"{int(cust['digital_ratio']*100)}% of activity already digital"})
        if cust["branch_visits_per_month"] > 1:
            codes.append({"code": "BRANCH_DEPENDENT", "evidence": f"{cust['branch_visits_per_month']} branch visits/month"})
        return round(_sigmoid(z), 3), codes

    if product_id == "green_invest":
        has_inv = "Mutual Funds" in cust["products_held"] or "Fixed Deposit" in cust["products_held"]
        z = -4.4 + 1.6 * cust["sustainability_preference"] + 1.2 * (1 if has_inv else 0) \
            + 0.9 * _clamp01(INCOME_ORDER.index(cust["income_band"]) / 4)
        codes = []
        if has_inv:
            codes.append({"code": "EXISTING_INVESTMENTS", "evidence": "Holds FD / mutual fund products"})
        if cust["sustainability_preference"] > 0.6:
            codes.append({"code": "GREEN_AFFINITY", "evidence": f"Sustainability preference score {cust['sustainability_preference']}"})
        return round(_sigmoid(z), 3), codes

    if product_id == "green_loan":
        has_borrow = "Personal Loan" in cust["products_held"] or "Credit Card" in cust["products_held"]
        home_imp = f["spend_home_improvement"]
        z = -4.6 + 2.4 * _clamp01(home_imp / 8000) + 1.0 * (1 if has_borrow else 0) + 0.5 * cust["digital_ratio"]
        codes = []
        if home_imp > 3000:
            codes.append({"code": "HOME_IMPROVEMENT_SPEND", "evidence": f"Rs {home_imp:,.0f}/month on home improvement"})
        if has_borrow:
            codes.append({"code": "EXISTING_CREDIT_RELATIONSHIP", "evidence": "Active credit product held"})
        return round(_sigmoid(z), 3), codes

    return 0.0, []


def compute_opportunities(cust, txns, data_timestamp):
    f = features(cust, txns)
    base_conf = 0.55 + 0.4 * _clamp01(f["txn_count"] / 110) * _clamp01(f["months_observed"] / 12)
    out = []
    for p in PRODUCTS:
        eligible, elig_reason = check_eligibility(cust, p["id"])
        prop, codes = score_product(cust, f, p["id"])
        if not eligible:
            # never recommend ineligible products; record for audit only
            out.append({"customer_id": cust["customer_id"], "product_id": p["id"], "product": p["name"],
                        "category": p["category"], "eligible": False, "eligibility_note": elig_reason,
                        "propensity": None, "confidence": None, "reason_codes": [],
                        "impact": None, "data_timestamp": data_timestamp, "recommended": False})
            continue
        impact_fn = IMPACT_FNS[p["id"]]
        impact = impact_fn(cust["vehicle"], cust["electricity_kwh_per_month"]) if p["id"] == "ev_finance" else impact_fn(cust)
        recommended = prop >= 0.35 and impact is not None
        out.append({
            "customer_id": cust["customer_id"], "product_id": p["id"], "product": p["name"],
            "category": p["category"], "eligible": True, "eligibility_note": elig_reason,
            "propensity": prop, "confidence": round(base_conf, 3),
            "reason_codes": codes, "impact": impact,
            "indicative_value_inr": p["indicative_value_inr"],
            "data_timestamp": data_timestamp, "recommended": recommended,
            "tagline": p["tagline"],
        })
    return out

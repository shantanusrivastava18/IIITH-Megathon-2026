"""Deterministic carbon-impact engine.
Rules-based only: documented emission factors, fixed formulas, explicit assumptions.
The scoring layer never touches these numbers; the LLM only narrates them.
"""

EMISSION_FACTORS = [
    {"activity": "Grid electricity (India)", "unit": "kWh", "kg_co2e_per_unit": 0.82,
     "source": "CEA CO2 Baseline Database for the Indian Power Sector, v20 (weighted average)"},
    {"activity": "Petrol combustion", "unit": "litre", "kg_co2e_per_unit": 2.31,
     "source": "IPCC 2006 Guidelines / MoEFCC default factor"},
    {"activity": "Piped natural gas", "unit": "SCM", "kg_co2e_per_unit": 2.04,
     "source": "IPCC 2006 stationary combustion defaults"},
    {"activity": "Paper statement (print + postage)", "unit": "statement", "kg_co2e_per_unit": 0.020,
     "source": "DEFRA 2023 conversion factors, paper & courier estimate"},
    {"activity": "Branch visit avoided", "unit": "visit", "kg_co2e_per_unit": 0.44,
     "source": "Internal estimate: 4 km avg round trip, petrol two-wheeler (0.11 kg CO2e/km)"},
    {"activity": "EV charging (grid)", "unit": "kWh", "kg_co2e_per_unit": 0.82,
     "source": "CEA grid factor applied to EV energy use of 0.14 kWh/km"},
]

ASSUMPTIONS = {
    "fuel_efficiency_kmpl": 15.0,
    "ev_kwh_per_km": 0.14,
    "solar_roof_kw": 3.0,
    "solar_kwh_per_kw_month": 120.0,
    "retrofit_saving_pct": 0.15,
    "green_loan_saving_pct": 0.10,
}


def _r(x):
    return round(x, 1)


def impact_ev(vehicle, elec_kwh_month):
    if not vehicle or vehicle["fuel_type"] not in ("Petrol", "Diesel", "CNG"):
        return None
    km = vehicle["annual_mileage"]
    petrol_l = km / ASSUMPTIONS["fuel_efficiency_kmpl"]
    baseline = petrol_l * 2.31
    ev_kwh = km * ASSUMPTIONS["ev_kwh_per_km"]
    ev_emissions = ev_kwh * 0.82
    return {
        "kg_co2e_per_year": _r(baseline - ev_emissions),
        "formula": "(annual_km / 15 kmpl x 2.31 kg/l) - (annual_km x 0.14 kWh/km x 0.82 kg/kWh)",
        "assumptions": ["15 km/l petrol efficiency", "0.14 kWh/km EV consumption", "0.82 kg CO2e/kWh CEA grid factor"],
        "inputs": {"annual_km": km, "baseline_kg": _r(baseline), "ev_kg": _r(ev_emissions)},
    }


def impact_solar(cust):
    if not cust["home_owner"]:
        return None
    gen = ASSUMPTIONS["solar_roof_kw"] * ASSUMPTIONS["solar_kwh_per_kw_month"]
    offset = min(cust["electricity_kwh_per_month"], gen)
    avoided = offset * 12 * 0.82
    return {
        "kg_co2e_per_year": _r(avoided),
        "formula": "min(monthly_kWh, 3 kW x 120 kWh/kW) x 12 x 0.82 kg CO2e/kWh",
        "assumptions": ["3 kW rooftop system", "120 kWh generated per kW per month", "0.82 kg CO2e/kWh grid factor"],
        "inputs": {"monthly_kwh": cust["electricity_kwh_per_month"], "monthly_offset_kwh": _r(offset)},
    }


def impact_green_home(cust):
    if not cust["home_owner"]:
        return None
    elec = cust["electricity_kwh_per_month"] * 12 * 0.82
    gas = cust["gas_scm_per_month"] * 12 * 2.04
    saving = (elec + gas) * ASSUMPTIONS["retrofit_saving_pct"]
    return {
        "kg_co2e_per_year": _r(saving),
        "formula": "(annual electricity + gas emissions) x 15% retrofit saving",
        "assumptions": ["15% energy reduction from insulation/efficient retrofit", "CEA grid + IPCC gas factors"],
        "inputs": {"annual_elec_kg": _r(elec), "annual_gas_kg": _r(gas)},
    }


def impact_paperless(cust):
    stmts = cust["paper_statements_per_month"] * 12 * 0.020
    visits = cust["branch_visits_per_month"] * 12 * 0.44
    total = stmts + visits
    if total <= 0:
        return None
    return {
        "kg_co2e_per_year": _r(total),
        "formula": "(paper statements x 0.020 kg) + (branch visits avoided x 0.44 kg), annualised",
        "assumptions": ["DEFRA paper factor 20 g/statement", "0.44 kg CO2e per avoided branch visit"],
        "inputs": {"statements_per_year": cust["paper_statements_per_month"] * 12,
                   "branch_visits_per_year": cust["branch_visits_per_month"] * 12},
    }


def impact_green_invest(cust):
    return {
        "kg_co2e_per_year": 0.0,
        "formula": "Not quantified - financed-emissions methodology (PCAF) pending for investment portfolios",
        "assumptions": ["Impact reported qualitatively until PCAF-aligned factors are adopted"],
        "inputs": {},
    }


def impact_green_loan(cust):
    elec = cust["electricity_kwh_per_month"] * 12 * 0.82
    gas = cust["gas_scm_per_month"] * 12 * 2.04
    saving = (elec + gas) * ASSUMPTIONS["green_loan_saving_pct"]
    return {
        "kg_co2e_per_year": _r(saving),
        "formula": "(annual electricity + gas emissions) x 10% appliance-upgrade saving",
        "assumptions": ["10% reduction from efficient appliances funded by the loan"],
        "inputs": {"annual_elec_kg": _r(elec), "annual_gas_kg": _r(gas)},
    }


IMPACT_FNS = {
    "ev_finance": impact_ev,
    "solar": impact_solar,
    "green_home": impact_green_home,
    "paperless": impact_paperless,
    "green_invest": impact_green_invest,
    "green_loan": impact_green_loan,
}


def calculate_scenario(scenario, inputs):
    """Playground: deterministic calculation on raw user inputs."""
    if scenario == "ev":
        km = float(inputs.get("annual_km", 12000))
        kmpl = float(inputs.get("kmpl", ASSUMPTIONS["fuel_efficiency_kmpl"]))
        base = km / kmpl * 2.31
        ev = km * 0.14 * 0.82
        return {"scenario": "ev", "kg_co2e_per_year": _r(base - ev),
                "steps": [f"Baseline: {km:,.0f} km / {kmpl} km/l = {_r(km/kmpl)} litres x 2.31 = {_r(base)} kg CO2e",
                          f"EV: {km:,.0f} km x 0.14 kWh/km x 0.82 = {_r(ev)} kg CO2e",
                          f"Avoided: {_r(base - ev)} kg CO2e / year"]}
    if scenario == "solar":
        kwh = float(inputs.get("monthly_kwh", 300))
        kw = float(inputs.get("roof_kw", ASSUMPTIONS["solar_roof_kw"]))
        offset = min(kwh, kw * 120)
        avoided = offset * 12 * 0.82
        return {"scenario": "solar", "kg_co2e_per_year": _r(avoided),
                "steps": [f"Rooftop generation: {kw} kW x 120 kWh = {_r(kw*120)} kWh/month",
                          f"Offset: min({kwh:,.0f}, {_r(kw*120)}) = {_r(offset)} kWh/month",
                          f"Avoided: {_r(offset)} x 12 x 0.82 = {_r(avoided)} kg CO2e / year"]}
    if scenario == "green_home":
        elec = float(inputs.get("monthly_kwh", 300)) * 12 * 0.82
        gas = float(inputs.get("monthly_gas_scm", 6)) * 12 * 2.04
        saved = (elec + gas) * 0.15
        return {"scenario": "green_home", "kg_co2e_per_year": _r(saved),
                "steps": [f"Electricity: {_r(elec)} kg, Gas: {_r(gas)} kg CO2e / year",
                          f"Retrofit saving 15%: {_r(saved)} kg CO2e / year"]}
    if scenario == "paperless":
        s = float(inputs.get("statements_per_month", 2)) * 12 * 0.020
        v = float(inputs.get("branch_visits_per_month", 1)) * 12 * 0.44
        return {"scenario": "paperless", "kg_co2e_per_year": _r(s + v),
                "steps": [f"Statements: {_r(s)} kg, Branch visits avoided: {_r(v)} kg",
                          f"Total: {_r(s+v)} kg CO2e / year"]}
    return {"error": "unknown scenario"}
